"use client";

import {
  ChevronDown,
  Image,
  Music,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import type { StyleOptions } from "@/lib/schemas";
import {
  backgroundOptions,
  fontOptions,
  musicOptions,
  palettePresets,
} from "@/lib/style-presets";
import { BackgroundSettingsPanel } from "./settings/BackgroundSettingsPanel";
import { ColorSettingsPanel } from "./settings/ColorSettingsPanel";
import { MusicSettingsPanel } from "./settings/MusicSettingsPanel";
import { RatioSettingsPanel } from "./settings/RatioSettingsPanel";
import { SettingsModal } from "./settings/SettingsModal";
import { TypographySettingsPanel } from "./settings/TypographySettingsPanel";
import { mergeStylePatch } from "./settings/settings-utils";

type StyleBarProps = {
  value: StyleOptions;
  onChange: (value: StyleOptions) => void;
  defaultMusicUrl?: string;
  defaultMusicVolume?: number;
};

type Panel = "appearance" | "music" | "background" | "ratio" | null;

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

const panelTitle = (panel: Exclude<Panel, null>) => {
  if (panel === "appearance") return "配色与字体";
  if (panel === "music") return "音乐";
  if (panel === "background") return "背景";
  return "比例与分辨率";
};

export const StyleBar: React.FC<StyleBarProps> = ({
  value,
  onChange,
  defaultMusicUrl,
  defaultMusicVolume,
}) => {
  const [activePanel, setActivePanel] = useState<Panel>(null);

  const update = (patch: Partial<StyleOptions>) => {
    onChange(mergeStylePatch(value, patch));
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
        <SettingsModal
          title={panelTitle(activePanel)}
          ariaLabel="样式设置"
          onClose={() => setActivePanel(null)}
        >
          {activePanel === "appearance" ? (
            <>
              <ColorSettingsPanel
                value={value}
                onChange={update}
                showTitle
                allowCustomPalettes
              />
              <section className="settings-section">
                <TypographySettingsPanel value={value} onChange={update} />
              </section>
            </>
          ) : null}

          {activePanel === "music" ? (
            <MusicSettingsPanel
              value={value}
              onChange={update}
              defaultMusicUrl={defaultMusicUrl}
              defaultMusicVolume={defaultMusicVolume}
            />
          ) : null}

          {activePanel === "background" ? (
            <BackgroundSettingsPanel
              mode="style"
              value={value}
              onChange={update}
              allowAi
            />
          ) : null}

          {activePanel === "ratio" ? (
            <RatioSettingsPanel value={value} onChange={update} />
          ) : null}
        </SettingsModal>
      ) : null}
    </>
  );
};
