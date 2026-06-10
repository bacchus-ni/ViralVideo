import {
  clampPlanTiming,
  type GeneratePlanRequest,
  type AdvancedTemplateSpec,
  type SceneType,
  type StoryboardShot,
  type VideoPlan,
  videoPlanSchema,
} from "@/lib/schemas";
import {
  getSlotReadableLimit,
  getTemplateDuration,
  reflowTemplateSlots,
  summarizeAdvancedTemplate,
} from "@/lib/advanced-template";
import { getPalettePreset } from "@/lib/style-presets";
import { buildFallbackPlan, getTemplateById } from "@/lib/templates";

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const animations = ["fade", "slide-up", "pop", "zoom", "typewriter"] as const;
const platforms = ["douyin", "xiaohongshu", "shipinhao", "generic"] as const;
const palettes = ["gold", "blue", "white", "dark", "fresh", "macaron", "custom"] as const;
const fontFamilies = ["hei", "song", "yuan", "serif"] as const;
const backgroundStyles = ["particles", "gradient", "solid", "image"] as const;
const paces = ["slow", "medium", "fast"] as const;
const aspectRatios = ["9:16", "16:9", "1:1", "4:3", "3:4", "custom"] as const;
const resolutions = ["720p", "1080p", "2k", "custom"] as const;

const sceneAnimationMap: Record<SceneType, StoryboardShot["animation"]> = {
  "intro-wipe": "slide-up",
  "word-card": "pop",
  "split-word": "slide-up",
  "stomp-word": "pop",
  "letter-scatter": "zoom",
  "outline-rows": "slide-up",
  "logo-hold": "zoom",
  "blank-color": "fade",
  "stacked-title": "slide-up",
};

const systemPrompt = `你是一个短视频纯文本混剪策划助手。
你需要根据用户需求和模板类型，生成适合竖屏短视频的文案和分镜。

要求：
1. 只输出 JSON，不要输出 Markdown。
2. 视频以文字表现为主，不要依赖复杂实拍素材。
3. 每句文案要短但必须完整可读，适合屏幕大字展示。
4. 分镜说明要描述背景、文字入场、节奏和强调词。
5. durationSec 必须在 10 到 45 秒之间。
6. storyboard 中每个镜头必须包含 startSec、durationSec、text、visualDescription、animation。
7. animation 只能是 fade、slide-up、pop、zoom、typewriter。
8. script 和 storyboard 的 text 应该互相对应。
9. 必须先生成 narrativeDraft，再拆成 screenLines，最后再映射到 script 和 storyboard。
10. narrativeDraft 应该是一段有完整意义的短文案，所有句子连起来能读懂。
11. screenLines 是适合上屏的断句，每行必须承接上下文，不能变成词条列表。
12. 输出字段必须符合 VideoPlan：title、platform、durationSec、tone、templateId、script、storyboard、style。
13. script 必须是数组，不要输出字符串。script 数组元素格式：{"id":"line-1","text":"短句","emphasis":["关键词"]}。
14. storyboard 必须是数组，每个元素都必须有 id，例如 shot-1、shot-2。
15. 如果用户提供高级模板槽位，script 和 storyboard 数量要与槽位数量一致，但内容仍要来自 narrativeDraft 的连续语义。
16. 禁止输出单字、残词、孤立关键词或名词堆砌；除转场占位外，每条 text 应是 6 到 18 个中文字符的完整短句。
17. 如果用户需求是科普、讲解、介绍类主题，文案必须形成清晰的信息递进，而不是只列名词。`;

const extractJson = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("DeepSeek response did not contain JSON.");
  }

  return match[0];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
};

const pickEnum = <T extends readonly string[]>(
  allowed: T,
  value: unknown,
  fallback: T[number],
): T[number] => {
  if (typeof value === "string" && allowed.includes(value)) {
    return value;
  }

  return fallback;
};

const boundaryChars = new Set([
  "，", "。", "、", "；", "！", "？", "…", " ", ",", ".", ";", "!", "?",
]);

// 超长时优先在标点处截断，避免把短句从词语中间剁断（如"创新永不止步"→"创新永不"）
const truncateAtBoundary = (value: string, limit: number) => {
  const chars = Array.from(value);
  if (chars.length <= limit) return value;
  const head = chars.slice(0, limit);
  for (let i = head.length - 1; i >= Math.floor(limit / 2); i -= 1) {
    if (boundaryChars.has(head[i])) {
      return head.slice(0, i).join("").trim();
    }
  }
  return head.join("");
};

// 只剥列表序号（"1."、"2、"），不能把 \d 放进字符类——会把"1984年"剥成"年"
const cleanLine = (value: string) =>
  truncateAtBoundary(
    value
      .replace(/^\s*(?:[-*•·、]+|\d{1,3}\s*[.、．）)])\s*/, "")
      .replace(/^镜头\s*\d+\s*[:：-]?/, "")
      .trim(),
    36,
  );

const textLength = (value: string) =>
  value.replace(/[\s，。,.!！?？:：;；"'“”‘’\-_/\\|()[\]{}]/g, "").length;

const isTextFragment = (value: string) => textLength(value) <= 2;

const semanticMarkerPattern =
  /是|不是|原本|来自|开始|后来|用|靠|让|把|被|能|会|在|从|到|给|改变|证明|成为|代表|因为|所以|但是|而是|并|仍|已经|最早|真正|属于|服务|影响|意味着|解决|创造|带来|看见|相信|打动|改写|重塑/;

const keywordLikePattern =
  /(先驱|传奇|驱动|文化|精神|品牌|作品|公司|工作室|技术|故事|动画|引擎|核心|深远|不止|为王|成立|观看)$/;

const isKeywordLikeLine = (value: string) => {
  const line = value.replace(/\s+/g, "");
  const length = textLength(line);
  if (length <= 2) return true;
  if (line === "感谢观看") return true;
  if (length <= 6 && !semanticMarkerPattern.test(line)) return true;
  if (length <= 12 && keywordLikePattern.test(line) && !semanticMarkerPattern.test(line)) {
    return true;
  }
  if (/^\d*年?成立$/.test(line)) return true;
  return false;
};

const hasTooManyFragments = (texts: string[]) => {
  if (texts.length < 6) return false;
  const fragments = texts.filter(isTextFragment).length;
  const singleChars = texts.filter((text) => textLength(text) <= 1).length;
  return fragments / texts.length >= 0.42 || singleChars / texts.length >= 0.18;
};

const hasTooManyKeywordLines = (texts: string[]) => {
  if (texts.length < 4) return false;
  const keywordFlags = texts.map(isKeywordLikeLine);
  const keywordCount = keywordFlags.filter(Boolean).length;
  let consecutive = 0;
  for (const isKeyword of keywordFlags) {
    consecutive = isKeyword ? consecutive + 1 : 0;
    if (consecutive >= 3) return true;
  }
  return keywordCount / texts.length >= 0.35;
};

const isPoorScript = (texts: string[]) =>
  texts.length < 3 || hasTooManyFragments(texts) || hasTooManyKeywordLines(texts);

const inferSubject = (prompt: string) => {
  const cleaned = prompt
    .replace(
      /请|帮我|帮忙|我想|做一个|生成|制作|输出|写一个|写一段|视频|短视频|文案|分镜|主题是|关于|科普|介绍|讲解|说明|一下/g,
      " ",
    )
    .replace(/[，。,.!！?？:：;；"'“”‘’\-_/\\|()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 12) || "这个主题";
};

const buildReadableFallbackTexts = (prompt: string, count: number) => {
  const subject = inferSubject(prompt);
  const isPixar = /皮克斯|pixar/i.test(prompt);
  const lines = (
    isPixar
      ? [
          "皮克斯最早不是动画公司",
          "它原本属于卢卡斯影业",
          "团队专攻电脑图形技术",
          "乔布斯后来买下它",
          "才有了皮克斯工作室",
          "玩具总动员改变行业",
          "它证明电脑能拍长片",
          "但皮克斯不只靠技术",
          "故事才是它的核心",
          "每个角色都有真实情绪",
          "RenderMan让画面更可信",
          "短片常用来试验创意",
          "所以皮克斯的影响",
          "不只是做出好动画",
          "而是改变了动画电影",
          "让技术服务于故事",
          "也让观众相信想象",
          "这就是皮克斯的价值",
        ]
      : [
          `${subject}先看起点`,
          "它不是凭空出现",
          "背后有一个关键变化",
          "这个变化改变了行业",
          "真正重要的不是名气",
          "而是它解决了问题",
          "它让复杂事情变简单",
          "也让更多人看见价值",
          "所以理解这个主题",
          "要先看它怎么开始",
          "再看它改变了什么",
          "最后看它留下什么",
          `${subject}的意义`,
          "不只是一组标签",
          "而是一条清晰脉络",
          "从起点走向影响",
          "再回到今天的价值",
          "这才是它值得了解的原因",
        ]
  ).map(cleanLine);

  return Array.from({ length: count }, (_, index) => lines[index % lines.length]);
};

const extractTextArray = (value: unknown) => {
  if (typeof value === "string") return splitLines(value);
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return cleanLine(item);
      if (isRecord(item)) {
        return cleanLine(
          pickString(item.text, item.content, item.line, item.copy, item.title) ?? "",
        );
      }
      return "";
    })
    .filter(Boolean);
};

const pickNarrativeLines = (raw: Record<string, unknown>) => {
  const candidates = [
    raw.screenLines,
    raw.narrative,
    raw.narrativeDraft,
    raw.copyLines,
    raw.lines,
    raw.script,
  ];

  for (const candidate of candidates) {
    const lines = extractTextArray(candidate);
    if (lines.length >= 3) return lines;
  }

  return [];
};

const repairScript = (
  script: VideoPlan["script"],
  userPrompt: string,
  desiredCount?: number,
) => {
  const count = Math.max(3, Math.min(24, desiredCount ?? script.length));
  const repairedTexts = buildReadableFallbackTexts(userPrompt, count);
  const source = isPoorScript(script.map((line) => line.text))
    ? repairedTexts
    : script.map((line) => line.text);

  return Array.from({ length: count }, (_, index) => ({
    id: script[index]?.id ?? `line-${index + 1}`,
    text: cleanLine(source[index] ?? repairedTexts[index] ?? source[source.length - 1]),
    emphasis: script[index]?.emphasis ?? [],
  }));
};

const buildStoryboardFromScript = (
  script: VideoPlan["script"],
  fallback: VideoPlan,
): VideoPlan["storyboard"] => {
  const defaultDuration = Math.max(1.2, Math.min(4, fallback.durationSec / script.length));
  let cursor = 0;

  return script.map((line, index) => {
    const fallbackShot = fallback.storyboard[index] ?? fallback.storyboard[0];
    const durationSec = fallbackShot?.durationSec ?? defaultDuration;
    const shot = {
      id: fallbackShot?.id ?? `shot-${index + 1}`,
      startSec: Number(cursor.toFixed(2)),
      durationSec,
      text: line.text,
      visualDescription:
        fallbackShot?.visualDescription ??
        "文字承接上一句出现，保持信息递进和清晰节奏",
      animation: fallbackShot?.animation ?? animations[index % animations.length],
    };
    cursor += durationSec;
    return shot;
  });
};

const splitLines = (value: string) => {
  const lines = value
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);

  if (lines.length >= 3) {
    return lines;
  }

  return value
    .split(/[。；;.!！?？]+/)
    .map(cleanLine)
    .filter(Boolean);
};

const normalizeEmphasis = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  if (typeof value === "string") {
    return value
      .split(/[、,，\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return [];
};

const normalizeScript = (rawScript: unknown, userPrompt: string) => {
  const lines = Array.isArray(rawScript)
    ? rawScript
        .map((item, index) => {
          if (typeof item === "string") {
            return {
              id: `line-${index + 1}`,
              text: cleanLine(item),
              emphasis: [] as string[],
            };
          }

          if (isRecord(item)) {
            return {
              id: pickString(item.id) ?? `line-${index + 1}`,
              text: cleanLine(
                pickString(item.text, item.content, item.line, item.copy) ?? "",
              ),
              emphasis: normalizeEmphasis(item.emphasis),
            };
          }

          return undefined;
        })
        .filter((item): item is { id: string; text: string; emphasis: string[] } =>
          Boolean(item?.text),
        )
    : typeof rawScript === "string"
      ? splitLines(rawScript).map((text, index) => ({
          id: `line-${index + 1}`,
          text,
          emphasis: [] as string[],
        }))
      : [];

  // 行数不足时用主题相关的可读兜底补齐，不要混入与主题无关的默认励志文案
  const padTexts = buildReadableFallbackTexts(userPrompt, 3);
  const merged = [...lines];
  for (const text of padTexts) {
    if (merged.length >= 3) break;
    merged.push({ id: `line-${merged.length + 1}`, text, emphasis: [] });
  }

  return merged.slice(0, 24).map((line, index) => ({
    id: line.id || `line-${index + 1}`,
    text: line.text || padTexts[index % padTexts.length],
    emphasis: line.emphasis ?? [],
  }));
};

const normalizeStoryboard = (
  rawStoryboard: unknown,
  script: ReturnType<typeof normalizeScript>,
  fallback: VideoPlan,
) => {
  const source = Array.isArray(rawStoryboard)
    ? rawStoryboard
    : typeof rawStoryboard === "string"
      ? splitLines(rawStoryboard)
      : [];
  const count = Math.max(3, Math.min(24, source.length || script.length));
  const defaultDuration = Math.max(
    1.2,
    Math.min(4, fallback.durationSec / count),
  );
  let cursor = 0;

  const normalized = source
    .map((item, index) => {
      const fallbackShot = fallback.storyboard[index] ?? fallback.storyboard[0];
      const scriptLine = script[index] ?? script[script.length - 1];
      const raw = isRecord(item) ? item : {};
      const text =
        typeof item === "string"
          ? cleanLine(item)
          : pickString(raw.text, raw.caption, raw.copy, raw.title) ??
            scriptLine?.text ??
            fallbackShot.text;
      const durationSec = pickNumber(
        raw.durationSec,
        raw.duration,
        raw.seconds,
        fallbackShot.durationSec,
        defaultDuration,
      );
      const shot = {
        id: pickString(raw.id) ?? `shot-${index + 1}`,
        startSec: pickNumber(raw.startSec, raw.start, cursor) ?? cursor,
        durationSec: Math.max(0.3, Math.min(10, durationSec ?? defaultDuration)),
        text: cleanLine(text),
        visualDescription:
          pickString(
            raw.visualDescription,
            raw.description,
            raw.scene,
            raw.visual,
            raw.shot,
          ) ?? fallbackShot.visualDescription,
        animation: pickEnum(
          animations,
          raw.animation,
          fallbackShot.animation,
        ),
      };

      cursor += shot.durationSec;
      return shot;
    })
    .filter((shot) => Boolean(shot.text));

  for (const fallbackShot of fallback.storyboard) {
    if (normalized.length >= 3) break;
    normalized.push({
      ...fallbackShot,
      id: `shot-${normalized.length + 1}`,
    });
  }

  return normalized.slice(0, 24).map((shot, index) => ({
    ...shot,
    id: shot.id || `shot-${index + 1}`,
    text:
      cleanLine(shot.text) || script[Math.min(index, script.length - 1)].text,
  }));
};

const alignPlanToAdvancedTemplate = (
  plan: VideoPlan,
  advancedTemplate: AdvancedTemplateSpec,
  userPrompt: string,
): VideoPlan => {
  const slots = reflowTemplateSlots(advancedTemplate.slots);
  const durationSec = getTemplateDuration(slots, advancedTemplate.durationSec);
  const generatedTexts = plan.script.map((line) => line.text);
  const shouldRepairFragments = isPoorScript(generatedTexts);
  const readableFallbackTexts = buildReadableFallbackTexts(userPrompt, slots.length);
  const script = slots.map((slot, index) => {
    const existingLine = plan.script[index];
    const existingShot = plan.storyboard[index];
    const candidate = cleanLine(
      existingLine?.text || existingShot?.text || slot.defaultText,
    );
    const repairedText =
      shouldRepairFragments && isTextFragment(candidate)
        ? readableFallbackTexts[index]
        : candidate;
    const text = truncateAtBoundary(
      cleanLine(repairedText),
      getSlotReadableLimit(slot),
    );

    return {
      id: existingLine?.id || `line-${index + 1}`,
      text: text || readableFallbackTexts[index] || slot.defaultText.slice(0, 36),
      emphasis:
        existingLine?.emphasis?.length
          ? existingLine.emphasis
          : slot.textRole === "keyword" || slot.textRole === "hook"
            ? [text || slot.defaultText.slice(0, 12)]
            : [],
    };
  });
  const storyboard = slots.map((slot, index) => {
    const existingShot = plan.storyboard[index];
    const text = script[index]?.text || slot.defaultText.slice(0, 36);

    return {
      id: existingShot?.id || `shot-${index + 1}`,
      startSec: slot.startSec,
      durationSec: slot.durationSec,
      text,
      visualDescription:
        existingShot?.visualDescription ||
        slot.visualDescription ||
        `${slot.sceneType} / ${slot.motion.entrance} / ${slot.textRole}`,
      animation: existingShot?.animation || sceneAnimationMap[slot.sceneType],
    };
  });

  return {
    ...plan,
    durationSec: Number(Math.max(10, Math.min(45, durationSec)).toFixed(2)),
    script,
    storyboard,
    advancedTemplate: {
      ...advancedTemplate,
      slots,
      durationSec,
      beatMarkers: advancedTemplate.beatMarkers.length
        ? advancedTemplate.beatMarkers
        : slots.map((slot) => slot.startSec),
      flashCuts: advancedTemplate.flashCuts.length
        ? advancedTemplate.flashCuts
        : slots.slice(1).map((slot) => slot.startSec),
    },
  };
};

const normalizeDeepSeekPlan = (
  parsed: unknown,
  fallback: VideoPlan,
  templateId: string,
  requestStyle: GeneratePlanRequest["style"],
  userPrompt: string,
  advancedTemplate?: AdvancedTemplateSpec,
) => {
  const raw = isRecord(parsed) ? parsed : {};
  const rawStyle = isRecord(raw.style) ? raw.style : {};
  const narrativeLines = pickNarrativeLines(raw);
  const desiredCount = advancedTemplate?.slots.length
    ? Math.min(24, advancedTemplate.slots.length)
    : narrativeLines.length || undefined;
  const script = repairScript(
    normalizeScript(narrativeLines.length ? narrativeLines : raw.script, userPrompt),
    userPrompt,
    desiredCount,
  );
  const rawStoryboard = normalizeStoryboard(raw.storyboard, script, fallback);
  const storyboard = isPoorScript(rawStoryboard.map((shot) => shot.text))
    ? buildStoryboardFromScript(script, fallback)
    : rawStoryboard.map((shot, index) => ({
        ...shot,
        text: script[index]?.text ?? shot.text,
      }));
  const palette = pickEnum(
    palettes,
    requestStyle?.palette ?? rawStyle.palette,
    fallback.style.palette,
  );
  const rawColors = isRecord(rawStyle.colors) ? rawStyle.colors : {};
  const presetColors = palette === "custom" ? fallback.style.colors : getPalettePreset(palette).colors;

  const plan: VideoPlan = {
    ...fallback,
    title: pickString(raw.title, raw.topic) ?? fallback.title,
    platform: pickEnum(platforms, raw.platform, fallback.platform),
    durationSec:
      pickNumber(raw.durationSec, raw.duration, raw.seconds) ??
      storyboard.reduce((sum, shot) => sum + shot.durationSec, 0) ??
      fallback.durationSec,
    tone: pickString(raw.tone, raw.mood) ?? fallback.tone,
    templateId,
    script,
    storyboard,
    style: {
      ...fallback.style,
      ...(requestStyle ?? {}),
      palette,
      colors: {
        ...fallback.style.colors,
        ...presetColors,
        ...(isRecord(requestStyle?.colors) ? requestStyle.colors : {}),
        background: pickString(requestStyle?.colors?.background, rawColors.background) ?? fallback.style.colors.background,
        surface: pickString(requestStyle?.colors?.surface, rawColors.surface) ?? fallback.style.colors.surface,
        primary: pickString(requestStyle?.colors?.primary, rawColors.primary) ?? fallback.style.colors.primary,
        accent: pickString(requestStyle?.colors?.accent, rawColors.accent) ?? fallback.style.colors.accent,
        muted: pickString(requestStyle?.colors?.muted, rawColors.muted) ?? fallback.style.colors.muted,
      },
      fontFamily: pickEnum(
        fontFamilies,
        requestStyle?.fontFamily ?? rawStyle.fontFamily,
        fallback.style.fontFamily,
      ),
      fontSize: Math.max(
        72,
        Math.min(
          260,
          pickNumber(requestStyle?.fontSize, rawStyle.fontSize) ??
            fallback.style.fontSize,
        ),
      ),
      fontWeight: Math.max(
        300,
        Math.min(
          1000,
          pickNumber(requestStyle?.fontWeight, rawStyle.fontWeight) ??
            fallback.style.fontWeight,
        ),
      ),
      backgroundStyle: pickEnum(
        backgroundStyles,
        requestStyle?.backgroundStyle ?? rawStyle.backgroundStyle,
        fallback.style.backgroundStyle,
      ),
      backgroundImageUrl:
        pickString(requestStyle?.backgroundImageUrl, rawStyle.backgroundImageUrl) ??
        fallback.style.backgroundImageUrl,
      pace: pickEnum(paces, requestStyle?.pace ?? rawStyle.pace, fallback.style.pace),
      musicUrl:
        pickString(requestStyle?.musicUrl, rawStyle.musicUrl) ??
        fallback.style.musicUrl,
      musicVolume: Math.max(
        0,
        Math.min(
          1,
          pickNumber(requestStyle?.musicVolume, rawStyle.musicVolume) ??
            fallback.style.musicVolume,
        ),
      ),
      aspectRatio: pickEnum(
        aspectRatios,
        requestStyle?.aspectRatio ?? rawStyle.aspectRatio,
        fallback.style.aspectRatio,
      ),
      customAspectWidth:
        pickNumber(requestStyle?.customAspectWidth, rawStyle.customAspectWidth) ??
        fallback.style.customAspectWidth,
      customAspectHeight:
        pickNumber(requestStyle?.customAspectHeight, rawStyle.customAspectHeight) ??
        fallback.style.customAspectHeight,
      resolution: pickEnum(
        resolutions,
        requestStyle?.resolution ?? rawStyle.resolution,
        fallback.style.resolution,
      ),
      customWidth:
        pickNumber(requestStyle?.customWidth, rawStyle.customWidth) ??
        fallback.style.customWidth,
      customHeight:
        pickNumber(requestStyle?.customHeight, rawStyle.customHeight) ??
        fallback.style.customHeight,
    },
  };

  return advancedTemplate
    ? alignPlanToAdvancedTemplate(plan, advancedTemplate, userPrompt)
    : plan;
};

export const generatePlanWithDeepSeek = async (
  request: GeneratePlanRequest,
): Promise<VideoPlan> => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured.");
  }

  const template = getTemplateById(request.templateId);
  const advancedTemplate = request.advancedTemplate ?? template.advancedTemplate;
  const templateName = request.templateName ?? template.name;
  const templateDescription = request.templateDescription ?? template.description;
  const templatePromptHint = request.templatePromptHint ?? template.promptHint;
  const fallback = {
    ...buildFallbackPlan(request.templateId, request.userPrompt, request.style),
    advancedTemplate,
  };
  const advancedPrompt = advancedTemplate
    ? `高级模板槽位如下。模板槽位只用于决定动画节奏，不用于决定内容结构。你必须先写 narrativeDraft，再拆 screenLines，然后把 screenLines 映射到 ${advancedTemplate.slots.length} 个槽位。不要为了凑槽位输出词条；槽位多时可以把一句完整表达拆成上下文连续的两行，或重复核心结论做强调。分镜 durationSec 和 startSec 参考槽位即可。
${summarizeAdvancedTemplate(advancedTemplate)}`
    : "当前是基础模板，按普通纯文本分镜生成。";

  const userPrompt = `模板：${templateName}
模板 ID：${request.templateId}
模板说明：${templateDescription}
模板风格：${templatePromptHint}
默认样式：${JSON.stringify(template.defaultStyle)}
用户可选样式：${JSON.stringify(request.style ?? {})}
${advancedPrompt}
用户需求：${request.userPrompt}

内容质量要求：
- text 必须是能直接给观众看的完整短句，不要输出「皮」「感」「创」这类单字。
- 不要把科普主题拆成孤立关键词列表，例如只输出「创新」「故事」「技术」是不合格的。
- 科普/介绍类视频要按“是什么 -> 为什么重要 -> 代表作品/技术 -> 影响/结论”的顺序递进。
- 每一行之间必须有关联，所有 screenLines 连起来应该像一段完整解说词。
- 如果高级模板槽位很多，可以用更短的完整短句，但仍要保证前后句承接。
- 先生成 narrativeDraft，再拆 screenLines，最后再映射 script/storyboard。

请生成 VideoPlan JSON。style 必须使用这些枚举：
palette: gold | blue | white | dark | fresh | macaron | custom
fontFamily: hei | song | yuan | serif
backgroundStyle: particles | gradient | solid | image
pace: slow | medium | fast
aspectRatio: 9:16 | 16:9 | 1:1 | 4:3 | 3:4 | custom
resolution: 720p | 1080p | 2k | custom

严格按这个形状输出：
{
  "title": "视频标题",
  "platform": "douyin",
  "durationSec": 15,
  "tone": "激励向",
  "templateId": "${request.templateId}",
  "contentPlan": {
    "topic": "主题",
    "angle": "内容角度",
    "structure": ["起点", "变化", "方法", "影响", "结论"]
  },
  "narrativeDraft": [
    "先写一段完整可读的解说短句",
    "每句都要承接上一句"
  ],
  "screenLines": [
    "再拆成适合上屏的短句",
    "但不能拆成关键词列表"
  ],
  "script": [
    {"id": "line-1", "text": "使用 screenLines 中的完整短句", "emphasis": ["关键词"]}
  ],
  "storyboard": [
    {"id": "shot-1", "startSec": 0, "durationSec": 2, "text": "与 script 对应的完整短句", "visualDescription": "背景和文字入场说明", "animation": "pop"}
  ],
  "style": ${JSON.stringify({ ...template.defaultStyle, ...(request.style ?? {}) })}
}`;

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
    }),
  });

  const payload = (await response.json()) as DeepSeekResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "DeepSeek request failed.");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek response was empty.");
  }

  const parsed = JSON.parse(extractJson(content)) as unknown;
  const normalized = normalizeDeepSeekPlan(
    parsed,
    fallback,
    request.templateId,
    request.style,
    request.userPrompt,
    advancedTemplate,
  );
  const plan = videoPlanSchema.parse(normalized);

  return clampPlanTiming(plan);
};
