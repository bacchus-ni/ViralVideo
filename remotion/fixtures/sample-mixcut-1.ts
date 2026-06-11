import type { TemplateSlot, VideoPlan } from "../../lib/schemas";
import { reflowTemplateSlots } from "../../lib/advanced-template";

// 对照样片 example_video/纯文本混剪1-1.mp4 的目标模板：
// 黑底、白色巨字、橙色强调词、节拍驱动的换词/补全/爆发词。
// 用于 Remotion Studio 逐镜头与原片比对（npm run remotion:studio）。

type FixtureSlot = Partial<TemplateSlot> &
  Pick<TemplateSlot, "sceneType" | "durationSec" | "defaultText">;

const makeSlot = (seed: FixtureSlot, index: number): TemplateSlot => ({
  id: `fixture-slot-${index + 1}`,
  startSec: 0,
  textRole: "point",
  maxChars: seed.sceneType === "char-annotation" ? 4 : 36,
  visualDescription: seed.visualDescription ?? `${seed.sceneType} 对照镜头`,
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
    emphasis: [],
    easing: "expo-out",
    intensity: 0.8,
    ...(seed.motion ?? {}),
  },
  background: { type: "solid", colorRole: "background", ...(seed.background ?? {}) },
  ...seed,
});

const slots = reflowTemplateSlots(
  (
    [
      {
        sceneType: "word-card",
        durationSec: 2.2,
        defaultText: "教大家做「踩点」视频",
        emphasisWords: ["踩点"],
        layout: { align: "center", vertical: "center", scale: 0.52 },
        visualDescription: "小号居中白字淡入，强调词橙色",
      },
      {
        sceneType: "title-sub",
        durationSec: 3,
        defaultText: "第一种",
        subText: "跟着鼓点,然后切换镜头就行",
        emphasisWords: ["鼓点"],
        backdrop: { text: "1", opacity: 0.14, scale: 3.4 },
        motion: { entrance: "stomp", emphasis: [], easing: "snap", intensity: 0.85 },
        visualDescription: "巨字标题撞击入场，宋体小副标题延迟跟进，背后压幽灵数字1",
      },
      {
        sceneType: "char-annotation",
        durationSec: 2.6,
        defaultText: "切换",
        subText: "就像这样镜头",
        layout: { align: "center", vertical: "center", scale: 1.2 },
        visualDescription: "两个巨字拉开，竖排小字夹在字缝里",
      },
      {
        sceneType: "word-swap",
        durationSec: 3,
        defaultText: "可以是 人物 镜头",
        swapWords: ["人物", "慢动作", "缩放"],
        visualDescription: "句架静止，橙色强调位随节拍换词",
      },
      {
        sceneType: "word-card",
        durationSec: 2.6,
        defaultText: "跟上鼓点放啥",
        emphasisWords: ["鼓点"],
        motion: {
          entrance: "typewriter",
          emphasis: [],
          easing: "linear",
          intensity: 0.7,
        },
        visualDescription: "按节拍渐进补全：跟 -> 跟上鼓 -> 跟上鼓点放啥",
      },
      {
        sceneType: "burst-words",
        durationSec: 2,
        defaultText: "呼!",
        burstWords: ["呼!", "呼!", "哢!"],
        visualDescription: "拟声词随机角度逐拍弹出",
      },
      {
        sceneType: "title-sub",
        durationSec: 3.4,
        defaultText: "总之",
        subText: "画面比鼓点快一点就行",
        emphasisWords: ["快一点"],
        visualDescription: "结尾标题 + 渐进副标题",
      },
    ] satisfies FixtureSlot[]
  ).map(makeSlot),
);

const durationSec = Number(
  slots.reduce((sum, slot) => sum + slot.durationSec, 0).toFixed(2),
);

// 模拟检测出的鼓点：~109 BPM，每 0.55s 一拍
const beatMarkers = Array.from({ length: Math.floor(durationSec / 0.55) + 1 }, (_, i) =>
  Number((i * 0.55).toFixed(2)),
);

export const sampleMixcut1Plan: VideoPlan = {
  title: "踩点教学第一种",
  platform: "douyin",
  durationSec,
  tone: "节奏教学",
  templateId: "kinetic-mixcut",
  script: [
    { id: "line-1", text: "教大家做「踩点」视频", emphasis: ["踩点"] },
    { id: "line-2", text: "第一种", emphasis: [] },
    { id: "line-3", text: "切换", emphasis: [] },
    { id: "line-4", text: "可以是 人物 镜头", emphasis: [] },
    { id: "line-5", text: "跟上鼓点放啥", emphasis: ["鼓点"] },
    { id: "line-6", text: "呼!", emphasis: [] },
    { id: "line-7", text: "总之", emphasis: [] },
  ],
  storyboard: slots.map((slot, index) => ({
    id: `shot-${index + 1}`,
    startSec: slot.startSec,
    durationSec: slot.durationSec,
    text: slot.defaultText,
    subText: slot.subText,
    swapWords: slot.swapWords,
    visualDescription: slot.visualDescription ?? "对照镜头",
    animation: "pop" as const,
  })),
  style: {
    palette: "custom",
    colors: {
      background: "#050505",
      surface: "#141414",
      primary: "#f5f5f0",
      accent: "#f0a32a",
      muted: "#8a7a55",
    },
    fontFamily: "hei",
    fontSize: 168,
    fontWeight: 900,
    backgroundStyle: "solid",
    pace: "fast",
    musicVolume: 0.2,
    aspectRatio: "16:9",
    resolution: "720p",
  },
  advancedTemplate: {
    id: "fixture-mixcut-1",
    name: "纯文本混剪1-1对照",
    description: "对照样片纯文本混剪1-1的目标模板结构",
    source: "preset",
    durationSec,
    fps: 30,
    aspectRatio: "16:9",
    style: {
      palette: "custom",
      colors: {
        background: "#050505",
        surface: "#141414",
        primary: "#f5f5f0",
        accent: "#f0a32a",
        muted: "#8a7a55",
      },
      fontFamily: "hei",
      fontSize: 168,
      fontWeight: 900,
      backgroundStyle: "solid",
      motionIntensity: 0.85,
    },
    slots,
    beatMarkers,
    beatSource: "detected",
    flashCuts: slots.slice(1).map((slot) => slot.startSec),
  },
};
