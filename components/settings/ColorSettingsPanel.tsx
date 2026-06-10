"use client";

import { useEffect, useMemo, useState } from "react";
import type { StyleOptions } from "@/lib/schemas";
import { palettePresets, type PalettePreset } from "@/lib/style-presets";
import { ColorField } from "./SettingControls";
import { readCustomPalettes, writeCustomPalettes } from "./settings-utils";

type ColorSettingsPanelProps = {
  value: StyleOptions;
  onChange: (patch: Partial<StyleOptions>) => void;
  showTitle?: boolean;
  allowCustomPalettes?: boolean;
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

export const ColorSettingsPanel: React.FC<ColorSettingsPanelProps> = ({
  value,
  onChange,
  showTitle = false,
  allowCustomPalettes = true,
}) => {
  const [customPalettes, setCustomPalettes] = useState<PalettePreset[]>([]);
  const [customName, setCustomName] = useState("我的配色");

  useEffect(() => {
    if (allowCustomPalettes) setCustomPalettes(readCustomPalettes());
  }, [allowCustomPalettes]);

  const allPalettes = useMemo(
    () => (allowCustomPalettes ? [...palettePresets, ...customPalettes] : palettePresets),
    [allowCustomPalettes, customPalettes],
  );

  const choosePalette = (palette: PalettePreset) => {
    onChange({
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

  return (
    <>
      {showTitle ? <h4>配色</h4> : null}
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

      {allowCustomPalettes ? (
        <div className="settings-section">
          <h4>自定义配色</h4>
          <label className="settings-field">
            <span>名称</span>
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
            />
          </label>
          <div className="color-editor-grid">
            {colorFields.map((field) => (
              <ColorField
                key={field.key}
                label={field.label}
                value={value.colors[field.key]}
                onChange={(color) =>
                  onChange({
                    palette: "custom",
                    colors: {
                      ...value.colors,
                      [field.key]: color,
                    },
                  })
                }
              />
            ))}
          </div>
          <button type="button" className="secondary-action" onClick={saveCustomPalette}>
            保存到我的配色
          </button>
        </div>
      ) : null}
    </>
  );
};
