import {
  advancedMotionEmphasis,
  advancedMotionEntrances,
  advancedSceneTypes,
  advancedTemplateSchema,
  type AdvancedTemplateSpec,
  type SceneType,
  type StyleOptions,
  type TemplateSlot,
} from "./schemas";
import { getPalettePreset } from "./style-presets";

const sceneCycle: SceneType[] = [
  "intro-wipe",
  "word-card",
  "split-word",
  "stomp-word",
  "letter-scatter",
  "outline-rows",
  "logo-hold",
  "blank-color",
];

const roleCycle: TemplateSlot["textRole"][] = [
  "hook",
  "keyword",
  "point",
  "point",
  "keyword",
  "point",
  "brand",
  "ending",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const pickClampedNumber = (
  min: number,
  max: number,
  fallback: number | undefined,
  ...values: unknown[]
) => {
  const picked = pickNumber(...values);
  if (picked === undefined) return fallback;
  return Math.max(min, Math.min(max, picked));
};

const normalizeRows = (value: unknown, sceneType: SceneType) => {
  const rows = pickNumber(value);
  if (rows === undefined) return sceneType === "outline-rows" ? 8 : undefined;
  if (rows < 2) return sceneType === "outline-rows" ? 8 : undefined;
  return Math.max(2, Math.min(16, Math.round(rows)));
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

const normalizeText = (value: unknown, fallback: string, maxChars = 36) =>
  pickString(value, fallback)?.replace(/\s+/g, " ").slice(0, maxChars) ?? fallback;

const normalizeEmphasis = (value: unknown): TemplateSlot["motion"]["emphasis"] => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[、,，\s]+/)
      : [];

  return source
    .filter((item): item is string => typeof item === "string")
    .map((item) => pickEnum(advancedMotionEmphasis, item, "flash"))
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 4);
};

const normalizeColors = (
  rawStyle: Record<string, unknown>,
  baseStyle: Partial<StyleOptions>,
) => {
  const palette = pickEnum(
    ["gold", "blue", "white", "dark", "fresh", "macaron", "custom"] as const,
    rawStyle.palette,
    baseStyle.palette ?? "gold",
  );
  const preset = palette === "custom" ? baseStyle.colors : getPalettePreset(palette).colors;
  const rawColors = isRecord(rawStyle.colors) ? rawStyle.colors : {};

  return {
    palette,
    colors: {
      ...preset,
      ...(baseStyle.colors ?? {}),
      background:
        pickString(rawColors.background, baseStyle.colors?.background) ??
        preset?.background ??
        "#050505",
      surface:
        pickString(rawColors.surface, baseStyle.colors?.surface) ??
        preset?.surface ??
        "#111111",
      primary:
        pickString(rawColors.primary, baseStyle.colors?.primary) ??
        preset?.primary ??
        "#ffffff",
      accent:
        pickString(rawColors.accent, baseStyle.colors?.accent) ??
        preset?.accent ??
        "#e7b84b",
      muted:
        pickString(rawColors.muted, baseStyle.colors?.muted) ??
        preset?.muted ??
        "#897247",
    },
  };
};

const sourceSlots = (raw: Record<string, unknown>) => {
  const candidates = [raw.slots, raw.scenes, raw.timeline, raw.storyboard, raw.shots];
  return candidates.find(Array.isArray) as unknown[] | undefined;
};

export const reflowTemplateSlots = (slots: TemplateSlot[]) => {
  let cursor = 0;
  return slots.map((slot, index) => {
    const durationSec = Math.max(0.3, Math.min(10, slot.durationSec));
    const nextSlot = {
      ...slot,
      id: slot.id || `slot-${index + 1}`,
      startSec: Number(cursor.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
    };
    cursor += durationSec;
    return nextSlot;
  });
};

export const getTemplateDuration = (slots: TemplateSlot[], fallback = 20) => {
  const last = slots[slots.length - 1];
  if (!last) return fallback;
  return Number((last.startSec + last.durationSec).toFixed(2));
};

export const normalizeAdvancedTemplate = (
  rawValue: unknown,
  baseStyle: Partial<StyleOptions>,
  fallback?: Partial<AdvancedTemplateSpec>,
): AdvancedTemplateSpec => {
  const rawRoot = isRecord(rawValue) ? rawValue : {};
  const raw = isRecord(rawRoot.advancedTemplate) ? rawRoot.advancedTemplate : rawRoot;
  const rawStyle = isRecord(raw.style) ? raw.style : {};
  const durationSec = Math.max(
    1,
    Math.min(
      60,
      pickNumber(raw.durationSec, raw.duration, raw.seconds, fallback?.durationSec) ??
        20,
    ),
  );
  const rawSlots = sourceSlots(raw) ?? [];
  const defaultSlotCount = Math.max(8, Math.min(18, Math.round(durationSec / 1.2)));
  const count = Math.max(1, Math.min(32, rawSlots.length || defaultSlotCount));
  const defaultDuration = durationSec / count;

  const slots = reflowTemplateSlots(
    Array.from({ length: count }, (_, index) => {
      const item = isRecord(rawSlots[index]) ? rawSlots[index] : {};
      const sceneType = pickEnum(
        advancedSceneTypes,
        item.sceneType ?? item.type ?? item.scene,
        sceneCycle[index % sceneCycle.length],
      );
      const background = isRecord(item.background) ? item.background : {};
      const motion = isRecord(item.motion) ? item.motion : {};
      const layout = isRecord(item.layout) ? item.layout : {};
      const defaultText =
        normalizeText(
          item.defaultText ?? item.text ?? item.caption ?? item.title,
          ["开场", "观点", "重点", "冲击", "节奏", "归位", "标题", "收束"][
            index % 8
          ],
          pickNumber(item.maxChars) ?? 36,
        ) || `镜头${index + 1}`;
      const duration = pickClampedNumber(
        0.3,
        10,
        defaultDuration,
        item.durationSec,
        item.duration,
        item.seconds,
      ) ?? defaultDuration;

      return {
        id: pickString(item.id) ?? `slot-${index + 1}`,
        startSec: pickNumber(item.startSec, item.start, index * defaultDuration) ?? 0,
        durationSec: duration,
        sceneType,
        textRole:
          pickEnum(
            ["hook", "keyword", "point", "brand", "ending", "filler"] as const,
            item.textRole ?? item.role,
            roleCycle[index % roleCycle.length],
          ) ?? "point",
        defaultText,
        maxChars:
          pickClampedNumber(1, 80, 36, item.maxChars, item.maxLength) ?? 36,
        visualDescription:
          pickString(
            item.visualDescription,
            item.description,
            item.visual,
            item.note,
          ) ?? `${sceneType} 文字动效`,
        layout: {
          align: pickEnum(
            ["center", "left", "right"] as const,
            layout.align,
            "center",
          ),
          vertical: pickEnum(
            ["center", "top", "bottom"] as const,
            layout.vertical,
            "center",
          ),
          maxWidth: pickClampedNumber(0.3, 1, 0.86, layout.maxWidth),
          scale:
            pickClampedNumber(
              0.35,
              2.2,
              undefined,
              layout.scale,
            ) ??
            (sceneType === "logo-hold" ? 0.78 : sceneType === "outline-rows" ? 1 : 1.1),
          rotate: pickClampedNumber(-45, 45, 0, layout.rotate),
          rows: normalizeRows(layout.rows, sceneType),
          split:
            pickEnum(
              ["none", "horizontal", "vertical", "letters"] as const,
              layout.split,
              sceneType === "split-word"
                ? "horizontal"
                : sceneType === "letter-scatter"
                  ? "letters"
                  : "none",
            ),
        },
        motion: {
          entrance: pickEnum(
            advancedMotionEntrances,
            motion.entrance ?? item.entrance,
            sceneType === "stomp-word"
              ? "stomp"
              : sceneType === "letter-scatter"
                ? "scatter"
                : sceneType === "intro-wipe"
                  ? "wipe"
                  : "scale",
          ),
          emphasis: normalizeEmphasis(motion.emphasis ?? item.emphasis),
          camera: isRecord(motion.camera)
            ? {
                zoom: pickClampedNumber(0.5, 2, undefined, motion.camera.zoom),
                panX: pickClampedNumber(-1, 1, undefined, motion.camera.panX),
                panY: pickClampedNumber(-1, 1, undefined, motion.camera.panY),
                rotate: pickClampedNumber(
                  -30,
                  30,
                  undefined,
                  motion.camera.rotate,
                ),
              }
            : undefined,
          easing: pickEnum(
            ["expo-out", "linear", "back-out", "snap"] as const,
            motion.easing,
            "expo-out",
          ),
          intensity: pickClampedNumber(
            0,
            1,
            0.72,
            motion.intensity,
            rawStyle.motionIntensity,
          ) ?? 0.72,
        },
        background: {
          type: pickEnum(
            ["solid", "gradient", "particles", "image", "transparent"] as const,
            background.type ?? item.backgroundType,
            sceneType === "blank-color" ? "solid" : "solid",
          ),
          colorRole: pickEnum(
            ["background", "surface", "primary", "accent", "muted"] as const,
            background.colorRole,
            index % 2 === 0 ? "background" : "surface",
          ),
          color: pickString(background.color, item.backgroundColor),
          accentColor: pickString(background.accentColor, item.accentColor),
          imageUrl: pickString(background.imageUrl, item.imageUrl),
        },
        transitionIn: isRecord(item.transitionIn)
          ? {
              type: pickEnum(
                ["cut", "flash-cut", "wipe", "fade"] as const,
                item.transitionIn.type,
                "cut",
              ),
              durationSec: pickNumber(item.transitionIn.durationSec),
            }
          : undefined,
        transitionOut: isRecord(item.transitionOut)
          ? {
              type: pickEnum(
                ["cut", "flash-cut", "wipe", "fade"] as const,
                item.transitionOut.type,
                "flash-cut",
              ),
              durationSec: pickNumber(item.transitionOut.durationSec),
            }
          : undefined,
      } satisfies TemplateSlot;
    }),
  );
  const colors = normalizeColors(rawStyle, baseStyle);
  const audio = isRecord(raw.audio)
    ? {
        url: pickString(raw.audio.url, raw.audio.src, baseStyle.musicUrl) ?? "",
        volume: Math.max(
          0,
          Math.min(1, pickNumber(raw.audio.volume, baseStyle.musicVolume) ?? 0.2),
        ),
        loop: typeof raw.audio.loop === "boolean" ? raw.audio.loop : true,
      }
    : baseStyle.musicUrl
      ? {
          url: baseStyle.musicUrl,
          volume: baseStyle.musicVolume ?? 0.2,
          loop: true,
        }
      : undefined;

  return advancedTemplateSchema.parse({
    id: pickString(raw.id, fallback?.id) ?? `advanced-${Date.now()}`,
    name: pickString(raw.name, fallback?.name) ?? "高级快剪模板",
    description:
      pickString(raw.description, raw.summary, fallback?.description) ??
      "包含运镜、闪切和复杂文字动画的纯文本模板",
    source: pickEnum(
      ["preset", "user", "qwen-video"] as const,
      raw.source,
      fallback?.source ?? "qwen-video",
    ),
    durationSec: getTemplateDuration(slots, durationSec),
    fps: Math.max(12, Math.min(60, pickNumber(raw.fps, fallback?.fps) ?? 30)),
    aspectRatio: pickEnum(
      ["9:16", "16:9", "1:1", "4:3", "3:4", "custom"] as const,
      raw.aspectRatio,
      baseStyle.aspectRatio ?? fallback?.aspectRatio ?? "9:16",
    ),
    style: {
      palette: colors.palette,
      colors: colors.colors,
      fontFamily: pickEnum(
        ["hei", "song", "yuan", "serif"] as const,
        rawStyle.fontFamily,
        baseStyle.fontFamily ?? "hei",
      ),
      fontSize: Math.max(
        72,
        Math.min(260, pickNumber(rawStyle.fontSize, baseStyle.fontSize) ?? 168),
      ),
      fontWeight: Math.max(
        300,
        Math.min(1000, pickNumber(rawStyle.fontWeight, baseStyle.fontWeight) ?? 900),
      ),
      backgroundStyle: pickEnum(
        ["particles", "gradient", "solid", "image"] as const,
        rawStyle.backgroundStyle,
        baseStyle.backgroundStyle ?? "solid",
      ),
      motionIntensity: Math.max(
        0,
        Math.min(1, pickNumber(rawStyle.motionIntensity) ?? 0.78),
      ),
    },
    slots,
    beatMarkers: Array.isArray(raw.beatMarkers)
      ? raw.beatMarkers
          .map((item) => pickNumber(item))
          .filter((item): item is number => typeof item === "number")
          .slice(0, 80)
      : slots.map((slot) => slot.startSec),
    flashCuts: Array.isArray(raw.flashCuts)
      ? raw.flashCuts
          .map((item) => pickNumber(item))
          .filter((item): item is number => typeof item === "number")
          .slice(0, 80)
      : slots.slice(1).map((slot) => slot.startSec),
    audio: audio?.url ? audio : undefined,
  });
};

export const summarizeAdvancedTemplate = (template: AdvancedTemplateSpec) =>
  template.slots
    .map(
      (slot, index) =>
        `${index + 1}. ${slot.sceneType} / ${slot.textRole} / ${slot.durationSec}s / ${slot.motion.entrance} / 默认文字：${slot.defaultText}`,
    )
    .join("\n");
