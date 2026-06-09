"use client";

import { Player } from "@remotion/player";
import { Download, Video } from "lucide-react";
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
  onRender: () => void;
};

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  plan,
  isRendering,
  renderMessage,
  downloadUrl,
  onRender,
}) => {
  const dimensions = getRenderDimensions(plan.style);

  return (
    <aside className="preview-panel" aria-label="视频预览">
      <div
        className="phone-frame"
        style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
      >
        <div className="phone-speaker" />
        <div className="phone-screen">
          <Player
            key={`${dimensions.width}x${dimensions.height}`}
            component={TextMixComposition}
            inputProps={{ plan }}
            durationInFrames={getDurationInFrames(plan)}
            compositionWidth={dimensions.width}
            compositionHeight={dimensions.height}
            fps={VIDEO_FPS}
            autoPlay
            loop
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
