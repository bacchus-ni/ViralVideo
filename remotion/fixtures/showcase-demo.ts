import type { TemplateSlot, VideoPlan } from "../../lib/schemas";
import { reflowTemplateSlots, snapSlotsToBeats } from "../../lib/advanced-template";

// 能力演示片《这条视频没有素材》：自我指涉式 showcase，
// 每个镜头展示一种系统能力，文字说什么画面就做什么。
// 配乐取自 example_video/只用文本做一个高燃混剪.mp4 的 32s 起高潮段，
// beatMarkers 是 lib/beat-detect 对该片段的真实检测结果，槽位边界已吸附节拍。

// detectBeatsFromMedia("public/music/showcase-beat.m4a") 的输出
const DETECTED_BEATS = [
  0.33, 0.88, 1.14, 1.6, 1.83, 2.28, 2.46, 2.67, 2.93, 3.34, 3.9, 4.16, 4.39,
  4.83, 5.13, 5.39, 5.57, 6.04, 6.36, 6.85, 7.08, 7.29, 7.52, 8.22, 8.64, 8.85,
  9.13, 9.33, 9.8, 10.17, 10.68, 10.91, 11.56, 12.03, 12.21, 12.47, 12.77, 13.0,
  13.19, 13.49, 13.96, 14.14, 14.42, 14.7, 14.88, 15.77, 16.18, 16.51, 19.71,
  20.02, 20.23, 20.57, 21.2, 21.52, 21.76, 22.06, 22.38, 23.82, 24.08, 24.4,
  25.64, 25.91, 27.4, 27.61, 28.65, 29.12, 30.12, 30.3,
];

const COLORS = {
  background: "#050505",
  surface: "#1a0b2e",
  primary: "#f5f5f0",
  accent: "#f0a32a",
  muted: "#2a2118",
};

type FixtureSlot = Partial<TemplateSlot> &
  Pick<TemplateSlot, "sceneType" | "durationSec" | "defaultText">;

const makeSlot = (seed: FixtureSlot, index: number): TemplateSlot => ({
  id: `showcase-slot-${index + 1}`,
  startSec: 0,
  textRole: "point",
  maxChars: seed.sceneType === "char-annotation" ? 4 : 36,
  visualDescription: seed.visualDescription ?? `${seed.sceneType} 演示镜头`,
  layout: {
    align: "center",
    vertical: "center",
    maxWidth: 0.86,
    scale: 1,
    rotate: 0,
    split: "none",
    ...(seed.layout ?? {}),
  },
  motion: {
    entrance: "scale",
    emphasis: ["flash"],
    easing: "expo-out",
    intensity: 0.82,
    ...(seed.motion ?? {}),
  },
  background: { type: "solid", colorRole: "background", ...(seed.background ?? {}) },
  ...seed,
});

const slots = snapSlotsToBeats(
  reflowTemplateSlots(
    (
      [
        {
          sceneType: "word-card",
          durationSec: 2.2,
          defaultText: "这条视频 没有素材",
          emphasisWords: ["没有素材"],
          layout: { align: "center", vertical: "center", scale: 0.6 },
          visualDescription: "黑底小字开场，强调词橙色",
        },
        {
          sceneType: "title-sub",
          durationSec: 2.6,
          defaultText: "纯文本",
          subText: "#只用文字也能做混剪",
          emphasisWords: ["文字"],
          backdrop: { text: "1", opacity: 0.14, scale: 3.4 },
          motion: { entrance: "stomp", emphasis: ["flash"], easing: "snap", intensity: 0.85 },
          visualDescription: "巨字标题+副标题，幽灵数字1",
        },
        {
          sceneType: "char-annotation",
          durationSec: 2.4,
          defaultText: "混剪",
          subText: "全靠文字动效",
          textColor: "#f5f5f0",
          background: { type: "solid", colorRole: "surface" },
          layout: { align: "center", vertical: "center", scale: 1.2 },
          visualDescription: "深紫底，大字夹竖排小字",
        },
        {
          sceneType: "word-swap",
          durationSec: 2.8,
          defaultText: "可以换 颜色 的字",
          swapWords: ["颜色", "大小", "节奏"],
          visualDescription: "黑底，橙色强调位随节拍换词",
        },
        {
          sceneType: "word-card",
          durationSec: 2.6,
          defaultText: "跟着鼓点一字一字蹦",
          emphasisWords: ["鼓点"],
          background: { type: "solid", color: "#0c1b4d" },
          motion: { entrance: "typewriter", emphasis: ["flash"], easing: "linear", intensity: 0.7 },
          visualDescription: "深蓝底，按真实鼓点逐字补全",
        },
        {
          sceneType: "burst-words",
          durationSec: 2,
          defaultText: "哒!",
          burstWords: ["哒!", "哒!", "咔!", "BOOM!"],
          background: { type: "solid", color: "#11041f", accentColor: "#ffd23f" },
          visualDescription: "暗紫底，黄色拟声词随机角度逐拍弹出",
        },
        {
          sceneType: "word-card",
          durationSec: 1.8,
          defaultText: "第二种玩法",
          backdrop: { text: "2", opacity: 0.14, scale: 3.2 },
          background: { type: "solid", color: "#f9f9f6" },
          motion: { entrance: "wipe", emphasis: ["flash"], easing: "expo-out", intensity: 0.85 },
          visualDescription: "白底撞色，深色字擦入，幽灵数字2",
        },
        {
          sceneType: "word-card",
          durationSec: 2.2,
          defaultText: "重点可以加 高亮块",
          emphasisWords: ["高亮块"],
          emphasisStyle: "highlight",
          background: { type: "solid", color: "#f9f9f6" },
          motion: { entrance: "slide", emphasis: [], easing: "expo-out", intensity: 0.7 },
          visualDescription: "白底，橙色高亮块压字",
        },
        {
          sceneType: "split-word",
          durationSec: 1.8,
          defaultText: "也可以裁开",
          background: { type: "solid", color: "#ec004f" },
          motion: { entrance: "slide", emphasis: ["clip-split", "skew"], easing: "expo-out", intensity: 0.85 },
          visualDescription: "洋红底，文字上下裁切分裂",
        },
        {
          sceneType: "outline-rows",
          durationSec: 2.2,
          defaultText: "描边阵列滚动",
          layout: { align: "center", vertical: "center", rows: 8 },
          motion: { entrance: "scale", emphasis: ["outline", "repeat-rows"], easing: "expo-out", intensity: 0.85 },
          visualDescription: "黑底描边文字阵列",
        },
        {
          sceneType: "blank-color",
          durationSec: 0.5,
          defaultText: "切",
          textRole: "filler",
          background: { type: "solid", colorRole: "accent" },
          motion: { entrance: "none", emphasis: ["flash"], easing: "snap", intensity: 0.9 },
          visualDescription: "橙色空白撞色过渡",
        },
        {
          sceneType: "title-sub",
          durationSec: 2.6,
          defaultText: "总之",
          subText: "模板 文案 节拍 全自动",
          emphasisWords: ["全自动"],
          backdrop: { text: "3", opacity: 0.14, scale: 3.4 },
          motion: { entrance: "stomp", emphasis: ["flash"], easing: "snap", intensity: 0.85 },
          visualDescription: "黑底收束标题，幽灵数字3",
        },
        {
          sceneType: "logo-hold",
          durationSec: 3.4,
          defaultText: "AI纯文本混剪",
          textColor: "#f5f5f0",
          textRole: "brand",
          background: { type: "particles", colorRole: "surface" },
          motion: {
            entrance: "scale",
            emphasis: ["glow"],
            easing: "expo-out",
            intensity: 0.6,
            camera: { zoom: 1.08 },
          },
          visualDescription: "深紫粒子底，品牌字长停留缓慢推进",
        },
      ] satisfies FixtureSlot[]
    ).map(makeSlot),
  ),
  DETECTED_BEATS,
);

const durationSec = Number(
  slots.reduce((sum, slot) => sum + slot.durationSec, 0).toFixed(2),
);

export const showcaseDemoPlan: VideoPlan = {
  title: "这条视频没有素材",
  platform: "douyin",
  durationSec,
  tone: "高燃演示",
  templateId: "kinetic-mixcut",
  script: slots.map((slot, index) => ({
    id: `line-${index + 1}`,
    text: slot.defaultText,
    emphasis: slot.emphasisWords ?? [],
  })),
  storyboard: slots.map((slot, index) => ({
    id: `shot-${index + 1}`,
    startSec: slot.startSec,
    durationSec: slot.durationSec,
    text: slot.defaultText,
    subText: slot.subText,
    swapWords: slot.swapWords,
    visualDescription: slot.visualDescription ?? "演示镜头",
    animation: "pop" as const,
  })),
  style: {
    palette: "custom",
    colors: COLORS,
    fontFamily: "hei",
    fontSize: 168,
    fontWeight: 900,
    backgroundStyle: "solid",
    pace: "fast",
    musicUrl: "/music/showcase-beat.m4a",
    musicVolume: 0.5,
    aspectRatio: "16:9",
    resolution: "720p",
  },
  advancedTemplate: {
    id: "showcase-demo",
    name: "能力演示片",
    description: "覆盖全部场景原语与节拍能力的自我演示模板",
    source: "preset",
    durationSec,
    fps: 30,
    aspectRatio: "16:9",
    style: {
      palette: "custom",
      colors: COLORS,
      fontFamily: "hei",
      fontSize: 168,
      fontWeight: 900,
      backgroundStyle: "solid",
      motionIntensity: 0.85,
    },
    slots,
    beatMarkers: DETECTED_BEATS,
    beatSource: "detected",
    flashCuts: slots.slice(1).map((slot) => slot.startSec),
    audio: {
      url: "/music/showcase-beat.m4a",
      volume: 0.5,
      loop: false,
    },
  },
};
