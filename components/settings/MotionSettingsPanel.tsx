"use client";

import {
  advancedMotionEmphasis,
  advancedMotionEntrances,
  advancedSceneTypes,
  type SceneType,
  type StoryboardShot,
  type TemplateSlot,
} from "@/lib/schemas";
import { RangeField } from "./SettingControls";

type ShotAdvancedSettings = NonNullable<StoryboardShot["advancedSettings"]>;
type EffectValue = NonNullable<ShotAdvancedSettings["effect"]>;

export const animationOptions: Array<{
  label: string;
  value: StoryboardShot["animation"];
}> = [
  { label: "淡入", value: "fade" },
  { label: "上滑", value: "slide-up" },
  { label: "弹出", value: "pop" },
  { label: "缩放", value: "zoom" },
  { label: "打字", value: "typewriter" },
];

export const sceneTypeLabels: Record<SceneType, string> = {
  "intro-wipe": "色块擦入",
  "word-card": "文字卡片",
  "split-word": "裁切分裂",
  "stomp-word": "冲击字",
  "letter-scatter": "字散归位",
  "outline-rows": "描边阵列",
  "logo-hold": "长停留",
  "blank-color": "撞色过渡",
  "stacked-title": "堆叠标题",
};

const entranceLabels: Record<TemplateSlot["motion"]["entrance"], string> = {
  wipe: "擦入",
  stomp: "冲击",
  slide: "滑入",
  scale: "缩放",
  scatter: "散开",
  typewriter: "打字",
  none: "无",
};

const emphasisLabels: Record<TemplateSlot["motion"]["emphasis"][number], string> = {
  jitter: "抖动",
  flash: "闪白",
  skew: "倾斜",
  "clip-split": "裁切",
  outline: "描边",
  "repeat-rows": "阵列",
  glow: "发光",
};

const effectOptions: Array<{
  label: string;
  value: EffectValue;
}> = [
  { label: "无", value: "none" },
  { label: "闪白", value: "flash" },
  { label: "抖动", value: "jitter" },
  { label: "描边", value: "outline" },
  { label: "发光", value: "glow" },
];

type MotionSettingsPanelProps = {
  shot: StoryboardShot;
  slot?: TemplateSlot;
  noTopBorder?: boolean;
  onShotChange: (patch: Partial<StoryboardShot>) => void;
  onAdvancedSettingsChange: (patch: Partial<ShotAdvancedSettings>) => void;
  onEffectChange: (effect: EffectValue) => void;
  onSlotChange?: (patch: Partial<TemplateSlot>) => void;
  onToggleEmphasis?: (
    emphasis: TemplateSlot["motion"]["emphasis"][number],
  ) => void;
};

export const MotionSettingsPanel: React.FC<MotionSettingsPanelProps> = ({
  shot,
  slot,
  noTopBorder = false,
  onShotChange,
  onAdvancedSettingsChange,
  onEffectChange,
  onSlotChange,
  onToggleEmphasis,
}) => (
  <>
    <section className={`settings-section ${noTopBorder ? "no-top-border" : ""}`.trim()}>
      <h4>运动</h4>
      <div className="two-field-row">
        <label className="settings-field">
          <span>时长 秒</span>
          <input
            type="number"
            min={0.3}
            max={10}
            step={0.1}
            value={shot.durationSec}
            onChange={(event) =>
              onShotChange({ durationSec: Number(event.target.value) || 0.3 })
            }
          />
        </label>
        {/* 高级模板的入场由下方槽位入场控制，普通入场动画不参与渲染，隐藏避免误导 */}
        {slot ? null : (
          <label className="settings-field">
            <span>入场效果</span>
            <select
              value={shot.animation}
              onChange={(event) =>
                onShotChange({
                  animation: event.target.value as StoryboardShot["animation"],
                })
              }
            >
              {animationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>

    <section className="settings-section">
      <h4>特效</h4>
      <div className="two-field-row">
        <label className="settings-field">
          <span>画面特效</span>
          <select
            value={shot.advancedSettings?.effect ?? "none"}
            onChange={(event) =>
              onEffectChange(event.target.value as EffectValue)
            }
          >
            {effectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <RangeField
          label={`强度 ${Math.round((shot.advancedSettings?.intensity ?? 0.55) * 100)}%`}
          min={0}
          max={1}
          step={0.01}
          value={shot.advancedSettings?.intensity ?? 0.55}
          onChange={(intensity) => onAdvancedSettingsChange({ intensity })}
        />
      </div>
    </section>

    {slot ? (
      <section className="settings-section">
        <h4>高级模板</h4>
        <div className="two-field-row">
          <label className="settings-field">
            <span>镜头类型</span>
            <select
              value={slot.sceneType}
              onChange={(event) =>
                onSlotChange?.({ sceneType: event.target.value as SceneType })
              }
            >
              {advancedSceneTypes.map((sceneType) => (
                <option key={sceneType} value={sceneType}>
                  {sceneTypeLabels[sceneType]}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span>入场效果</span>
            <select
              value={slot.motion.entrance}
              onChange={(event) =>
                onSlotChange?.({
                  motion: {
                    ...slot.motion,
                    entrance: event.target
                      .value as TemplateSlot["motion"]["entrance"],
                  },
                })
              }
            >
              {advancedMotionEntrances.map((entrance) => (
                <option key={entrance} value={entrance}>
                  {entranceLabels[entrance]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="emphasis-grid">
          {advancedMotionEmphasis.map((emphasis) => (
            <label key={emphasis} className="emphasis-toggle">
              <input
                type="checkbox"
                checked={slot.motion.emphasis.includes(emphasis)}
                onChange={() => onToggleEmphasis?.(emphasis)}
              />
              <span>{emphasisLabels[emphasis]}</span>
            </label>
          ))}
        </div>
      </section>
    ) : null}
  </>
);
