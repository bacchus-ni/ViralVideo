"use client";

import type { StyleOptions } from "@/lib/schemas";
import { aspectRatioOptions, resolutionOptions } from "@/lib/style-presets";

type RatioSettingsPanelProps = {
  value: StyleOptions;
  onChange: (patch: Partial<StyleOptions>) => void;
  showTitle?: boolean;
};

export const RatioSettingsPanel: React.FC<RatioSettingsPanelProps> = ({
  value,
  onChange,
  showTitle = true,
}) => (
  <>
    {showTitle ? <h4>视频比例</h4> : null}
    <div className="option-grid">
      {aspectRatioOptions.map((ratio) => (
        <button
          key={ratio.value}
          type="button"
          className={`option-card ${value.aspectRatio === ratio.value ? "is-active" : ""}`}
          onClick={() => onChange({ aspectRatio: ratio.value })}
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
            onChange={(event) =>
              onChange({ customAspectWidth: Number(event.target.value) })
            }
          />
        </label>
        <label className="settings-field">
          <span>高比例</span>
          <input
            type="number"
            min={1}
            max={32}
            value={value.customAspectHeight ?? 16}
            onChange={(event) =>
              onChange({ customAspectHeight: Number(event.target.value) })
            }
          />
        </label>
      </div>
    ) : null}

    <div className="settings-section">
      <h4>导出分辨率</h4>
      <div className="option-grid">
        {resolutionOptions.map((resolution) => (
          <button
            key={resolution.value}
            type="button"
            className={`option-card ${value.resolution === resolution.value ? "is-active" : ""}`}
            onClick={() => onChange({ resolution: resolution.value })}
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
              onChange={(event) =>
                onChange({ customWidth: Number(event.target.value) })
              }
            />
          </label>
          <label className="settings-field">
            <span>高度 px</span>
            <input
              type="number"
              min={320}
              max={4096}
              value={value.customHeight ?? 1920}
              onChange={(event) =>
                onChange({ customHeight: Number(event.target.value) })
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  </>
);
