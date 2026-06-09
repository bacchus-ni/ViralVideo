"use client";

import { ChevronDown, Image, Palette, SlidersHorizontal, Type, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StyleOptions } from "@/lib/schemas";
import {
  aspectRatioOptions,
  backgroundOptions,
  fontOptions,
  palettePresets,
  resolutionOptions,
  type PalettePreset,
} from "@/lib/style-presets";

type StyleBarProps = {
  value: StyleOptions;
  onChange: (value: StyleOptions) => void;
};

type Panel = "palette" | "font" | "background" | "ratio" | null;

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
  palette: (style: StyleOptions) =>
    style.palette === "custom"
      ? "自定义"
      : palettePresets.find((preset) => preset.id === style.palette)?.name ?? "配色",
  font: (style: StyleOptions) =>
    `${fontOptions.find((font) => font.value === style.fontFamily)?.label ?? "字体"} · ${style.fontSize}px`,
  background: (style: StyleOptions) =>
    style.backgroundImageUrl
      ? "上传图片"
      : backgroundOptions.find((bg) => bg.value === style.backgroundStyle)?.label ?? "背景",
  ratio: (style: StyleOptions) =>
    `${style.aspectRatio === "custom" ? `${style.customAspectWidth ?? 9}:${style.customAspectHeight ?? 16}` : style.aspectRatio} · ${style.resolution}`,
};

export const StyleBar: React.FC<StyleBarProps> = ({ value, onChange }) => {
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [customPalettes, setCustomPalettes] = useState<PalettePreset[]>([]);
  const [customName, setCustomName] = useState("我的配色");

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

  return (
    <>
      <section className="style-bar" aria-label="可选风格设置">
        <button className="style-control" type="button" onClick={() => setActivePanel("palette")}>
          <span className="style-control-label">
            <Palette size={22} aria-hidden />
            配色
          </span>
          <span className="style-summary">{summary.palette(value)}</span>
          <ChevronDown className="select-chevron" size={18} aria-hidden />
        </button>
        <button className="style-control" type="button" onClick={() => setActivePanel("font")}>
          <span className="style-control-label">
            <Type size={23} aria-hidden />
            字体
          </span>
          <span className="style-summary">{summary.font(value)}</span>
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
                {activePanel === "palette"
                  ? "配色"
                  : activePanel === "font"
                    ? "字体"
                    : activePanel === "background"
                      ? "背景"
                      : "比例与分辨率"}
              </h3>
              <button type="button" className="icon-button" onClick={() => setActivePanel(null)}>
                <X size={18} aria-hidden />
              </button>
            </header>

            {activePanel === "palette" ? (
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
              </div>
            ) : null}

            {activePanel === "font" ? (
              <div className="settings-content">
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
