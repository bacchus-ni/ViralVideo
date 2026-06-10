"use client";

import { Clipboard, ListVideo, Settings2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  advancedMotionEntrances,
  advancedMotionEmphasis,
  advancedSceneTypes,
  type SceneType,
  type StoryboardShot,
  type TemplateSlot,
  type VideoPlan,
} from "@/lib/schemas";
import { getTemplateDuration, reflowTemplateSlots } from "@/lib/advanced-template";

type GeneratedPlanCardProps = {
  plan: VideoPlan;
  sourceLabel?: string;
  warning?: string;
  onChange: (plan: VideoPlan) => void;
};

const animationOptions: Array<{
  label: string;
  value: StoryboardShot["animation"];
}> = [
  { label: "淡入", value: "fade" },
  { label: "上滑", value: "slide-up" },
  { label: "弹出", value: "pop" },
  { label: "缩放", value: "zoom" },
  { label: "打字", value: "typewriter" },
];

const sceneTypeLabels: Record<SceneType, string> = {
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
};

const backgroundTypeOptions: Array<{
  label: string;
  value: NonNullable<StoryboardShot["advancedSettings"]>["backgroundType"];
}> = [
  { label: "跟随全局", value: "inherit" },
  { label: "纯色", value: "solid" },
  { label: "渐变", value: "gradient" },
  { label: "粒子", value: "particles" },
  { label: "图片", value: "image" },
];

const effectOptions: Array<{
  label: string;
  value: NonNullable<StoryboardShot["advancedSettings"]>["effect"];
}> = [
  { label: "无", value: "none" },
  { label: "闪白", value: "flash" },
  { label: "抖动", value: "jitter" },
  { label: "描边", value: "outline" },
  { label: "发光", value: "glow" },
];

const effectToEmphasis = (
  effect: NonNullable<StoryboardShot["advancedSettings"]>["effect"],
) => {
  if (effect === "flash") return "flash";
  if (effect === "jitter") return "jitter";
  if (effect === "outline") return "outline";
  return undefined;
};

const recalculateTiming = (plan: VideoPlan): VideoPlan => {
  let cursor = 0;
  const storyboard = plan.storyboard.map((shot, index) => {
    const durationSec = Math.max(0.3, Math.min(10, shot.durationSec));
    const nextShot = {
      ...shot,
      id: shot.id || `shot-${index + 1}`,
      startSec: Number(cursor.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
    };
    cursor += durationSec;
    return nextShot;
  });
  const advancedSlots = plan.advancedTemplate
    ? reflowTemplateSlots(
        plan.advancedTemplate.slots.map((slot, index) => ({
          ...slot,
          durationSec: storyboard[index]?.durationSec ?? slot.durationSec,
          defaultText: storyboard[index]?.text || slot.defaultText,
          visualDescription:
            storyboard[index]?.visualDescription ?? slot.visualDescription,
        })),
      )
    : undefined;
  const advancedTemplate =
    plan.advancedTemplate && advancedSlots
      ? {
          ...plan.advancedTemplate,
          slots: advancedSlots,
          durationSec: getTemplateDuration(
            advancedSlots,
            plan.advancedTemplate.durationSec,
          ),
          beatMarkers: advancedSlots.map((slot) => slot.startSec),
          flashCuts: advancedSlots.slice(1).map((slot) => slot.startSec),
        }
      : undefined;

  return {
    ...plan,
    durationSec: Number(
      Math.max(
        10,
        Math.min(45, advancedTemplate?.durationSec ?? cursor),
      ).toFixed(2),
    ),
    storyboard,
    advancedTemplate,
  };
};

export const GeneratedPlanCard: React.FC<GeneratedPlanCardProps> = ({
  plan,
  sourceLabel,
  warning,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<"script" | "storyboard">("script");
  const [advancedShotIndex, setAdvancedShotIndex] = useState<number | null>(null);
  const scriptText = useMemo(
    () => plan.script.map((line) => line.text).join("\n"),
    [plan.script],
  );
  const activeShot =
    advancedShotIndex === null ? undefined : plan.storyboard[advancedShotIndex];
  const activeSlot =
    advancedShotIndex === null
      ? undefined
      : plan.advancedTemplate?.slots[advancedShotIndex];

  const copyScript = async () => {
    await navigator.clipboard.writeText(scriptText);
  };

  const updateScriptText = (text: string) => {
    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 24);
    const nextLines = lines.length > 0 ? lines : [""];
    const script = nextLines.map((line, index) => ({
      id: plan.script[index]?.id ?? `line-${index + 1}`,
      text: line.slice(0, 36),
      emphasis: plan.script[index]?.emphasis ?? [],
    }));
    const storyboard = nextLines.map((line, index) => {
      const existing = plan.storyboard[index] ?? plan.storyboard[plan.storyboard.length - 1];
      return {
        ...existing,
        id: existing?.id ?? `shot-${index + 1}`,
        text: line.slice(0, 36),
        visualDescription:
          existing?.visualDescription ?? "文字居中出现，保持清晰节奏",
        animation: existing?.animation ?? "pop",
        durationSec: existing?.durationSec ?? 2,
        startSec: existing?.startSec ?? index * 2,
      };
    });

    onChange(
      recalculateTiming({
        ...plan,
        script,
        storyboard,
      }),
    );
  };

  const updateStoryboardShot = (
    index: number,
    patch: Partial<StoryboardShot>,
  ) => {
    const storyboard = plan.storyboard.map((shot, shotIndex) =>
      shotIndex === index ? { ...shot, ...patch } : shot,
    );
    const script =
      typeof patch.text === "string"
        ? plan.script.map((line, lineIndex) =>
            lineIndex === index ? { ...line, text: patch.text ?? line.text } : line,
          )
        : plan.script;

    onChange(
      recalculateTiming({
        ...plan,
        script,
        storyboard,
      }),
    );
  };

  const updateAdvancedSlot = (index: number, patch: Partial<TemplateSlot>) => {
    if (!plan.advancedTemplate) return;
    const slots = reflowTemplateSlots(
      plan.advancedTemplate.slots.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              ...patch,
              layout: {
                ...slot.layout,
                ...(patch.layout ?? {}),
              },
              motion: {
                ...slot.motion,
                ...(patch.motion ?? {}),
              },
              background: {
                ...slot.background,
                ...(patch.background ?? {}),
              },
            }
          : slot,
      ),
    );

    onChange({
      ...plan,
      durationSec: Math.max(
        10,
        Math.min(45, getTemplateDuration(slots, plan.advancedTemplate.durationSec)),
      ),
      advancedTemplate: {
        ...plan.advancedTemplate,
        slots,
        durationSec: getTemplateDuration(slots, plan.advancedTemplate.durationSec),
        beatMarkers: slots.map((slot) => slot.startSec),
        flashCuts: slots.slice(1).map((slot) => slot.startSec),
      },
    });
  };

  const updateShotAdvancedSettings = (
    index: number,
    patch: Partial<NonNullable<StoryboardShot["advancedSettings"]>>,
  ) => {
    const current = plan.storyboard[index]?.advancedSettings ?? {};
    updateStoryboardShot(index, {
      advancedSettings: {
        ...current,
        ...patch,
      },
    });
  };

  const updateShotEffect = (
    index: number,
    effect: NonNullable<StoryboardShot["advancedSettings"]>["effect"],
  ) => {
    updateShotAdvancedSettings(index, { effect });
    if (!plan.advancedTemplate?.slots[index]) return;
    const mapped = effectToEmphasis(effect);
    const current = plan.advancedTemplate.slots[index].motion.emphasis;
    const preserved = current.filter(
      (item) => !["flash", "jitter", "outline"].includes(item),
    );
    updateAdvancedSlot(index, {
      motion: {
        ...plan.advancedTemplate.slots[index].motion,
        emphasis: mapped ? [...preserved, mapped] : preserved,
      },
    });
  };

  const updateShotBackground = (
    index: number,
    patch: Partial<NonNullable<StoryboardShot["advancedSettings"]>>,
  ) => {
    updateShotAdvancedSettings(index, patch);
    const nextType = patch.backgroundType;
    const slot = plan.advancedTemplate?.slots[index];
    if (!slot) return;
    updateAdvancedSlot(index, {
      background: {
        ...slot.background,
        ...(nextType && nextType !== "inherit" ? { type: nextType } : {}),
        ...(patch.backgroundColor ? { color: patch.backgroundColor } : {}),
        ...(patch.accentColor ? { accentColor: patch.accentColor } : {}),
        ...(patch.backgroundImageUrl ? { imageUrl: patch.backgroundImageUrl } : {}),
      },
    });
  };

  const toggleAdvancedEmphasis = (
    index: number,
    emphasis: TemplateSlot["motion"]["emphasis"][number],
  ) => {
    if (!plan.advancedTemplate?.slots[index]) return;
    const slot = plan.advancedTemplate.slots[index];
    const hasEmphasis = slot.motion.emphasis.includes(emphasis);
    updateAdvancedSlot(index, {
      motion: {
        ...slot.motion,
        emphasis: hasEmphasis
          ? slot.motion.emphasis.filter((item) => item !== emphasis)
          : [...slot.motion.emphasis, emphasis],
      },
    });
  };

  return (
    <section className="panel result-panel" aria-labelledby="result-title">
      <div className="panel-title-row result-title-row">
        <span className="panel-icon compact" title="AI 生成结果">
          AI
        </span>
        <h2 id="result-title">AI生成结果</h2>
        <button
          className="icon-button"
          type="button"
          title="复制文案"
          onClick={copyScript}
        >
          <Clipboard size={19} aria-hidden />
        </button>
      </div>

      {sourceLabel ? <div className="source-note">{sourceLabel}</div> : null}
      {warning ? <div className="warning-note">{warning}</div> : null}

      <div className="result-card">
        <div className="tabs" role="tablist" aria-label="AI 生成结果">
          <button
            className={activeTab === "script" ? "is-active" : ""}
            onClick={() => setActiveTab("script")}
            type="button"
          >
            <Sparkles size={16} aria-hidden />
            文案
          </button>
          <button
            className={activeTab === "storyboard" ? "is-active" : ""}
            onClick={() => setActiveTab("storyboard")}
            type="button"
          >
            <ListVideo size={16} aria-hidden />
            分镜
          </button>
        </div>

        {activeTab === "script" ? (
          <label className="script-textarea-wrap">
            <span>每行会成为一个视频镜头文字</span>
            <textarea
              value={scriptText}
              onChange={(event) => updateScriptText(event.target.value)}
              placeholder="每行一句文案"
            />
          </label>
        ) : (
          <div className="storyboard-list">
            {plan.storyboard.map((shot, index) => (
              <div key={shot.id} className="storyboard-edit-card">
                <div className="storyboard-edit-heading">
                  <span>镜头{index + 1}</span>
                  <small>
                    {shot.durationSec}s ·{" "}
                    {animationOptions.find((option) => option.value === shot.animation)
                      ?.label ?? "动画"}
                  </small>
                  <button
                    type="button"
                    className="advanced-settings-button"
                    onClick={() => setAdvancedShotIndex(index)}
                  >
                    <Settings2 size={16} aria-hidden />
                    高级设置
                  </button>
                </div>
                <label className="storyboard-field">
                  <span>画面文字</span>
                  <input
                    value={shot.text}
                    maxLength={36}
                    onChange={(event) =>
                      updateStoryboardShot(index, { text: event.target.value })
                    }
                  />
                </label>
                <label className="storyboard-field">
                  <span>分镜说明</span>
                  <textarea
                    value={shot.visualDescription}
                    maxLength={120}
                    onChange={(event) =>
                      updateStoryboardShot(index, {
                        visualDescription: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeShot && advancedShotIndex !== null ? (
        <div
          className="settings-backdrop"
          role="presentation"
          onClick={() => setAdvancedShotIndex(null)}
        >
          <section
            className="settings-modal storyboard-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`镜头${advancedShotIndex + 1}高级设置`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <h3>镜头{advancedShotIndex + 1}高级设置</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAdvancedShotIndex(null)}
              >
                <X size={18} aria-hidden />
              </button>
            </header>

            <div className="settings-content storyboard-settings-content">
              <section className="settings-section no-top-border">
                <h4>基础</h4>
                <div className="two-field-row">
                  <label className="settings-field">
                    <span>时长 秒</span>
                    <input
                      type="number"
                      min={0.3}
                      max={10}
                      step={0.1}
                      value={activeShot.durationSec}
                      onChange={(event) =>
                        updateStoryboardShot(advancedShotIndex, {
                          durationSec: Number(event.target.value) || 0.3,
                        })
                      }
                    />
                  </label>
                  <label className="settings-field">
                    <span>入场效果</span>
                    <select
                      value={activeShot.animation}
                      onChange={(event) =>
                        updateStoryboardShot(advancedShotIndex, {
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
                </div>
              </section>

              <section className="settings-section">
                <h4>文字</h4>
                <div className="two-field-row">
                  <label className="color-field">
                    <span>文字色</span>
                    <input
                      type="color"
                      value={activeShot.advancedSettings?.textColor ?? plan.style.colors.primary}
                      onChange={(event) => {
                        updateShotAdvancedSettings(advancedShotIndex, {
                          textColor: event.target.value,
                        });
                        if (activeSlot) {
                          updateAdvancedSlot(advancedShotIndex, {
                            textColor: event.target.value,
                          });
                        }
                      }}
                    />
                  </label>
                  <label className="color-field">
                    <span>强调色</span>
                    <input
                      type="color"
                      value={activeShot.advancedSettings?.accentColor ?? plan.style.colors.accent}
                      onChange={(event) =>
                        updateShotBackground(advancedShotIndex, {
                          accentColor: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="settings-section">
                <h4>背景</h4>
                <div className="two-field-row">
                  <label className="settings-field">
                    <span>背景类型</span>
                    <select
                      value={activeShot.advancedSettings?.backgroundType ?? "inherit"}
                      onChange={(event) =>
                        updateShotBackground(advancedShotIndex, {
                          backgroundType: event.target
                            .value as NonNullable<
                            StoryboardShot["advancedSettings"]
                          >["backgroundType"],
                        })
                      }
                    >
                      {backgroundTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="color-field">
                    <span>背景色</span>
                    <input
                      type="color"
                      value={activeShot.advancedSettings?.backgroundColor ?? plan.style.colors.background}
                      onChange={(event) =>
                        updateShotBackground(advancedShotIndex, {
                          backgroundColor: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                {(activeShot.advancedSettings?.backgroundType ?? "inherit") === "image" ? (
                  <label className="settings-field">
                    <span>背景图片地址</span>
                    <input
                      value={activeShot.advancedSettings?.backgroundImageUrl ?? ""}
                      placeholder="/generated-backgrounds/example.png 或 data:image/..."
                      onChange={(event) =>
                        updateShotBackground(advancedShotIndex, {
                          backgroundImageUrl: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}
              </section>

              <section className="settings-section">
                <h4>特效</h4>
                <div className="two-field-row">
                  <label className="settings-field">
                    <span>画面特效</span>
                    <select
                      value={activeShot.advancedSettings?.effect ?? "none"}
                      onChange={(event) =>
                        updateShotEffect(
                          advancedShotIndex,
                          event.target
                            .value as NonNullable<
                            StoryboardShot["advancedSettings"]
                          >["effect"],
                        )
                      }
                    >
                      {effectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>
                      强度 {Math.round((activeShot.advancedSettings?.intensity ?? 0.55) * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={activeShot.advancedSettings?.intensity ?? 0.55}
                      onChange={(event) =>
                        updateShotAdvancedSettings(advancedShotIndex, {
                          intensity: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              {activeSlot ? (
                <section className="settings-section">
                  <h4>高级模板</h4>
                  <div className="two-field-row">
                    <label className="settings-field">
                      <span>高级镜头</span>
                      <select
                        value={activeSlot.sceneType}
                        onChange={(event) =>
                          updateAdvancedSlot(advancedShotIndex, {
                            sceneType: event.target.value as SceneType,
                          })
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
                      <span>高级入场</span>
                      <select
                        value={activeSlot.motion.entrance}
                        onChange={(event) =>
                          updateAdvancedSlot(advancedShotIndex, {
                            motion: {
                              ...activeSlot.motion,
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
                          checked={activeSlot.motion.emphasis.includes(emphasis)}
                          onChange={() =>
                            toggleAdvancedEmphasis(advancedShotIndex, emphasis)
                          }
                        />
                        <span>{emphasisLabels[emphasis]}</span>
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
};
