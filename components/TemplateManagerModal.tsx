"use client";

import { Image, Music, Sparkles, Upload, X } from "lucide-react";
import { useState } from "react";
import type { StyleOptions } from "@/lib/schemas";
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
  };
  error?: string;
};

const templateStorageId = () => `custom-template-${Date.now()}`;

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState<string>();

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
      setMessage("已根据视频生成模板草稿，可继续微调后保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "解析视频失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveTemplate = () => {
    onCreate({
      id: templateStorageId(),
      name: name.trim() || "我的模板",
      description: description.trim() || "自定义模板",
      thumbnail: "minimal",
      defaultStyle: style,
      promptHint: promptHint.trim() || "按自定义模板生成纯文本混剪。",
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
            {message ? <p className="manager-message">{message}</p> : null}
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
