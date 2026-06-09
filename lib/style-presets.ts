import type { StyleOptions } from "./schemas";

export type PalettePreset = {
  id: StyleOptions["palette"] | string;
  name: string;
  description: string;
  colors: StyleOptions["colors"];
};

export const palettePresets: PalettePreset[] = [
  {
    id: "gold",
    name: "黑金配色",
    description: "适合励志、商业、强冲击标题",
    colors: {
      background: "#050505",
      surface: "#11100c",
      primary: "#f8f7f2",
      accent: "#e7b84b",
      muted: "#897247",
    },
  },
  {
    id: "macaron",
    name: "马卡龙色系",
    description: "适合小红书、治愈、生活方式",
    colors: {
      background: "#fff7f4",
      surface: "#f7fff8",
      primary: "#3c3a46",
      accent: "#ff9db0",
      muted: "#8fbfb1",
    },
  },
  {
    id: "blue",
    name: "清新蓝",
    description: "适合知识、科技、清晰讲解",
    colors: {
      background: "#07101f",
      surface: "#0c1c34",
      primary: "#eff7ff",
      accent: "#55a7ff",
      muted: "#7b9ec9",
    },
  },
  {
    id: "white",
    name: "极简白",
    description: "适合品牌、极简标题、留白",
    colors: {
      background: "#f6f3ed",
      surface: "#fffaf2",
      primary: "#171717",
      accent: "#1f7a5b",
      muted: "#766f65",
    },
  },
  {
    id: "dark",
    name: "深色霓虹",
    description: "适合潮流、观点、夜间氛围",
    colors: {
      background: "#08090b",
      surface: "#111318",
      primary: "#f4f4f4",
      accent: "#49d29a",
      muted: "#848b91",
    },
  },
  {
    id: "fresh",
    name: "自然绿",
    description: "适合产品种草、生活方式",
    colors: {
      background: "#edf8f2",
      surface: "#f9fffb",
      primary: "#143127",
      accent: "#3aaa75",
      muted: "#6f8e80",
    },
  },
];

export const getPalettePreset = (id: string) =>
  palettePresets.find((preset) => preset.id === id) ?? palettePresets[0];

export const fontOptions = [
  { label: "黑体", value: "hei" },
  { label: "宋体", value: "song" },
  { label: "圆体", value: "yuan" },
  { label: "衬线", value: "serif" },
] satisfies Array<{ label: string; value: StyleOptions["fontFamily"] }>;

export const musicOptions = [
  {
    label: "强节奏快剪",
    description: "适合闪切、观点、金句",
    url: "/music/viral-quote.wav",
    volume: 0.24,
  },
  {
    label: "情绪铺底",
    description: "适合治愈、独白、慢节奏",
    url: "/music/emotional-monologue.wav",
    volume: 0.2,
  },
  {
    label: "知识脉冲",
    description: "适合讲解、科普、信息流",
    url: "/music/knowledge-cut.wav",
    volume: 0.2,
  },
  {
    label: "轻快种草",
    description: "适合好物推荐、生活方式",
    url: "/music/product-seeding.wav",
    volume: 0.18,
  },
  {
    label: "极简氛围",
    description: "适合品牌、标题、留白",
    url: "/music/minimal-title.wav",
    volume: 0.16,
  },
] satisfies Array<{
  label: string;
  description: string;
  url: string;
  volume: number;
}>;

export const backgroundOptions = [
  { label: "粒子特效", value: "particles" },
  { label: "柔和渐变", value: "gradient" },
  { label: "纯色背景", value: "solid" },
  { label: "质感光影", value: "image" },
] satisfies Array<{ label: string; value: StyleOptions["backgroundStyle"] }>;

export const aspectRatioOptions = [
  { label: "9:16 竖屏", value: "9:16" },
  { label: "16:9 横屏", value: "16:9" },
  { label: "1:1 方形", value: "1:1" },
  { label: "4:3 横版", value: "4:3" },
  { label: "3:4 竖版", value: "3:4" },
  { label: "自定义", value: "custom" },
] satisfies Array<{ label: string; value: StyleOptions["aspectRatio"] }>;

export const resolutionOptions = [
  { label: "720p", value: "720p" },
  { label: "1080p", value: "1080p" },
  { label: "2K", value: "2k" },
  { label: "自定义", value: "custom" },
] satisfies Array<{ label: string; value: StyleOptions["resolution"] }>;
