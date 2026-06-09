import type { VideoPlan } from "../lib/schemas";
import { defaultPlan } from "../lib/templates";
import {
  getAdvancedDurationInFrames,
  KineticTextComposition,
} from "./KineticTextComposition";
import { Background } from "./scenes/Background";
import { TextScene } from "./scenes/TextScene";
import { VIDEO_FPS } from "./scenes/theme";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";

export type TextMixCompositionProps = {
  plan?: VideoPlan;
};

export const getDurationInFrames = (plan: VideoPlan) =>
  plan.advancedTemplate
    ? getAdvancedDurationInFrames(plan)
    : Math.max(1, Math.round(plan.durationSec * VIDEO_FPS));

export const TextMixComposition: React.FC<TextMixCompositionProps> = ({
  plan = defaultPlan,
}) => {
  if (plan.advancedTemplate) {
    return <KineticTextComposition plan={plan} />;
  }

  const musicSrc = plan.style.musicUrl?.startsWith("/")
    ? staticFile(plan.style.musicUrl.slice(1))
    : plan.style.musicUrl;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <Background styleOptions={plan.style} />
      {musicSrc ? (
        <Audio
          src={musicSrc}
          volume={plan.style.musicVolume}
          loop
          loopVolumeCurveBehavior="extend"
        />
      ) : null}
      {plan.storyboard.map((shot) => (
        <Sequence
          key={shot.id}
          from={Math.round(shot.startSec * VIDEO_FPS)}
          durationInFrames={Math.max(1, Math.round(shot.durationSec * VIDEO_FPS))}
        >
          <TextScene shot={shot} styleOptions={plan.style} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
