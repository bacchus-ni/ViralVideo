"use client";

import { Clipboard, ListVideo, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  advancedMotionEntrances,
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
  const scriptText = useMemo(
    () => plan.script.map((line) => line.text).join("\n"),
    [plan.script],
  );

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
                  <label>
                    <input
                      type="number"
                      min={0.3}
                      max={10}
                      step={0.1}
                      value={shot.durationSec}
                      onChange={(event) =>
                        updateStoryboardShot(index, {
                          durationSec: Number(event.target.value) || 0.3,
                        })
                      }
                    />
                    秒
                  </label>
                  <select
                    value={shot.animation}
                    onChange={(event) =>
                      updateStoryboardShot(index, {
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
                </div>
                {plan.advancedTemplate?.slots[index] ? (
                  <div className="advanced-slot-row">
                    <label>
                      <span>高级镜头</span>
                      <select
                        value={plan.advancedTemplate.slots[index].sceneType}
                        onChange={(event) =>
                          updateAdvancedSlot(index, {
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
                    <label>
                      <span>入场方式</span>
                      <select
                        value={plan.advancedTemplate.slots[index].motion.entrance}
                        onChange={(event) =>
                          updateAdvancedSlot(index, {
                            motion: {
                              ...plan.advancedTemplate!.slots[index].motion,
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
                ) : null}
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
    </section>
  );
};
