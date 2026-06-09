"use client";

import { Bot, RefreshCw, Sparkles } from "lucide-react";

const examples = [
  "励志主题，抖音，15秒，激励向",
  "情感治愈，小红书，20秒，温暖",
  "知识科普，视频号，30秒，清晰",
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
    </section>
  );
};
