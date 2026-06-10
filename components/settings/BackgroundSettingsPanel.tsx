"use client";

import { Image, Sparkles } from "lucide-react";
import { useState } from "react";
import type { StoryboardShot, StyleOptions } from "@/lib/schemas";
import { backgroundOptions } from "@/lib/style-presets";
import { ColorField, ProgressBlock, UploadDropzone } from "./SettingControls";
import { readFileAsDataUrl } from "./settings-utils";

type ShotBackgroundSettings = NonNullable<StoryboardShot["advancedSettings"]>;

type BackgroundSettingsPanelProps =
  | {
      mode: "style";
      value: StyleOptions;
      onChange: (patch: Partial<StyleOptions>) => void;
      allowAi?: boolean;
      showTitle?: boolean;
    }
  | {
      mode: "shot";
      colors: StyleOptions["colors"];
      styleForGeneration?: StyleOptions;
      value: Partial<ShotBackgroundSettings>;
      onChange: (patch: Partial<ShotBackgroundSettings>) => void;
      allowAi?: boolean;
      showTitle?: boolean;
    };

const shotBackgroundOptions: Array<{
  label: string;
  value: ShotBackgroundSettings["backgroundType"];
}> = [
  { label: "跟随全局", value: "inherit" },
  { label: "纯色", value: "solid" },
  { label: "渐变", value: "gradient" },
  { label: "粒子", value: "particles" },
  { label: "图片", value: "image" },
];

export const BackgroundSettingsPanel: React.FC<BackgroundSettingsPanelProps> = (
  props,
) => {
  const [backgroundPrompt, setBackgroundPrompt] = useState(
    "黑色电影感空间，金色粒子光影，中央留白，适合叠加大字标题",
  );
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string>();

  const generatedImageUrl =
    props.mode === "style"
      ? props.value.backgroundImageUrl
      : props.value.backgroundImageUrl;
  const styleForGeneration =
    props.mode === "style" ? props.value : props.styleForGeneration;

  const uploadBackground = async (file: File | undefined) => {
    if (!file) return;
    const imageUrl = await readFileAsDataUrl(file);
    if (props.mode === "style") {
      props.onChange({ backgroundStyle: "image", backgroundImageUrl: imageUrl });
      return;
    }
    props.onChange({ backgroundType: "image", backgroundImageUrl: imageUrl });
  };

  const generateBackground = async () => {
    const prompt = backgroundPrompt.trim();
    if (!prompt || !styleForGeneration) return;

    setIsGeneratingBackground(true);
    setBackgroundError(undefined);
    try {
      const response = await fetch("/api/generate-background-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: styleForGeneration,
        }),
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };

      if (!response.ok || payload.error || !payload.imageUrl) {
        throw new Error(payload.error || "生成背景失败，请稍后重试。");
      }

      if (props.mode === "style") {
        props.onChange({
          backgroundStyle: "image",
          backgroundImageUrl: payload.imageUrl,
        });
      } else {
        props.onChange({
          backgroundType: "image",
          backgroundImageUrl: payload.imageUrl,
        });
      }
    } catch (caught) {
      setBackgroundError(
        caught instanceof Error ? caught.message : "生成背景失败，请稍后重试。",
      );
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  return (
    <>
      {props.showTitle ? <h4>背景</h4> : null}

      {props.mode === "style" ? (
        <div className="option-grid">
          {backgroundOptions.map((background) => (
            <button
              key={background.value}
              type="button"
              className={`option-card ${
                props.value.backgroundStyle === background.value &&
                !props.value.backgroundImageUrl
                  ? "is-active"
                  : ""
              }`}
              onClick={() =>
                props.onChange({
                  backgroundStyle: background.value,
                  backgroundImageUrl: undefined,
                })
              }
            >
              {background.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="two-field-row">
          <label className="settings-field">
            <span>背景类型</span>
            <select
              value={props.value.backgroundType ?? "inherit"}
              onChange={(event) =>
                props.onChange({
                  backgroundType: event.target.value as ShotBackgroundSettings["backgroundType"],
                })
              }
            >
              {shotBackgroundOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ColorField
            label="背景色"
            value={props.value.backgroundColor ?? props.colors.background}
            onChange={(color) => props.onChange({ backgroundColor: color })}
          />
        </div>
      )}

      {props.allowAi ? (
        <section className="ai-background-panel">
          <div className="ai-background-heading">
            <span className="music-card-icon">
              <Sparkles size={18} aria-hidden />
            </span>
            <div>
              <strong>AI 生成背景图片</strong>
              <small>调用千问文生图，自动生成无文字背景并应用到预览。</small>
            </div>
          </div>
          <label className="settings-field">
            <span>背景描述</span>
            <textarea
              className="ai-background-textarea"
              value={backgroundPrompt}
              maxLength={800}
              placeholder="例如：黑金粒子光影、中央留白、电影感、适合励志金句"
              onChange={(event) => setBackgroundPrompt(event.target.value)}
            />
          </label>
          <div className="ai-background-actions">
            <button
              type="button"
              className="primary-inline-action"
              disabled={
                isGeneratingBackground ||
                !backgroundPrompt.trim() ||
                !styleForGeneration
              }
              onClick={generateBackground}
            >
              <Sparkles size={18} aria-hidden />
              {isGeneratingBackground ? "正在生成..." : "生成背景"}
            </button>
            {generatedImageUrl?.startsWith("/generated-backgrounds/") ? (
              <img
                className="generated-background-preview"
                src={generatedImageUrl}
                alt="AI生成背景预览"
              />
            ) : null}
          </div>
          {isGeneratingBackground ? (
            <ProgressBlock
              compact
              title="千问正在生成背景"
              value={72}
              rightLabel="约 10-30 秒"
              description="生成后会保存到本地并自动作为背景。"
            />
          ) : null}
          {backgroundError ? (
            <p className="error-note inline-error">{backgroundError}</p>
          ) : null}
        </section>
      ) : null}

      {props.mode === "shot" &&
      (props.value.backgroundType ?? "inherit") === "image" ? (
        <label className="settings-field">
          <span>背景图片地址</span>
          <input
            value={props.value.backgroundImageUrl ?? ""}
            placeholder="/generated-backgrounds/example.png 或 data:image/..."
            onChange={(event) =>
              props.onChange({ backgroundImageUrl: event.target.value })
            }
          />
        </label>
      ) : null}

      <UploadDropzone
        icon={<Image size={props.mode === "style" ? 24 : 20} aria-hidden />}
        label={props.mode === "style" ? "上传图片作为背景" : "上传图片"}
        accept="image/*"
        compact={props.mode === "shot"}
        onUpload={uploadBackground}
      />

      {generatedImageUrl ? (
        <button
          type="button"
          className="secondary-action"
          onClick={() =>
            props.mode === "style"
              ? props.onChange({ backgroundImageUrl: undefined })
              : props.onChange({ backgroundImageUrl: undefined })
          }
        >
          移除上传背景
        </button>
      ) : null}
    </>
  );
};
