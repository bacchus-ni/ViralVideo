"use client";

import {
  ChevronDown,
  Image,
  Music,
  Palette,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StyleOptions } from "@/lib/schemas";
import {
  aspectRatioOptions,
  backgroundOptions,
  fontOptions,
  musicOptions,
  palettePresets,
  resolutionOptions,
  type PalettePreset,
} from "@/lib/style-presets";

type StyleBarProps = {
  value: StyleOptions;
  onChange: (value: StyleOptions) => void;
};

type Panel = "appearance" | "music" | "background" | "ratio" | null;

const storageKey = "textMixCustomPalettes";

const readCustomPalettes = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PalettePreset[]) : [];
  } catch {
    return [];
  }
};

const writeCustomPalettes = (palettes: PalettePreset[]) => {
  window.localStorage.setItem(storageKey, JSON.stringify(palettes));
};

const colorFields: Array<{
  key: keyof StyleOptions["colors"];
  label: string;
}> = [
  { key: "background", label: "背景" },
  { key: "surface", label: "层次" },
  { key: "primary", label: "主文字" },
  { key: "accent", label: "强调色" },
  { key: "muted", label: "辅助色" },
];

const summary = {
  appearance: (style: StyleOptions) => {
    const palette =
      style.palette === "custom"
        ? "自定义"
        : palettePresets.find((preset) => preset.id === style.palette)?.name ?? "配色";
    const font = fontOptions.find((item) => item.value === style.fontFamily)?.label ?? "字体";
    return `${palette} · ${font}`;
  },
  music: (style: StyleOptions) => {
    if (!style.musicUrl) return "未选择";
    if (style.musicUrl.startsWith("data:")) return "上传音乐";
    return musicOptions.find((music) => music.url === style.musicUrl)?.label ?? "自定义音乐";
  },
  background: (style: StyleOptions) =>
    style.backgroundImageUrl
      ? style.backgroundImageUrl.startsWith("/generated-backgrounds/")
        ? "AI生成图片"
        : "上传图片"
      : backgroundOptions.find((bg) => bg.value === style.backgroundStyle)?.label ?? "背景",
  ratio: (style: StyleOptions) =>
    `${style.aspectRatio === "custom" ? `${style.customAspectWidth ?? 9}:${style.customAspectHeight ?? 16}` : style.aspectRatio} · ${style.resolution}`,
};

export const StyleBar: React.FC<StyleBarProps> = ({ value, onChange }) => {
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [customPalettes, setCustomPalettes] = useState<PalettePreset[]>([]);
  const [customName, setCustomName] = useState("我的配色");
  const [backgroundPrompt, setBackgroundPrompt] = useState(
    "黑色电影感空间，金色粒子光影，中央留白，适合叠加大字标题",
  );
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string>();

  useEffect(() => {
    setCustomPalettes(readCustomPalettes());
  }, []);

  const allPalettes = useMemo(
    () => [...palettePresets, ...customPalettes],
    [customPalettes],
  );

  const update = (patch: Partial<StyleOptions>) => {
    onChange({
      ...value,
      ...patch,
      colors: {
        ...value.colors,
        ...(patch.colors ?? {}),
      },
    });
  };

  const choosePalette = (palette: PalettePreset) => {
    update({
      palette: palettePresets.some((preset) => preset.id === palette.id)
        ? (palette.id as StyleOptions["palette"])
        : "custom",
      colors: palette.colors,
    });
  };

  const saveCustomPalette = () => {
    const nextPalette: PalettePreset = {
      id: `custom-${Date.now()}`,
      name: customName.trim() || "我的配色",
      description: "用户自定义",
      colors: value.colors,
    };
    const next = [nextPalette, ...customPalettes].slice(0, 12);
    setCustomPalettes(next);
    writeCustomPalettes(next);
  };

  const uploadBackground = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update({
          backgroundStyle: "image",
          backgroundImageUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadMusic = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update({
          musicUrl: reader.result,
          musicVolume: value.musicVolume || 0.2,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const chooseMusic = (music: (typeof musicOptions)[number]) => {
    update({
      musicUrl: music.url,
      musicVolume: music.volume,
    });
  };

  const generateBackground = async () => {
    const prompt = backgroundPrompt.trim();
    if (!prompt) return;

    setIsGeneratingBackground(true);
    setBackgroundError(undefined);
    try {
      const response = await fetch("/api/generate-background-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: value,
        }),
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };

      if (!response.ok || payload.error || !payload.imageUrl) {
        throw new Error(payload.error || "生成背景失败，请稍后重试。");
      }

      update({
        backgroundStyle: "image",
        backgroundImageUrl: payload.imageUrl,
      });
    } catch (caught) {
      setBackgroundError(caught instanceof Error ? caught.message : "生成背景失败，请稍后重试。");
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  return (
    <>
      <section className="style-bar" aria-label="可选风格设置">
        <button className="style-control" type="button" onClick={() => setActivePanel("appearance")}>
          <span className="style-control-label">
            <Palette size={22} aria-hidden />
            配色
          </span>
          <span className="style-summary">{summary.appearance(value)}</span>
          <ChevronDown className="select-chevron" size={18} aria-hidden />
        </button>
        <button className="style-control" type="button" onClick={() => setActivePanel("music")}>
          <span className="style-control-label">
            <Music size={22} aria-hidden />
            音乐
          </span>
          <span className="style-summary">{summary.music(value)}</span>
          <ChevronDown className="select-chevron" size={18} aria-hidden />
        </button>
        <button className="style-control" type="button" onClick={() => setActivePanel("background")}>
          <span className="style-control-label">
            <Image size={22} aria-hidden />
            背景
          </span>
          <span className="style-summary">{summary.background(value)}</span>
          <ChevronDown className="select-chevron" size={18} aria-hidden />
        </button>
        <button className="style-control" type="button" onClick={() => setActivePanel("ratio")}>
          <span className="style-control-label">
            <SlidersHorizontal size={22} aria-hidden />
            比例
          </span>
          <span className="style-summary">{summary.ratio(value)}</span>
          <ChevronDown className="select-chevron" size={18} aria-hidden />
        </button>
      </section>

      {activePanel ? (
        <div className="settings-backdrop" role="presentation" onClick={() => setActivePanel(null)}>
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="样式设置"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <h3>
                {activePanel === "appearance"
                  ? "配色与字体"
                  : activePanel === "music"
                    ? "音乐"
                    : activePanel === "background"
                      ? "背景"
                      : "比例与分辨率"}
              </h3>
              <button type="button" className="icon-button" onClick={() => setActivePanel(null)}>
                <X size={18} aria-hidden />
              </button>
            </header>

            {activePanel === "appearance" ? (
              <div className="settings-content">
                <div className="palette-grid">
                  {allPalettes.map((palette) => (
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

                <div className="settings-section">
                  <h4>自定义配色</h4>
                  <label className="settings-field">
                    <span>名称</span>
                    <input value={customName} onChange={(event) => setCustomName(event.target.value)} />
                  </label>
                  <div className="color-editor-grid">
                    {colorFields.map((field) => (
                      <label key={field.key} className="color-field">
                        <span>{field.label}</span>
                        <input
                          type="color"
                          value={value.colors[field.key]}
                          onChange={(event) =>
                            update({
                              palette: "custom",
                              colors: {
                                ...value.colors,
                                [field.key]: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button type="button" className="secondary-action" onClick={saveCustomPalette}>
                    保存到我的配色
                  </button>
                </div>

                <div className="settings-section">
                  <h4>字体</h4>
                  <div className="option-grid">
                    {fontOptions.map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        className={`option-card ${value.fontFamily === font.value ? "is-active" : ""}`}
                        onClick={() => update({ fontFamily: font.value })}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                  <label className="settings-field">
                    <span>整体大小 {value.fontSize}px</span>
                    <input
                      type="range"
                      min={72}
                      max={260}
                      value={value.fontSize}
                      onChange={(event) => update({ fontSize: Number(event.target.value) })}
                    />
                  </label>
                  <label className="settings-field">
                    <span>字重 {value.fontWeight}</span>
                    <input
                      type="range"
                      min={300}
                      max={1000}
                      step={50}
                      value={value.fontWeight}
                      onChange={(event) => update({ fontWeight: Number(event.target.value) })}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {activePanel === "music" ? (
              <div className="settings-content">
                <div className="music-grid">
                  {musicOptions.map((music) => (
                    <button
                      key={music.url}
                      type="button"
                      className={`music-card ${value.musicUrl === music.url ? "is-active" : ""}`}
                      onClick={() => chooseMusic(music)}
                    >
                      <span className="music-card-icon">
                        <Music size={18} aria-hidden />
                      </span>
                      <strong>{music.label}</strong>
                      <small>{music.description}</small>
                    </button>
                  ))}
                </div>
                <label className="upload-dropzone">
                  <Music size={24} aria-hidden />
                  上传音乐作为背景音乐
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => uploadMusic(event.target.files?.[0])}
                  />
                </label>
                <label className="settings-field">
                  <span>音乐音量 {Math.round(value.musicVolume * 100)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={value.musicVolume}
                    onChange={(event) => update({ musicVolume: Number(event.target.value) })}
                  />
                </label>
                {value.musicUrl ? (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => update({ musicUrl: undefined })}
                  >
                    移除背景音乐
                  </button>
                ) : null}
              </div>
            ) : null}

            {activePanel === "background" ? (
              <div className="settings-content">
                <div className="option-grid">
                  {backgroundOptions.map((background) => (
                    <button
                      key={background.value}
                      type="button"
                      className={`option-card ${value.backgroundStyle === background.value && !value.backgroundImageUrl ? "is-active" : ""}`}
                      onClick={() =>
                        update({
                          backgroundStyle: background.value,
                          backgroundImageUrl: undefined,
                        })
                      }
                    >
                      {background.label}
                    </button>
                  ))}
                </div>
                <section className="ai-background-panel">
                  <div className="ai-background-heading">
                    <span className="music-card-icon">
                      <Sparkles size={18} aria-hidden />
                    </span>
                    <div>
                      <strong>AI 生成背景图片</strong>
                      <small>调用千问文生图，自动生成无文字背景并实时应用到预览。</small>
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
                      disabled={isGeneratingBackground || !backgroundPrompt.trim()}
                      onClick={generateBackground}
                    >
                      <Sparkles size={18} aria-hidden />
                      {isGeneratingBackground ? "正在生成..." : "生成背景"}
                    </button>
                    {value.backgroundImageUrl?.startsWith("/generated-backgrounds/") ? (
                      <img
                        className="generated-background-preview"
                        src={value.backgroundImageUrl}
                        alt="AI生成背景预览"
                      />
                    ) : null}
                  </div>
                  {isGeneratingBackground ? (
                    <div className="analysis-progress compact-progress">
                      <div className="analysis-progress-header">
                        <span>千问正在生成背景</span>
                        <span>约 10-30 秒</span>
                      </div>
                      <div className="analysis-progress-track">
                        <span style={{ width: "72%" }} />
                      </div>
                      <p>生成后会保存到本地并自动作为右侧视频背景。</p>
                    </div>
                  ) : null}
                  {backgroundError ? <p className="error-note inline-error">{backgroundError}</p> : null}
                </section>
                <label className="upload-dropzone">
                  <Image size={24} aria-hidden />
                  上传图片作为背景
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadBackground(event.target.files?.[0])}
                  />
                </label>
                {value.backgroundImageUrl ? (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => update({ backgroundImageUrl: undefined })}
                  >
                    移除上传背景
                  </button>
                ) : null}
              </div>
            ) : null}

            {activePanel === "ratio" ? (
              <div className="settings-content">
                <h4>视频比例</h4>
                <div className="option-grid">
                  {aspectRatioOptions.map((ratio) => (
                    <button
                      key={ratio.value}
                      type="button"
                      className={`option-card ${value.aspectRatio === ratio.value ? "is-active" : ""}`}
                      onClick={() => update({ aspectRatio: ratio.value })}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
                {value.aspectRatio === "custom" ? (
                  <div className="two-field-row">
                    <label className="settings-field">
                      <span>宽比例</span>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={value.customAspectWidth ?? 9}
                        onChange={(event) => update({ customAspectWidth: Number(event.target.value) })}
                      />
                    </label>
                    <label className="settings-field">
                      <span>高比例</span>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={value.customAspectHeight ?? 16}
                        onChange={(event) => update({ customAspectHeight: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                ) : null}

                <h4>导出分辨率</h4>
                <div className="option-grid">
                  {resolutionOptions.map((resolution) => (
                    <button
                      key={resolution.value}
                      type="button"
                      className={`option-card ${value.resolution === resolution.value ? "is-active" : ""}`}
                      onClick={() => update({ resolution: resolution.value })}
                    >
                      {resolution.label}
                    </button>
                  ))}
                </div>
                {value.resolution === "custom" ? (
                  <div className="two-field-row">
                    <label className="settings-field">
                      <span>宽度 px</span>
                      <input
                        type="number"
                        min={320}
                        max={4096}
                        value={value.customWidth ?? 1080}
                        onChange={(event) => update({ customWidth: Number(event.target.value) })}
                      />
                    </label>
                    <label className="settings-field">
                      <span>高度 px</span>
                      <input
                        type="number"
                        min={320}
                        max={4096}
                        value={value.customHeight ?? 1920}
                        onChange={(event) => update({ customHeight: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
};
