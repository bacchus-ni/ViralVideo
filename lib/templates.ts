import type { StyleOptions, VideoPlan } from "./schemas";
import { getPalettePreset } from "./style-presets";

export type TemplatePreset = {
  id: string;
  name: string;
  description: string;
  thumbnail: "gold" | "sunset" | "tech" | "product" | "minimal";
  defaultStyle: StyleOptions;
  promptHint: string;
};

export const templates: TemplatePreset[] = [
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
  durationSec: 18,
  tone: "激励向",
  templateId: "viral-quote",
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
    },
  };
};
