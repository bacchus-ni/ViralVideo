"use client";

import { Clipboard, ListVideo, Settings2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type StoryboardShot,
  type TemplateSlot,
  type VideoPlan,
} from "@/lib/schemas";
import { getTemplateDuration, reflowTemplateSlots } from "@/lib/advanced-template";
import { BackgroundSettingsPanel } from "./settings/BackgroundSettingsPanel";
import {
  MotionSettingsPanel,
  animationOptions,
} from "./settings/MotionSettingsPanel";
import { SettingsModal } from "./settings/SettingsModal";
import { TypographySettingsPanel } from "./settings/TypographySettingsPanel";

type GeneratedPlanCardProps = {
  plan: VideoPlan;
  sourceLabel?: string;
  warning?: string;
  onChange: (plan: VideoPlan) => void;
};

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
    const slot = plan.advancedTemplate?.slots[index];
    if (!slot) return;
    const backgroundPatch: Partial<TemplateSlot["background"]> = {};
    if (patch.backgroundType !== undefined) {
      backgroundPatch.type =
        patch.backgroundType === "inherit" ? "transparent" : patch.backgroundType;
    }
    if ("backgroundColor" in patch) {
      backgroundPatch.color = patch.backgroundColor;
    }
    if ("accentColor" in patch) {
      backgroundPatch.accentColor = patch.accentColor;
    }
    if ("backgroundImageUrl" in patch) {
      backgroundPatch.imageUrl = patch.backgroundImageUrl;
    }
    updateAdvancedSlot(index, {
      background: {
        ...slot.background,
        ...backgroundPatch,
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
        <SettingsModal
          title={`镜头${advancedShotIndex + 1}高级设置`}
          ariaLabel={`镜头${advancedShotIndex + 1}高级设置`}
          className="storyboard-settings-modal"
          contentClassName="storyboard-settings-content"
          onClose={() => setAdvancedShotIndex(null)}
        >
          <section className="settings-section no-top-border">
            <TypographySettingsPanel
              showTitle
              showFontControls={false}
              showColorControls
              textColor={activeShot.advancedSettings?.textColor}
              accentColor={activeShot.advancedSettings?.accentColor}
              fallbackTextColor={plan.style.colors.primary}
              fallbackAccentColor={plan.style.colors.accent}
              onTextColorChange={(textColor) => {
                updateShotAdvancedSettings(advancedShotIndex, { textColor });
                if (activeSlot) {
                  updateAdvancedSlot(advancedShotIndex, { textColor });
                }
              }}
              onAccentColorChange={(accentColor) =>
                updateShotBackground(advancedShotIndex, { accentColor })
              }
            />
          </section>

          <MotionSettingsPanel
            shot={activeShot}
            slot={activeSlot}
            onShotChange={(patch) => updateStoryboardShot(advancedShotIndex, patch)}
            onAdvancedSettingsChange={(patch) =>
              updateShotAdvancedSettings(advancedShotIndex, patch)
            }
            onEffectChange={(effect) => updateShotEffect(advancedShotIndex, effect)}
            onSlotChange={(patch) => updateAdvancedSlot(advancedShotIndex, patch)}
            onToggleEmphasis={(emphasis) =>
              toggleAdvancedEmphasis(advancedShotIndex, emphasis)
            }
          />

          <section className="settings-section">
            <BackgroundSettingsPanel
              mode="shot"
              value={activeShot.advancedSettings ?? {}}
              colors={plan.style.colors}
              styleForGeneration={plan.style}
              onChange={(patch) => updateShotBackground(advancedShotIndex, patch)}
              allowAi
              showTitle
            />
          </section>
        </SettingsModal>
      ) : null}
    </section>
  );
};
