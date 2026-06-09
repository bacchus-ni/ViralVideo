"use client";

import { Clipboard, ListVideo, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { StoryboardShot, VideoPlan } from "@/lib/schemas";

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

const recalculateTiming = (plan: VideoPlan): VideoPlan => {
  let cursor = 0;
  const storyboard = plan.storyboard.map((shot, index) => {
    const durationSec = Math.max(0.8, Math.min(8, shot.durationSec));
    const nextShot = {
      ...shot,
      id: shot.id || `shot-${index + 1}`,
      startSec: Number(cursor.toFixed(2)),
      durationSec: Number(durationSec.toFixed(2)),
    };
    cursor += durationSec;
    return nextShot;
  });

  return {
    ...plan,
    durationSec: Number(Math.max(10, Math.min(45, cursor)).toFixed(2)),
    storyboard,
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
      .slice(0, 12);
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
                      min={0.8}
                      max={8}
                      step={0.1}
                      value={shot.durationSec}
                      onChange={(event) =>
                        updateStoryboardShot(index, {
                          durationSec: Number(event.target.value) || 0.8,
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
