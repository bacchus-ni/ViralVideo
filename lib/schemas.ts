import { z } from "zod";

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

export const scriptLineSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(36),
  emphasis: z.array(z.string()).optional().default([]),
});

export const storyboardShotSchema = z.object({
  id: z.string(),
  startSec: z.number().min(0),
  durationSec: z.number().min(0.8).max(8),
  text: z.string().min(1).max(36),
  visualDescription: z.string().min(1).max(120),
  animation: z.enum(["fade", "slide-up", "pop", "zoom", "typewriter"]),
});

export const videoPlanSchema = z.object({
  title: z.string().min(1).max(28),
  platform: z.enum(["douyin", "xiaohongshu", "shipinhao", "generic"]),
  durationSec: z.number().min(10).max(45),
  tone: z.string().min(1).max(24),
  templateId: z.string().min(1),
  script: z.array(scriptLineSchema).min(3).max(12),
  storyboard: z.array(storyboardShotSchema).min(3).max(12),
  style: styleOptionsSchema,
});

export const generatePlanRequestSchema = z.object({
  templateId: z.string().min(1),
  templateName: z.string().optional(),
  templateDescription: z.string().optional(),
  templatePromptHint: z.string().optional(),
  userPrompt: z.string().min(2).max(200),
  style: styleOptionsSchema.partial().optional(),
});

export const renderVideoRequestSchema = z.object({
  plan: videoPlanSchema,
});

export type StyleOptions = z.infer<typeof styleOptionsSchema>;
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
    const durationSec = Math.max(0.8, Math.min(8, shot.durationSec));
    const normalized = {
      ...shot,
      id: shot.id || `shot-${index + 1}`,
      startSec: Number(cursor.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
    };
    cursor += durationSec;
    return normalized;
  });

  return {
    ...plan,
    durationSec: Number(Math.max(10, Math.min(45, cursor)).toFixed(2)),
    storyboard,
  };
};
