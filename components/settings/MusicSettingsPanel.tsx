"use client";

import { Music } from "lucide-react";
import type { StyleOptions } from "@/lib/schemas";
import { musicOptions } from "@/lib/style-presets";
import { RangeField, UploadDropzone } from "./SettingControls";
import { readFileAsDataUrl } from "./settings-utils";

type MusicSettingsPanelProps = {
  value: StyleOptions;
  onChange: (patch: Partial<StyleOptions>) => void;
  showTitle?: boolean;
  compactUpload?: boolean;
};

export const MusicSettingsPanel: React.FC<MusicSettingsPanelProps> = ({
  value,
  onChange,
  showTitle = false,
  compactUpload = false,
}) => {
  const uploadMusic = async (file: File | undefined) => {
    if (!file) return;
    onChange({
      musicUrl: await readFileAsDataUrl(file),
      musicVolume: value.musicVolume || 0.2,
    });
  };

  return (
    <>
      {showTitle ? <h4>音乐</h4> : null}
      <div className="music-grid">
        {musicOptions.map((music) => (
          <button
            key={music.url}
            type="button"
            className={`music-card ${value.musicUrl === music.url ? "is-active" : ""}`}
            onClick={() =>
              onChange({
                musicUrl: music.url,
                musicVolume: music.volume,
              })
            }
          >
            <span className="music-card-icon">
              <Music size={18} aria-hidden />
            </span>
            <strong>{music.label}</strong>
            <small>{music.description}</small>
          </button>
        ))}
      </div>
      <UploadDropzone
        icon={<Music size={compactUpload ? 20 : 24} aria-hidden />}
        label={compactUpload ? "上传音乐" : "上传音乐作为背景音乐"}
        accept="audio/*"
        compact={compactUpload}
        onUpload={uploadMusic}
      />
      <RangeField
        label={`音乐音量 ${Math.round(value.musicVolume * 100)}%`}
        min={0}
        max={1}
        step={0.01}
        value={value.musicVolume}
        onChange={(musicVolume) => onChange({ musicVolume })}
      />
      {value.musicUrl ? (
        <button
          type="button"
          className="secondary-action"
          onClick={() => onChange({ musicUrl: undefined })}
        >
          移除背景音乐
        </button>
      ) : null}
    </>
  );
};
