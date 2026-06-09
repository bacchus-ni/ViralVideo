import type { VideoPlan } from "../lib/schemas";
import { defaultPlan } from "../lib/templates";
import { Background } from "./scenes/Background";
import { TextScene } from "./scenes/TextScene";
import { VIDEO_FPS } from "./scenes/theme";
import { AbsoluteFill, Sequence } from "remotion";

export type TextMixCompositionProps = {
  plan?: VideoPlan;
};

export const getDurationInFrames = (plan: VideoPlan) =>
  Math.max(1, Math.round(plan.durationSec * VIDEO_FPS));

export const TextMixComposition: React.FC<TextMixCompositionProps> = ({
  plan = defaultPlan,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <Background styleOptions={plan.style} />
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
