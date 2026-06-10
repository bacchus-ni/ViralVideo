"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw, Sparkles } from "lucide-react";

const examples = [
  "励志主题，抖音，15秒，激励向",
  "情感治愈，小红书，20秒，温暖",
  "知识科普，视频号，30秒，清晰",
];

const generationSteps = [
  { max: 24, label: "正在理解主题、平台和语气要求" },
  { max: 46, label: "正在组织一段完整、连贯的文案" },
  { max: 68, label: "正在把文案拆分成适合视频呈现的短句" },
  { max: 86, label: "正在匹配当前模板的节奏和分镜" },
  { max: 100, label: "正在整理可编辑的文案与分镜结果" },
];

type PromptComposerProps = {
  value: string;
  isGenerating: boolean;
  onChange: (value: string) => void;
  onGenerate: () => void;
};

export const PromptComposer: React.FC<PromptComposerProps> = ({
  value,
  isGenerating,
  onChange,
  onGenerate,
}) => {
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationProgress(0);
      return;
    }

    setGenerationProgress(8);
    const progressTimer = window.setInterval(() => {
      setGenerationProgress((current) => {
        const step = current < 36 ? 7 : current < 72 ? 4 : 1.5;
        return Math.min(92, current + step);
      });
    }, 700);

    return () => window.clearInterval(progressTimer);
  }, [isGenerating]);

  const currentStep =
    generationSteps.find((step) => generationProgress <= step.max)?.label ??
    generationSteps[generationSteps.length - 1].label;
  const visibleProgress = Math.max(6, Math.round(generationProgress));

  return (
    <section className="panel prompt-panel" aria-labelledby="prompt-title">
      <div className="panel-title-row">
        <span className="panel-icon" title="AI 助手">
          <Bot size={20} aria-hidden />
        </span>
        <h2 id="prompt-title">描述需求</h2>
      </div>

      <label className="prompt-box">
        <textarea
          value={value}
          maxLength={200}
          onChange={(event) => onChange(event.target.value)}
          placeholder="描述你想做的视频，比如主题、平台、时长、语气"
        />
        <span>{value.length}/200</span>
      </label>

      <div className="prompt-actions">
        <div className="prompt-examples">
          <span>试试这样写：</span>
          {examples.slice(0, 2).map((example) => (
            <button key={example} type="button" onClick={() => onChange(example)}>
              {example}
            </button>
          ))}
          <button
            className="refresh-example"
            type="button"
            onClick={() => onChange(examples[Math.floor(Math.random() * examples.length)])}
          >
            <RefreshCw size={15} aria-hidden />
            换一换
          </button>
        </div>
        <button
          className="generate-button"
          disabled={isGenerating || value.trim().length < 2}
          onClick={onGenerate}
          type="button"
        >
          <Sparkles size={18} aria-hidden />
          {isGenerating ? "生成中" : "让AI生成"}
        </button>
      </div>

      {isGenerating ? (
        <div className="analysis-progress prompt-generation-progress" role="status" aria-live="polite">
          <div className="analysis-progress-header">
            <span>{currentStep}</span>
            <strong>{visibleProgress}%</strong>
          </div>
          <div className="analysis-progress-track" aria-hidden>
            <span style={{ width: `${visibleProgress}%` }} />
          </div>
          <p>AI 会先生成完整文案，再拆分成分镜短句。通常需要 10-30 秒，请稍等。</p>
        </div>
      ) : null}
    </section>
  );
};
