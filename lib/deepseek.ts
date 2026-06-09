import {
  clampPlanTiming,
  type GeneratePlanRequest,
  type VideoPlan,
  videoPlanSchema,
} from "@/lib/schemas";
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

const systemPrompt = `你是一个短视频纯文本混剪策划助手。
你需要根据用户需求和模板类型，生成适合竖屏短视频的文案和分镜。

要求：
1. 只输出 JSON，不要输出 Markdown。
2. 视频以文字表现为主，不要依赖复杂实拍素材。
3. 每句文案要短，适合屏幕大字展示。
4. 分镜说明要描述背景、文字入场、节奏和强调词。
5. durationSec 必须在 10 到 45 秒之间。
6. storyboard 中每个镜头必须包含 startSec、durationSec、text、visualDescription、animation。
7. animation 只能是 fade、slide-up、pop、zoom、typewriter。
8. script 和 storyboard 的 text 应该互相对应。
9. 输出字段必须符合 VideoPlan：title、platform、durationSec、tone、templateId、script、storyboard、style。
10. script 必须是数组，不要输出字符串。script 数组元素格式：{"id":"line-1","text":"短句","emphasis":["关键词"]}。
11. storyboard 必须是数组，每个元素都必须有 id，例如 shot-1、shot-2。`;

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

const cleanLine = (value: string) =>
  value
    .replace(/^[\s\-*•·、\d.）)]+/, "")
    .replace(/^镜头\s*\d+\s*[:：-]?/, "")
    .trim()
    .slice(0, 36);

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

const normalizeScript = (rawScript: unknown, fallback: VideoPlan) => {
  const lines = Array.isArray(rawScript)
    ? rawScript
        .map((item, index) => {
          if (typeof item === "string") {
            return {
              id: `line-${index + 1}`,
              text: cleanLine(item),
              emphasis: [],
            };
          }

          if (isRecord(item)) {
            return {
              id: pickString(item.id) ?? `line-${index + 1}`,
              text:
                pickString(item.text, item.content, item.line, item.copy) ??
                fallback.script[index]?.text ??
                `文案${index + 1}`,
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
          emphasis: [],
        }))
      : [];

  const merged = [...lines];
  for (const fallbackLine of fallback.script) {
    if (merged.length >= 3) break;
    merged.push(fallbackLine);
  }

  return merged.slice(0, 12).map((line, index) => ({
    id: line.id || `line-${index + 1}`,
    text: cleanLine(line.text) || fallback.script[index]?.text || "继续向前",
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
  const count = Math.max(3, Math.min(12, source.length || script.length));
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
        durationSec: Math.max(0.8, Math.min(8, durationSec ?? defaultDuration)),
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

  return normalized.slice(0, 12).map((shot, index) => ({
    ...shot,
    id: shot.id || `shot-${index + 1}`,
    text: cleanLine(shot.text) || script[index]?.text || fallback.script[index]?.text,
  }));
};

const normalizeDeepSeekPlan = (
  parsed: unknown,
  fallback: VideoPlan,
  templateId: string,
  requestStyle: GeneratePlanRequest["style"],
) => {
  const raw = isRecord(parsed) ? parsed : {};
  const rawStyle = isRecord(raw.style) ? raw.style : {};
  const script = normalizeScript(raw.script, fallback);
  const storyboard = normalizeStoryboard(raw.storyboard, script, fallback);
  const palette = pickEnum(
    palettes,
    requestStyle?.palette ?? rawStyle.palette,
    fallback.style.palette,
  );
  const rawColors = isRecord(rawStyle.colors) ? rawStyle.colors : {};
  const presetColors = palette === "custom" ? fallback.style.colors : getPalettePreset(palette).colors;

  return {
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
};

export const generatePlanWithDeepSeek = async (
  request: GeneratePlanRequest,
): Promise<VideoPlan> => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured.");
  }

  const template = getTemplateById(request.templateId);
  const fallback = buildFallbackPlan(
    request.templateId,
    request.userPrompt,
    request.style,
  );

  const userPrompt = `模板：${template.name}
模板 ID：${template.id}
模板说明：${template.description}
模板风格：${template.promptHint}
默认样式：${JSON.stringify(template.defaultStyle)}
用户可选样式：${JSON.stringify(request.style ?? {})}
用户需求：${request.userPrompt}

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
  "templateId": "${template.id}",
  "script": [
    {"id": "line-1", "text": "短句", "emphasis": ["关键词"]}
  ],
  "storyboard": [
    {"id": "shot-1", "startSec": 0, "durationSec": 2, "text": "短句", "visualDescription": "背景和文字入场说明", "animation": "pop"}
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
    template.id,
    request.style,
  );
  const plan = videoPlanSchema.parse(normalized);

  return clampPlanTiming(plan);
};
