"use client";

import { Image, Music, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdvancedTemplateSpec, StyleOptions } from "@/lib/schemas";
import {
  backgroundOptions,
  fontOptions,
  palettePresets,
  type PalettePreset,
} from "@/lib/style-presets";
import type { TemplatePreset } from "@/lib/templates";

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
  };
  error?: string;
};

const templateStorageId = () => `custom-template-${Date.now()}`;
const analyzeSteps = [
  "读取 demo 视频",
  "上传给千问多模态模型",
  "识别镜头、转场和文字动画",
  "整理 Remotion 高级模板结构",
];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("文件读取失败"));
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStepIndex, setAnalyzeStepIndex] = useState(0);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!isAnalyzing) return undefined;
    setAnalyzeProgress((current) => Math.max(current, 8));
    const timer = window.setInterval(() => {
      setAnalyzeProgress((current) => {
        const next = Math.min(92, current + (current < 45 ? 8 : current < 76 ? 4 : 1.6));
        setAnalyzeStepIndex(
          next < 28 ? 0 : next < 55 ? 1 : next < 82 ? 2 : 3,
        );
        return next;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  if (!open) return null;

  const updateStyle = (patch: Partial<StyleOptions>) => {
    setStyle((current) => ({
      ...current,
      ...patch,
      colors: {
        ...current.colors,
        ...(patch.colors ?? {}),
      },
    }));
  };

  const choosePalette = (palette: PalettePreset) => {
    updateStyle({
      palette: palette.id as StyleOptions["palette"],
      colors: palette.colors,
    });
  };

  const uploadBackground = async (file: File | undefined) => {
    if (!file) return;
    updateStyle({
      backgroundStyle: "image",
      backgroundImageUrl: await readFileAsDataUrl(file),
    });
  };

  const uploadMusic = async (file: File | undefined) => {
    if (!file) return;
    updateStyle({
      musicUrl: await readFileAsDataUrl(file),
      musicVolume: style.musicVolume || 0.2,
    });
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

      setName(payload.template.name || name);
      setDescription(payload.template.description || description);
      setPromptHint(payload.template.promptHint || promptHint);
      updateStyle(payload.template.style ?? {});
      setAdvancedTemplate(payload.template.advancedTemplate);
      setAdvancedSummary(payload.template.advancedSummary);
      setAnalyzeProgress(100);
      setAnalyzeStepIndex(3);
      setMessage("已根据视频生成模板草稿，可继续微调后保存。");
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
    <div className="settings-backdrop" role="presentation" onClick={onClose}>
      <section
        className="settings-modal template-manager-modal"
        role="dialog"
        aria-modal="true"
        aria-label="模板管理"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <h3>模板管理</h3>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="settings-content">
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

          <div className="settings-section">
            <h4>从视频解析模板</h4>
            <label className="upload-dropzone">
              <Upload size={24} aria-hidden />
              {isAnalyzing ? "解析中..." : "上传 demo 视频并用千问解析"}
              <input
                type="file"
                accept="video/*"
                disabled={isAnalyzing}
                onChange={(event) => analyzeVideo(event.target.files?.[0])}
              />
            </label>
            {isAnalyzing ? (
              <div className="analysis-progress" role="status" aria-live="polite">
                <div className="analysis-progress-header">
                  <span>{analyzeSteps[analyzeStepIndex]}</span>
                  <strong>{Math.round(analyzeProgress)}%</strong>
                </div>
                <div className="analysis-progress-track">
                  <span style={{ width: `${Math.max(6, analyzeProgress)}%` }} />
                </div>
                <p>千问正在拆解视频节奏、镜头类型、文字动画和模板槽位。</p>
              </div>
            ) : null}
            {message ? <p className="manager-message">{message}</p> : null}
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
          </div>

          <div className="settings-section">
            <h4>配色</h4>
            <div className="palette-grid">
              {palettePresets.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  className="palette-card"
                  onClick={() => choosePalette(palette)}
                >
                  <span className="palette-swatches">
                    {Object.values(palette.colors).map((color) => (
                      <i key={color} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <strong>{palette.name}</strong>
                  <small>{palette.description}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="template-manager-grid">
            <label className="settings-field">
              <span>字体</span>
              <select
                value={style.fontFamily}
                onChange={(event) =>
                  updateStyle({ fontFamily: event.target.value as StyleOptions["fontFamily"] })
                }
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-field">
              <span>背景</span>
              <select
                value={style.backgroundStyle}
                onChange={(event) =>
                  updateStyle({
                    backgroundStyle: event.target.value as StyleOptions["backgroundStyle"],
                  })
                }
              >
                {backgroundOptions.map((background) => (
                  <option key={background.value} value={background.value}>
                    {background.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="template-manager-grid">
            <label className="upload-dropzone compact-upload">
              <Image size={20} aria-hidden />
              上传背景
              <input type="file" accept="image/*" onChange={(event) => uploadBackground(event.target.files?.[0])} />
            </label>
            <label className="upload-dropzone compact-upload">
              <Music size={20} aria-hidden />
              上传音乐
              <input type="file" accept="audio/*" onChange={(event) => uploadMusic(event.target.files?.[0])} />
            </label>
          </div>

          <label className="settings-field">
            <span>音乐音量 {Math.round(style.musicVolume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={style.musicVolume}
              onChange={(event) => updateStyle({ musicVolume: Number(event.target.value) })}
            />
          </label>

          <button type="button" className="primary-modal-action" onClick={saveTemplate}>
            <Sparkles size={18} aria-hidden />
            保存为新模板
          </button>
        </div>
      </section>
    </div>
  );
};
