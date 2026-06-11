import { z } from "zod";

export const advancedSceneTypes = [
  "intro-wipe",
  "word-card",
  "split-word",
  "stomp-word",
  "letter-scatter",
  "outline-rows",
  "logo-hold",
  "blank-color",
  "stacked-title",
] as const;

export const advancedMotionEntrances = [
  "wipe",
  "stomp",
  "slide",
  "scale",
  "scatter",
  "typewriter",
  "none",
] as const;

export const advancedMotionEmphasis = [
  "jitter",
  "flash",
  "skew",
  "clip-split",
  "outline",
  "repeat-rows",
  "glow",
] as const;

export const colorSetSchema = z.object({
  background: z.string().min(1),
  surface: z.string().min(1),
  primary: z.string().min(1),
  accent: z.string().min(1),
  muted: z.string().min(1),
});

export const styleOptionsSchema = z.object({
  palette: z.enum(["gold", "blue", "white", "dark", "fresh", "macaron", "custom"]),
  colors: colorSetSchema,
  fontFamily: z.enum(["hei", "song", "yuan", "serif"]),
  fontSize: z.number().min(72).max(260),
  fontWeight: z.number().min(300).max(1000),
  backgroundStyle: z.enum(["particles", "gradient", "solid", "image"]),
  backgroundImageUrl: z.string().optional(),
  pace: z.enum(["slow", "medium", "fast"]),
  musicUrl: z.string().optional(),
  musicVolume: z.number().min(0).max(1),
  aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:3", "3:4", "custom"]),
  customAspectWidth: z.number().min(1).max(32).optional(),
  customAspectHeight: z.number().min(1).max(32).optional(),
  resolution: z.enum(["720p", "1080p", "2k", "custom"]),
  customWidth: z.number().min(320).max(4096).optional(),
  customHeight: z.number().min(320).max(4096).optional(),
});

export const templateAudioSchema = z.object({
  url: z.string().min(1),
  volume: z.number().min(0).max(1).default(0.2),
  loop: z.boolean().default(true),
});

export const advancedTemplateStyleSchema = z.object({
  palette: styleOptionsSchema.shape.palette.optional(),
  colors: colorSetSchema.partial().optional(),
  fontFamily: styleOptionsSchema.shape.fontFamily.optional(),
  fontSize: z.number().min(72).max(260).optional(),
  fontWeight: z.number().min(300).max(1000).optional(),
  backgroundStyle: styleOptionsSchema.shape.backgroundStyle.optional(),
  motionIntensity: z.number().min(0).max(1).optional(),
});

export const layoutSpecSchema = z.object({
  align: z.enum(["center", "left", "right"]).default("center"),
  vertical: z.enum(["center", "top", "bottom"]).default("center"),
  maxWidth: z.number().min(0.3).max(1).optional(),
  scale: z.number().min(0.35).max(2.2).optional(),
  rotate: z.number().min(-45).max(45).optional(),
  rows: z.number().min(2).max(16).optional(),
  split: z.enum(["none", "horizontal", "vertical", "letters"]).optional(),
});

export const motionSpecSchema = z.object({
  entrance: z.enum(advancedMotionEntrances).default("scale"),
  emphasis: z.array(z.enum(advancedMotionEmphasis)).default([]),
  camera: z
    .object({
      zoom: z.number().min(0.5).max(2).optional(),
      panX: z.number().min(-1).max(1).optional(),
      panY: z.number().min(-1).max(1).optional(),
      rotate: z.number().min(-30).max(30).optional(),
    })
    .optional(),
  easing: z.enum(["expo-out", "linear", "back-out", "snap"]).default("expo-out"),
  intensity: z.number().min(0).max(1).default(0.65),
});

export const slotBackgroundSchema = z.object({
  type: z.enum(["solid", "gradient", "particles", "image", "transparent"]).default("solid"),
  colorRole: z
    .enum(["background", "surface", "primary", "accent", "muted"])
    .optional(),
  color: z.string().optional(),
  accentColor: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const transitionSpecSchema = z.object({
  type: z.enum(["cut", "flash-cut", "wipe", "fade"]).default("cut"),
  durationSec: z.number().min(0).max(1.5).optional(),
});

export const templateSlotSchema = z.object({
  id: z.string().min(1),
  startSec: z.number().min(0),
  durationSec: z.number().min(0.3).max(10),
  sceneType: z.enum(advancedSceneTypes),
  textRole: z
    .enum(["hook", "keyword", "point", "brand", "ending", "filler"])
    .default("point"),
  defaultText: z.string().min(1).max(60),
  textColor: z.string().optional(),
  maxChars: z.number().min(1).max(80).optional(),
  visualDescription: z.string().max(160).optional(),
  layout: layoutSpecSchema.default({}),
  motion: motionSpecSchema.default({ entrance: "scale", emphasis: [] }),
  background: slotBackgroundSchema.default({ type: "solid" }),
  transitionIn: transitionSpecSchema.optional(),
  transitionOut: transitionSpecSchema.optional(),
});

export const advancedTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  description: z.string().min(1).max(160),
  source: z.enum(["preset", "user", "qwen-video"]).default("preset"),
  durationSec: z.number().min(1).max(60),
  fps: z.number().min(12).max(60).default(30),
  aspectRatio: styleOptionsSchema.shape.aspectRatio.default("9:16"),
  style: advancedTemplateStyleSchema.optional(),
  slots: z.array(templateSlotSchema).min(1).max(32),
  beatMarkers: z.array(z.number().min(0).max(60)).default([]),
  flashCuts: z.array(z.number().min(0).max(60)).default([]),
  audio: templateAudioSchema.optional(),
});

export const scriptLineSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(36),
  emphasis: z.array(z.string()).optional().default([]),
});

export const storyboardShotSchema = z.object({
  id: z.string(),
  startSec: z.number().min(0),
  durationSec: z.number().min(0.3).max(10),
  text: z.string().min(1).max(36),
  visualDescription: z.string().min(1).max(120),
  animation: z.enum(["fade", "slide-up", "pop", "zoom", "typewriter"]),
  advancedSettings: z
    .object({
      textColor: z.string().optional(),
      accentColor: z.string().optional(),
      backgroundType: z
        .enum(["inherit", "solid", "gradient", "particles", "image"])
        .optional(),
      backgroundColor: z.string().optional(),
      backgroundImageUrl: z.string().optional(),
      effect: z.enum(["none", "flash", "jitter", "outline", "glow"]).optional(),
      intensity: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const videoPlanSchema = z.object({
  title: z.string().min(1).max(28),
  platform: z.enum(["douyin", "xiaohongshu", "shipinhao", "generic"]),
  durationSec: z.number().min(10).max(45),
  tone: z.string().min(1).max(24),
  templateId: z.string().min(1),
  script: z.array(scriptLineSchema).min(3).max(24),
  storyboard: z.array(storyboardShotSchema).min(3).max(24),
  style: styleOptionsSchema,
  advancedTemplate: advancedTemplateSchema.optional(),
});

export const generatePlanRequestSchema = z.object({
  templateId: z.string().min(1),
  templateName: z.string().optional(),
  templateDescription: z.string().optional(),
  templatePromptHint: z.string().optional(),
  advancedTemplate: advancedTemplateSchema.optional(),
  userPrompt: z.string().min(2).max(200),
  style: styleOptionsSchema.partial().optional(),
});

export const renderVideoRequestSchema = z.object({
  plan: videoPlanSchema,
});

export type StyleOptions = z.infer<typeof styleOptionsSchema>;
export type AdvancedTemplateSpec = z.infer<typeof advancedTemplateSchema>;
export type TemplateSlot = z.infer<typeof templateSlotSchema>;
export type SceneType = z.infer<typeof templateSlotSchema>["sceneType"];
export type MotionSpec = z.infer<typeof motionSpecSchema>;
export type ScriptLine = z.infer<typeof scriptLineSchema>;
export type StoryboardShot = z.infer<typeof storyboardShotSchema>;
export type VideoPlan = z.infer<typeof videoPlanSchema>;
export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;

export const getAspectNumbers = (style: StyleOptions) => {
  if (style.aspectRatio === "custom") {
    return {
      width: style.customAspectWidth ?? 9,
      height: style.customAspectHeight ?? 16,
    };
  }

  const [width, height] = style.aspectRatio.split(":").map(Number);
  return { width, height };
};

export const getRenderDimensions = (style: StyleOptions) => {
  if (style.resolution === "custom") {
    return {
      width: style.customWidth ?? 1080,
      height: style.customHeight ?? 1920,
    };
  }

  const longSideMap = {
    "720p": 1280,
    "1080p": 1920,
    "2k": 2560,
  } satisfies Record<Exclude<StyleOptions["resolution"], "custom">, number>;
  const longSide = longSideMap[style.resolution];
  const ratio = getAspectNumbers(style);
  const isLandscape = ratio.width >= ratio.height;

  if (isLandscape) {
    const width = longSide;
    const height = Math.round((longSide * ratio.height) / ratio.width);
    return { width, height: height + (height % 2) };
  }

  const height = longSide;
  const width = Math.round((longSide * ratio.width) / ratio.height);
  return { width: width + (width % 2), height };
};

export const clampPlanTiming = (plan: VideoPlan): VideoPlan => {
  let cursor = 0;
  const storyboard = plan.storyboard.map((shot, index) => {
    const durationSec = Math.max(0.3, Math.min(10, shot.durationSec));
    const normalized = {
      ...shot,
      id: shot.id || `shot-${index + 1}`,
      startSec: Number(cursor.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
    };
    cursor += durationSec;
    return normalized;
  });

  const advancedTemplate = plan.advancedTemplate
    ? {
        ...plan.advancedTemplate,
        durationSec: Number(
          Math.max(
            plan.advancedTemplate.durationSec,
            storyboard.reduce((sum, shot) => sum + shot.durationSec, 0),
          ).toFixed(2),
        ),
      }
    : undefined;

  return {
    ...plan,
    durationSec: Number(Math.max(10, Math.min(45, cursor)).toFixed(2)),
    storyboard,
    advancedTemplate,
  };
};
