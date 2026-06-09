import { Composition } from "remotion";
import { getRenderDimensions } from "../lib/schemas";
import { defaultPlan } from "../lib/templates";
import {
  getDurationInFrames,
  TextMixComposition,
} from "./TextMixComposition";
import { VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./scenes/theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TextMixComposition"
      component={TextMixComposition}
      durationInFrames={getDurationInFrames(defaultPlan)}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      defaultProps={{ plan: defaultPlan }}
      calculateMetadata={({ props }) => {
        const plan = (props as { plan?: typeof defaultPlan }).plan ?? defaultPlan;
        const dimensions = getRenderDimensions(plan.style);
        return {
          durationInFrames: getDurationInFrames(plan),
          width: dimensions.width,
          height: dimensions.height,
        };
      }}
    />
  );
};
