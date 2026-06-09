"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { Download, Video, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { getRenderDimensions, type VideoPlan } from "@/lib/schemas";
import {
  getDurationInFrames,
  TextMixComposition,
} from "@/remotion/TextMixComposition";
import { VIDEO_FPS } from "@/remotion/scenes/theme";

type PhonePreviewProps = {
  plan: VideoPlan;
  isRendering: boolean;
  renderMessage?: string;
  downloadUrl?: string;
  renderProgress: number;
  isPreviewMuted: boolean;
  onTogglePreviewMute: () => void;
  onRender: () => void;
};

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  plan,
  isRendering,
  renderMessage,
  downloadUrl,
  renderProgress,
  isPreviewMuted,
  onTogglePreviewMute,
  onRender,
}) => {
  const dimensions = getRenderDimensions(plan.style);
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isPreviewMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unmute();
    }
  }, [isPreviewMuted]);

  return (
    <aside className="preview-panel" aria-label="视频预览">
      <button
        className={`preview-mute-button ${isPreviewMuted ? "is-muted" : ""}`}
        type="button"
        onClick={onTogglePreviewMute}
        title={isPreviewMuted ? "开启网页预览声音" : "静音网页预览"}
      >
        {isPreviewMuted ? (
          <VolumeX size={19} aria-hidden />
        ) : (
          <Volume2 size={19} aria-hidden />
        )}
        {isPreviewMuted ? "网页静音" : "预览有声"}
      </button>
      <div
        className="phone-frame"
        style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
      >
        <div className="phone-speaker" />
        <div className="phone-screen">
          <Player
            ref={playerRef}
            key={`${dimensions.width}x${dimensions.height}`}
            component={TextMixComposition}
            inputProps={{ plan }}
            durationInFrames={getDurationInFrames(plan)}
            compositionWidth={dimensions.width}
            compositionHeight={dimensions.height}
            fps={VIDEO_FPS}
            autoPlay
            loop
            initiallyMuted={isPreviewMuted}
            acknowledgeRemotionLicense
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
      <button
        className="render-button"
        type="button"
        disabled={isRendering}
        onClick={onRender}
      >
        <Video size={24} aria-hidden />
        {isRendering ? "生成中" : "生成视频"}
      </button>
      {isRendering ? (
        <div className="render-progress" role="status" aria-live="polite">
          <div className="render-progress-header">
            <span>正在渲染视频</span>
            <strong>{Math.round(renderProgress)}%</strong>
          </div>
          <div className="render-progress-track">
            <span style={{ width: `${Math.max(6, Math.min(100, renderProgress))}%` }} />
          </div>
          <p>正在合成文字动效、背景音乐和导出文件，请稍等。</p>
        </div>
      ) : null}
      {renderMessage ? <p className="render-message">{renderMessage}</p> : null}
      {downloadUrl ? (
        <a className="download-link" href={downloadUrl} download>
          <Download size={18} aria-hidden />
          下载视频
        </a>
      ) : null}
    </aside>
  );
};
