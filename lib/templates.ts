import { reflowTemplateSlots } from "./advanced-template";
import type {
  AdvancedTemplateSpec,
  SceneType,
  StyleOptions,
  TemplateSlot,
  VideoPlan,
} from "./schemas";
import { getPalettePreset } from "./style-presets";

export type TemplatePreset = {
  id: string;
  name: string;
  description: string;
  thumbnail: "gold" | "sunset" | "tech" | "product" | "minimal";
  defaultStyle: StyleOptions;
  promptHint: string;
  advancedTemplate?: AdvancedTemplateSpec;
};

const kineticStyle: StyleOptions = {
  palette: "custom",
  colors: {
    background: "#050505",
    surface: "#21114b",
    primary: "#f9f9f6",
    accent: "#3bdf77",
    muted: "#ec004f",
  },
  fontFamily: "hei",
  fontSize: 172,
  fontWeight: 950,
  backgroundStyle: "solid",
  pace: "fast",
  musicUrl: "/music/viral-quote.wav",
  musicVolume: 0.24,
  aspectRatio: "16:9",
  resolution: "1080p",
};

type SlotSeed = {
  sceneType: SceneType;
  durationSec: number;
  defaultText: string;
  role?: TemplateSlot["textRole"];
  background?: TemplateSlot["background"];
  entrance?: TemplateSlot["motion"]["entrance"];
  emphasis?: TemplateSlot["motion"]["emphasis"];
  scale?: number;
  rows?: number;
  split?: TemplateSlot["layout"]["split"];
  rotate?: number;
  emphasisWords?: string[];
  emphasisStyle?: TemplateSlot["emphasisStyle"];
  subText?: string;
  swapWords?: string[];
  burstWords?: string[];
  backdrop?: TemplateSlot["backdrop"];
  description: string;
};

const makeKineticSlot = (seed: SlotSeed, index: number): TemplateSlot => ({
  id: `slot-${index + 1}`,
  startSec: 0,
  durationSec: seed.durationSec,
  sceneType: seed.sceneType,
  textRole: seed.role ?? "point",
  defaultText: seed.defaultText,
  maxChars:
    seed.sceneType === "letter-scatter"
      ? 6
      : seed.sceneType === "char-annotation"
        ? 4
        : seed.sceneType === "logo-hold"
          ? 16
          : 10,
  visualDescription: seed.description,
  emphasisWords: seed.emphasisWords,
  emphasisStyle: seed.emphasisStyle,
  subText: seed.subText,
  swapWords: seed.swapWords,
  burstWords: seed.burstWords,
  backdrop: seed.backdrop,
  layout: {
    align: "center",
    vertical: "center",
    maxWidth: seed.sceneType === "logo-hold" ? 0.72 : 0.82,
    scale:
      seed.scale ??
      (seed.sceneType === "word-card"
        ? 1.16
        : seed.sceneType === "logo-hold"
          ? 0.86
          : 1.06),
    rotate: seed.rotate ?? 0,
    rows: seed.rows,
    split:
      seed.split ??
      (seed.sceneType === "split-word"
        ? "horizontal"
        : seed.sceneType === "letter-scatter"
          ? "letters"
          : "none"),
  },
  motion: {
    entrance:
      seed.entrance ??
      (seed.sceneType === "intro-wipe"
        ? "wipe"
        : seed.sceneType === "stomp-word"
          ? "stomp"
          : seed.sceneType === "letter-scatter"
            ? "scatter"
            : "scale"),
    emphasis:
      seed.emphasis ??
      (seed.sceneType === "outline-rows"
        ? ["outline", "repeat-rows"]
        : seed.sceneType === "split-word"
          ? ["clip-split", "skew"]
          : seed.sceneType === "blank-color"
            ? ["flash"]
            : ["jitter", "flash"]),
    camera: seed.sceneType === "logo-hold" ? { zoom: 1.06 } : undefined,
    easing: seed.sceneType === "stomp-word" ? "snap" : "expo-out",
    intensity: seed.sceneType === "logo-hold" ? 0.52 : 0.86,
  },
  background:
    seed.background ??
    ({
      type: "solid",
      colorRole: index % 2 === 0 ? "surface" : "accent",
    } satisfies TemplateSlot["background"]),
  transitionOut: { type: "flash-cut", durationSec: 0.08 },
});

const kineticSlotSeeds: SlotSeed[] = [
    {
      sceneType: "intro-wipe",
      durationSec: 0.48,
      defaultText: "先抓住注意力",
      role: "hook",
      background: { type: "solid", color: "#f9f9f6" },
      description: "白色底快速擦入，标题压到画面中心",
    },
    {
      sceneType: "title-sub",
      durationSec: 0.52,
      defaultText: "观点要狠",
      role: "keyword",
      background: { type: "solid", colorRole: "surface" },
      subText: "#把每个字都砸在节拍上",
      emphasisWords: ["狠"],
      description: "紫色背景，大标题撞击入场，小副标题延迟跟进",
    },
    {
      sceneType: "word-card",
      durationSec: 0.52,
      defaultText: "信息要短",
      role: "point",
      background: { type: "solid", colorRole: "accent" },
      entrance: "stomp",
      description: "绿色背景，紫色标题快速稳定",
    },
    {
      sceneType: "split-word",
      durationSec: 0.48,
      defaultText: "节奏切开",
      role: "keyword",
      background: { type: "solid", colorRole: "surface" },
      description: "文字上下裁切分裂，斜杠装饰进入",
    },
    {
      sceneType: "stomp-word",
      durationSec: 0.48,
      defaultText: "砸出重点",
      role: "keyword",
      background: { type: "solid", colorRole: "surface" },
      rotate: -3,
      description: "斜体大字从左侧冲入，带轻微抖动",
    },
    {
      sceneType: "letter-scatter",
      durationSec: 0.64,
      defaultText: "字散再合",
      role: "point",
      background: { type: "solid", colorRole: "accent" },
      description: "单字或字母散开后归位",
    },
    {
      sceneType: "outline-rows",
      durationSec: 0.88,
      defaultText: "反复强化",
      role: "point",
      background: { type: "solid", colorRole: "surface" },
      rows: 8,
      description: "描边文字阵列滚动，中间实心字出现",
    },
    {
      sceneType: "logo-hold",
      durationSec: 5.6,
      defaultText: "把结论留住",
      role: "brand",
      background: { type: "solid", colorRole: "background" },
      description: "标题停留，轻微呼吸缩放，适合品牌或核心结论",
    },
    {
      sceneType: "blank-color",
      durationSec: 0.5,
      defaultText: "换色",
      role: "filler",
      background: { type: "solid", colorRole: "background" },
      entrance: "none",
      description: "空白撞色过渡",
    },
    {
      sceneType: "intro-wipe",
      durationSec: 0.52,
      defaultText: "第二轮反转",
      role: "hook",
      background: { type: "solid", color: "#f9f9f6", accentColor: "#ec004f" },
      backdrop: { text: "2", opacity: 0.12, scale: 3.2 },
      description: "白底擦入并叠加强调色块，背后压半透明大数字2",
    },
    {
      sceneType: "word-card",
      durationSec: 0.52,
      defaultText: "更强对比",
      role: "keyword",
      background: { type: "solid", color: "#ec004f" },
      description: "洋红背景，白色大字撞击",
    },
    {
      sceneType: "word-swap",
      durationSec: 0.52,
      defaultText: "换一种说法",
      role: "point",
      background: { type: "solid", color: "#f9f9f6" },
      entrance: "stomp",
      swapWords: ["说法", "节奏", "角度"],
      description: "句架不动，强调位的词随节拍原位替换",
    },
    {
      sceneType: "split-word",
      durationSec: 0.52,
      defaultText: "再切一次",
      role: "keyword",
      background: { type: "solid", color: "#ec004f" },
      description: "洋红背景文字裁切分裂",
    },
    {
      sceneType: "burst-words",
      durationSec: 0.56,
      defaultText: "压住情绪",
      role: "keyword",
      background: { type: "solid", color: "#ec004f" },
      burstWords: ["呼!", "呼!", "哢!", "BOOM!"],
      description: "拟声爆发词随机角度逐拍弹出",
    },
    {
      sceneType: "letter-scatter",
      durationSec: 0.68,
      defaultText: "重新聚焦",
      role: "point",
      background: { type: "solid", color: "#f9f9f6" },
      description: "字散开后归位，形成短促停顿",
    },
    {
      sceneType: "outline-rows",
      durationSec: 0.94,
      defaultText: "把记忆打满",
      role: "point",
      background: { type: "solid", color: "#ec004f" },
      rows: 8,
      description: "描边阵列滚动，中间实心字叠入",
    },
    {
      sceneType: "logo-hold",
      durationSec: 5.22,
      defaultText: "最后给行动理由",
      role: "ending",
      background: { type: "solid", color: "#ec004f" },
      description: "结尾标题长停留，适合 CTA 或品牌名",
    },
];

const kineticSlots = reflowTemplateSlots(kineticSlotSeeds.map(makeKineticSlot));

const kineticMixcutTemplate: AdvancedTemplateSpec = {
  id: "kinetic-mixcut-20s-advanced",
  name: "强节奏快剪",
  description: "接近参考样片的高级纯文本 kinetic typography 模板",
  source: "preset",
  durationSec: 19.58,
  fps: 30,
  aspectRatio: "16:9",
  style: {
    palette: "custom",
    colors: kineticStyle.colors,
    fontFamily: "hei",
    fontSize: kineticStyle.fontSize,
    fontWeight: kineticStyle.fontWeight,
    backgroundStyle: "solid",
    motionIntensity: 0.88,
  },
  slots: kineticSlots,
  beatMarkers: kineticSlots.map((slot) => slot.startSec),
  beatSource: "estimated",
  flashCuts: kineticSlots.slice(1).map((slot) => slot.startSec),
  audio: {
    url: "/music/viral-quote.wav",
    volume: 0.24,
    loop: true,
  },
};

export const templates: TemplatePreset[] = [
  {
    id: "kinetic-mixcut",
    name: "强节奏快剪",
    description: "复杂运镜、闪切、文字混剪",
    thumbnail: "tech",
    defaultStyle: kineticStyle,
    promptHint:
      "按高级模板槽位填充短句，文字要短、狠、可被快速闪切，适合横屏强节奏纯文本混剪。",
    advancedTemplate: kineticMixcutTemplate,
  },
  {
    id: "viral-quote",
    name: "爆款金句",
    description: "适合金句励志、干货分享",
    thumbnail: "gold",
    defaultStyle: {
      palette: "gold",
      colors: getPalettePreset("gold").colors,
      fontFamily: "hei",
      fontSize: 178,
      fontWeight: 900,
      backgroundStyle: "particles",
      pace: "fast",
      musicUrl: "/music/viral-quote.wav",
      musicVolume: 0.22,
      aspectRatio: "9:16",
      resolution: "1080p",
    },
    promptHint: "短句、强节奏、重点词放大，适合抖音和视频号。",
  },
  {
    id: "emotional-monologue",
    name: "情绪独白",
    description: "适合情绪表达、治愈文案",
    thumbnail: "sunset",
    defaultStyle: {
      palette: "macaron",
      colors: getPalettePreset("macaron").colors,
      fontFamily: "song",
      fontSize: 152,
      fontWeight: 700,
      backgroundStyle: "gradient",
      pace: "medium",
      musicUrl: "/music/emotional-monologue.wav",
      musicVolume: 0.2,
      aspectRatio: "9:16",
      resolution: "1080p",
    },
    promptHint: "温柔、克制、留白，适合小红书情绪类内容。",
  },
  {
    id: "knowledge-cut",
    name: "知识快剪",
    description: "适合知识科普、干货讲解",
    thumbnail: "tech",
    defaultStyle: {
      palette: "blue",
      colors: getPalettePreset("blue").colors,
      fontFamily: "hei",
      fontSize: 158,
      fontWeight: 850,
      backgroundStyle: "gradient",
      pace: "fast",
      musicUrl: "/music/knowledge-cut.wav",
      musicVolume: 0.2,
      aspectRatio: "9:16",
      resolution: "1080p",
    },
    promptHint: "结论先行、信息密度高，每个镜头只讲一个点。",
  },
  {
    id: "product-seeding",
    name: "产品种草",
    description: "适合好物推荐、种草测评",
    thumbnail: "product",
    defaultStyle: {
      palette: "fresh",
      colors: getPalettePreset("fresh").colors,
      fontFamily: "yuan",
      fontSize: 148,
      fontWeight: 780,
      backgroundStyle: "image",
      pace: "medium",
      musicUrl: "/music/product-seeding.wav",
      musicVolume: 0.18,
      aspectRatio: "9:16",
      resolution: "1080p",
    },
    promptHint: "先痛点后卖点，用轻松口吻解释产品价值。",
  },
  {
    id: "minimal-title",
    name: "极简标题",
    description: "适合极简风格、品牌宣传",
    thumbnail: "minimal",
    defaultStyle: {
      palette: "white",
      colors: getPalettePreset("white").colors,
      fontFamily: "serif",
      fontSize: 150,
      fontWeight: 700,
      backgroundStyle: "solid",
      pace: "slow",
      musicUrl: "/music/minimal-title.wav",
      musicVolume: 0.16,
      aspectRatio: "9:16",
      resolution: "1080p",
    },
    promptHint: "高级、简洁、少字，强调品牌感和留白。",
  },
];

export const getTemplateById = (id: string) =>
  templates.find((template) => template.id === id) ?? templates[0];

export const defaultPlan: VideoPlan = {
  title: "自律不是苦行",
  platform: "douyin",
  durationSec: templates[0].advancedTemplate?.durationSec ?? 18,
  tone: "激励向",
  templateId: templates[0].id,
  style: templates[0].defaultStyle,
  script: [
    { id: "line-1", text: "自律不是苦行", emphasis: ["不是"] },
    { id: "line-2", text: "而是对未来的温柔", emphasis: ["温柔"] },
    { id: "line-3", text: "早起的清晨", emphasis: ["清晨"] },
    { id: "line-4", text: "是送给自己的礼物", emphasis: ["礼物"] },
    { id: "line-5", text: "每一次克制", emphasis: ["克制"] },
    { id: "line-6", text: "都在为更好的自己铺路", emphasis: ["更好的自己"] },
    { id: "line-7", text: "坚持下去", emphasis: ["坚持"] },
    { id: "line-8", text: "你会感谢现在的自己", emphasis: ["感谢"] },
  ],
  storyboard: [
    {
      id: "shot-1",
      startSec: 0,
      durationSec: 2,
      text: "自律不是苦行",
      visualDescription: "黑金背景，粒子浮现，文字快速进入",
      animation: "pop",
    },
    {
      id: "shot-2",
      startSec: 2,
      durationSec: 2,
      text: "而是对未来的温柔",
      visualDescription: "金色光点向上漂浮，文字从下方滑入",
      animation: "slide-up",
    },
    {
      id: "shot-3",
      startSec: 4,
      durationSec: 2,
      text: "早起的清晨",
      visualDescription: "背景轻微变亮，文字淡入",
      animation: "fade",
    },
    {
      id: "shot-4",
      startSec: 6,
      durationSec: 2,
      text: "是送给自己的礼物",
      visualDescription: "文字居中放大，关键词变金色",
      animation: "zoom",
    },
    {
      id: "shot-5",
      startSec: 8,
      durationSec: 2,
      text: "每一次克制",
      visualDescription: "黑色背景，文字逐字出现",
      animation: "typewriter",
    },
    {
      id: "shot-6",
      startSec: 10,
      durationSec: 3,
      text: "都在为更好的自己铺路",
      visualDescription: "粒子向远处延伸，文字稳定出现",
      animation: "slide-up",
    },
    {
      id: "shot-7",
      startSec: 13,
      durationSec: 2,
      text: "坚持下去",
      visualDescription: "文字强力弹出，节奏加快",
      animation: "pop",
    },
    {
      id: "shot-8",
      startSec: 15,
      durationSec: 3,
      text: "你会感谢现在的自己",
      visualDescription: "金色光点聚拢，文字收束成标题感",
      animation: "zoom",
    },
  ],
  advancedTemplate: templates[0].advancedTemplate,
};

export const buildFallbackPlan = (
  templateId: string,
  userPrompt: string,
  style?: Partial<StyleOptions>,
): VideoPlan => {
  const template = getTemplateById(templateId);
  const topic =
    userPrompt
      .replace(/[，。,.]/g, " ")
      .split(/\s+/)
      .find((word) => word.length >= 2)
      ?.slice(0, 10) || "自律";

  return {
    ...defaultPlan,
    title: topic,
    templateId: template.id,
    style: {
      ...template.defaultStyle,
      ...style,
      colors: {
        ...template.defaultStyle.colors,
        ...(style?.colors ?? {}),
      },
    },
    advancedTemplate: template.advancedTemplate,
  };
};
