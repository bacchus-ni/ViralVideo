import type { AdvancedTemplateSpec, StyleOptions, VideoPlan } from "../lib/schemas";
import { defaultPlan } from "../lib/templates";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { KineticTextScene } from "./scenes/KineticTextScene";
import { VIDEO_FPS } from "./scenes/theme";

export type KineticTextCompositionProps = {
  plan?: VideoPlan;
};

const mediaSrc = (value?: string) =>
  value?.startsWith("/") ? staticFile(value.slice(1)) : value;

const monotonicInputRange = (input: number[]) => {
  let previous = Number.NEGATIVE_INFINITY;
  return input.map((value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const next = safeValue > previous ? safeValue : previous + 0.001;
    previous = next;
    return next;
  });
};

const mergeAdvancedStyle = (
  baseStyle: StyleOptions,
  advancedTemplate?: AdvancedTemplateSpec,
): StyleOptions => ({
  ...(advancedTemplate?.style ?? {}),
  ...baseStyle,
  colors: {
    ...(advancedTemplate?.style?.colors ?? {}),
    ...baseStyle.colors,
  },
  musicUrl: baseStyle.musicUrl ?? advancedTemplate?.audio?.url,
  musicVolume: baseStyle.musicVolume ?? advancedTemplate?.audio?.volume ?? 0.2,
  aspectRatio: baseStyle.aspectRatio ?? advancedTemplate?.aspectRatio ?? "9:16",
});

const getSlotText = (
  plan: VideoPlan,
  slotIndex: number,
  fallback: string,
) =>
  plan.storyboard[slotIndex]?.text ||
  plan.script[slotIndex]?.text ||
  fallback;

const FlashOverlay: React.FC<{
  cuts: number[];
}> = ({ cuts }) => {
  const frame = useCurrentFrame();
  const opacity = cuts.reduce((current, second) => {
    const cutFrame = Math.round(second * VIDEO_FPS);
    const distance = Math.abs(frame - cutFrame);
    return Math.max(
      current,
      interpolate(distance, [0, 2], [0.12, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }, 0);

  if (opacity <= 0.01) return null;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#ffffff", opacity, pointerEvents: "none" }}
    />
  );
};

export const getAdvancedDurationInFrames = (plan: VideoPlan) =>
  Math.max(
    1,
    Math.round((plan.advancedTemplate?.durationSec ?? plan.durationSec) * VIDEO_FPS),
  );

export const KineticTextComposition: React.FC<KineticTextCompositionProps> = ({
  plan = defaultPlan,
}) => {
  const template = plan.advancedTemplate;
  const style = mergeAdvancedStyle(plan.style, template);
  const musicSrc = mediaSrc(template?.audio?.url ?? style.musicUrl);
  const slots = template?.slots ?? [];

  return (
    <AbsoluteFill style={{ backgroundColor: style.colors.background, overflow: "hidden" }}>
      {musicSrc ? (
        <Audio
          src={musicSrc}
          volume={(frame) =>
            interpolate(
              frame,
              monotonicInputRange([
                0,
                8,
                getAdvancedDurationInFrames(plan) - 18,
                getAdvancedDurationInFrames(plan),
              ]),
              [0, style.musicVolume, style.musicVolume, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          }
          loop={template?.audio?.loop ?? true}
          loopVolumeCurveBehavior="extend"
        />
      ) : null}

      {slots.map((slot, index) => {
        const durationFrames = Math.max(1, Math.round(slot.durationSec * VIDEO_FPS));

        return (
          <Sequence
            key={slot.id}
            from={Math.round(slot.startSec * VIDEO_FPS)}
            durationInFrames={durationFrames}
            premountFor={Math.round(0.3 * VIDEO_FPS)}
          >
            <KineticTextScene
              slot={slot}
              text={getSlotText(plan, index, slot.defaultText)}
              styleOptions={style}
              durationFrames={durationFrames}
            />
          </Sequence>
        );
      })}

      {template?.flashCuts?.length ? <FlashOverlay cuts={template.flashCuts} /> : null}
    </AbsoluteFill>
  );
};
