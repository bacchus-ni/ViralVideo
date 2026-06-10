"use client";

import type { StyleOptions } from "@/lib/schemas";
import { fontOptions } from "@/lib/style-presets";
import { ColorField, RangeField } from "./SettingControls";

type TypographySettingsPanelProps = {
  value?: StyleOptions;
  onChange?: (patch: Partial<StyleOptions>) => void;
  textColor?: string;
  accentColor?: string;
  fallbackTextColor?: string;
  fallbackAccentColor?: string;
  onTextColorChange?: (value: string) => void;
  onAccentColorChange?: (value: string) => void;
  showTitle?: boolean;
  showFontControls?: boolean;
  showColorControls?: boolean;
};

export const TypographySettingsPanel: React.FC<TypographySettingsPanelProps> = ({
  value,
  onChange,
  textColor,
  accentColor,
  fallbackTextColor = "#ffffff",
  fallbackAccentColor = "#3aad7b",
  onTextColorChange,
  onAccentColorChange,
  showTitle = true,
  showFontControls = true,
  showColorControls = false,
}) => (
  <>
    {showTitle ? <h4>文字</h4> : null}

    {showFontControls && value && onChange ? (
      <>
        <div className="option-grid">
          {fontOptions.map((font) => (
            <button
              key={font.value}
              type="button"
              className={`option-card ${value.fontFamily === font.value ? "is-active" : ""}`}
              onClick={() => onChange({ fontFamily: font.value })}
            >
              {font.label}
            </button>
          ))}
        </div>
        <RangeField
          label={`整体大小 ${value.fontSize}px`}
          min={72}
          max={260}
          value={value.fontSize}
          onChange={(fontSize) => onChange({ fontSize })}
        />
        <RangeField
          label={`字重 ${value.fontWeight}`}
          min={300}
          max={1000}
          step={50}
          value={value.fontWeight}
          onChange={(fontWeight) => onChange({ fontWeight })}
        />
      </>
    ) : null}

    {showColorControls ? (
      <div className="two-field-row">
        <ColorField
          label="文字色"
          value={textColor ?? fallbackTextColor}
          onChange={(color) => onTextColorChange?.(color)}
        />
        <ColorField
          label="强调色"
          value={accentColor ?? fallbackAccentColor}
          onChange={(color) => onAccentColorChange?.(color)}
        />
      </div>
    ) : null}
  </>
);
