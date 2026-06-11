import { Composition } from "remotion";
import { getRenderDimensions } from "../lib/schemas";
import { defaultPlan } from "../lib/templates";
import { sampleMixcut1Plan } from "./fixtures/sample-mixcut-1";
import {
  getDurationInFrames,
  TextMixComposition,
} from "./TextMixComposition";
import { VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./scenes/theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
      {/* 对照 example_video/纯文本混剪1-1.mp4 的目标效果，用于 Studio 比对调参 */}
      <Composition
        id="KineticFixtureMixcut1"
        component={TextMixComposition}
        durationInFrames={getDurationInFrames(sampleMixcut1Plan)}
        fps={VIDEO_FPS}
        width={1280}
        height={720}
        defaultProps={{ plan: sampleMixcut1Plan }}
      />
    </>
  );
};
