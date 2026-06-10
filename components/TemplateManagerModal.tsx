"use client";

import { Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdvancedTemplateSpec, StyleOptions } from "@/lib/schemas";
import type { TemplatePreset } from "@/lib/templates";
import { BackgroundSettingsPanel } from "./settings/BackgroundSettingsPanel";
import { ColorSettingsPanel } from "./settings/ColorSettingsPanel";
import { MusicSettingsPanel } from "./settings/MusicSettingsPanel";
import { ProgressBlock, UploadDropzone } from "./settings/SettingControls";
import { SettingsModal } from "./settings/SettingsModal";
import { TypographySettingsPanel } from "./settings/TypographySettingsPanel";
import { mergeStylePatch } from "./settings/settings-utils";

type TemplateManagerModalProps = {
  open: boolean;
  baseStyle: StyleOptions;
  onClose: () => void;
  onCreate: (template: TemplatePreset) => void;
};

type AnalyzeResponse = {
  template?: {
    name?: string;
    description?: string;
    promptHint?: string;
    style?: Partial<StyleOptions>;
    advancedTemplate?: AdvancedTemplateSpec;
    advancedSummary?: string;
    extractedAudioUrl?: string;
  };
  error?: string;
};

const templateStorageId = () => `custom-template-${Date.now()}`;
const analyzeSteps = [
  "读取 demo 视频",
  "抽取 demo 原音频",
  "上传给千问多模态模型",
  "识别镜头、转场和文字动画",
  "整理 Remotion 高级模板结构",
];

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  open,
  baseStyle,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState("我的模板");
  const [description, setDescription] = useState("适合自定义文字混剪");
  const [promptHint, setPromptHint] = useState("按上传样例的节奏生成文字分镜。");
  const [style, setStyle] = useState<StyleOptions>(baseStyle);
  const [advancedTemplate, setAdvancedTemplate] = useState<AdvancedTemplateSpec>();
  const [advancedSummary, setAdvancedSummary] = useState<string>();
  const [extractedAudioUrl, setExtractedAudioUrl] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStepIndex, setAnalyzeStepIndex] = useState(0);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (open) setStyle(baseStyle);
  }, [baseStyle, open]);

  useEffect(() => {
    if (!isAnalyzing) return undefined;
    setAnalyzeProgress((current) => Math.max(current, 8));
    const timer = window.setInterval(() => {
      setAnalyzeProgress((current) => {
        const next = Math.min(92, current + (current < 45 ? 8 : current < 76 ? 4 : 1.6));
        setAnalyzeStepIndex(
          next < 18 ? 0 : next < 38 ? 1 : next < 62 ? 2 : next < 84 ? 3 : 4,
        );
        return next;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  if (!open) return null;

  const updateStyle = (patch: Partial<StyleOptions>) => {
    setStyle((current) => mergeStylePatch(current, patch));
  };

  const analyzeVideo = async (file: File | undefined) => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalyzeProgress(6);
    setAnalyzeStepIndex(0);
    setMessage(undefined);

    try {
      const form = new FormData();
      form.append("video", file);
      form.append("baseStyle", JSON.stringify(style));
      const response = await fetch("/api/analyze-template-video", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as AnalyzeResponse;
      if (!response.ok || payload.error || !payload.template) {
        throw new Error(payload.error || "解析视频失败");
      }

      const audioPatch = payload.template.extractedAudioUrl
        ? {
            musicUrl: payload.template.extractedAudioUrl,
            musicVolume: payload.template.style?.musicVolume ?? style.musicVolume ?? 0.2,
          }
        : {};

      setName(payload.template.name || name);
      setDescription(payload.template.description || description);
      setPromptHint(payload.template.promptHint || promptHint);
      updateStyle({
        ...(payload.template.style ?? {}),
        ...audioPatch,
      });
      setAdvancedTemplate(payload.template.advancedTemplate);
      setAdvancedSummary(payload.template.advancedSummary);
      setExtractedAudioUrl(payload.template.extractedAudioUrl);
      setAnalyzeProgress(100);
      setAnalyzeStepIndex(4);
      setMessage(
        payload.template.extractedAudioUrl
          ? "已根据视频生成模板草稿，并自动提取 demo 音频作为默认背景音乐。"
          : "已根据视频生成模板草稿，可继续微调后保存。",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "解析视频失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveTemplate = () => {
    const id = templateStorageId();
    const savedAdvancedTemplate: AdvancedTemplateSpec | undefined = advancedTemplate
      ? {
          ...advancedTemplate,
          id: `${id}-advanced`,
          name: name.trim() || advancedTemplate.name,
          description: description.trim() || advancedTemplate.description,
          source:
            advancedTemplate.source === "qwen-video"
              ? ("qwen-video" as const)
              : ("user" as const),
          aspectRatio: style.aspectRatio,
          style: {
            ...(advancedTemplate.style ?? {}),
            palette: style.palette,
            colors: style.colors,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            backgroundStyle: style.backgroundStyle,
          },
          audio: style.musicUrl
            ? {
                url: style.musicUrl,
                volume: style.musicVolume,
                loop: true,
              }
            : advancedTemplate.audio,
        }
      : undefined;

    onCreate({
      id,
      name: name.trim() || "我的模板",
      description: description.trim() || "自定义模板",
      thumbnail: "minimal",
      defaultStyle: style,
      promptHint: promptHint.trim() || "按自定义模板生成纯文本混剪。",
      advancedTemplate: savedAdvancedTemplate,
    });
    onClose();
  };

  return (
    <SettingsModal
      title="模板管理"
      ariaLabel="模板管理"
      className="template-manager-modal"
      headerAction={
        <button type="button" className="primary-modal-action" onClick={saveTemplate}>
          <Sparkles size={18} aria-hidden />
          保存为新模板
        </button>
      }
      onClose={onClose}
    >
      <div className="template-manager-grid">
        <label className="settings-field">
          <span>模板名称</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="settings-field">
          <span>模板说明</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      <label className="settings-field">
        <span>生成提示</span>
        <textarea
          className="manager-textarea"
          value={promptHint}
          onChange={(event) => setPromptHint(event.target.value)}
        />
      </label>

      <section className="settings-section">
        <h4>从视频解析模板</h4>
        <UploadDropzone
          icon={<Upload size={24} aria-hidden />}
          label={isAnalyzing ? "解析中..." : "上传 demo 视频并用千问解析"}
          accept="video/*"
          disabled={isAnalyzing}
          onUpload={analyzeVideo}
        />
        {isAnalyzing ? (
          <ProgressBlock
            title={analyzeSteps[analyzeStepIndex]}
            value={analyzeProgress}
            description="千问正在拆解视频节奏、镜头类型、文字动画和模板槽位。"
          />
        ) : null}
        {message ? <p className="manager-message">{message}</p> : null}
        {extractedAudioUrl ? (
          <p className="manager-audio-note">
            demo 原音频已保存为该模板的默认背景音乐。
          </p>
        ) : null}
        {advancedTemplate ? (
          <div className="advanced-structure-summary">
            <strong>已解析高级结构</strong>
            <span>
              {advancedTemplate.slots.length} 个镜头 · {advancedTemplate.durationSec}s ·{" "}
              {advancedTemplate.aspectRatio}
            </span>
            {advancedSummary ? <p>{advancedSummary.split("\n").slice(0, 4).join(" / ")}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="settings-section">
        <ColorSettingsPanel value={style} onChange={updateStyle} showTitle />
      </section>

      <section className="settings-section">
        <TypographySettingsPanel value={style} onChange={updateStyle} />
      </section>

      <section className="settings-section">
        <BackgroundSettingsPanel
          mode="style"
          value={style}
          onChange={updateStyle}
          allowAi
          showTitle
        />
      </section>

      <section className="settings-section">
        <MusicSettingsPanel
          value={style}
          onChange={updateStyle}
          showTitle
          compactUpload
        />
      </section>

    </SettingsModal>
  );
};
