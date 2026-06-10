import type { StoryboardShot, StyleOptions } from "../../lib/schemas";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontMap, paceMultiplier } from "./theme";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const monotonicInputRange = (input: number[]) => {
  let previous = Number.NEGATIVE_INFINITY;
  return input.map((value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const next = safeValue > previous ? safeValue : previous + 0.001;
    previous = next;
    return next;
  });
};

const clamp = (
  frame: number,
  input: number[],
  output: number[],
) =>
  interpolate(frame, monotonicInputRange(input), output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const splitText = (text: string) => {
  if (text.length <= 6) return [text];
  if (text.length <= 12) {
    const index = Math.ceil(text.length / 2);
    return [text.slice(0, index), text.slice(index)];
  }
  const index = Math.ceil(text.length / 3);
  return [text.slice(0, index), text.slice(index, index * 2), text.slice(index * 2)];
};

export const TextScene: React.FC<{
  shot: StoryboardShot;
  styleOptions: StyleOptions;
}> = ({ shot, styleOptions }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const palette = styleOptions.colors;
  const pace = paceMultiplier[styleOptions.pace];
  const baseFontSize = Math.min(width, height) * (styleOptions.fontSize / 1080);
  const intro = Math.min(
    Math.max(2, durationInFrames - 0.002),
    Math.max(8, Math.round((0.36 * fps) / pace)),
  );
  const outroStart = Math.max(
    intro + 0.001,
    Math.min(durationInFrames - 0.001, durationInFrames - Math.round(0.28 * fps)),
  );

  const opacity =
    shot.animation === "typewriter"
      ? 1
      : clamp(frame, [0, intro, outroStart, durationInFrames], [0, 1, 1, 0]);
  const y =
    shot.animation === "slide-up"
      ? clamp(frame, [0, intro], [72, 0])
      : clamp(frame, [0, intro], [24, 0]);
  const scale =
    shot.animation === "pop"
      ? clamp(frame, [0, intro * 0.55, intro], [0.76, 1.08, 1])
      : shot.animation === "zoom"
        ? clamp(frame, [0, durationInFrames], [0.86, 1.08])
        : clamp(frame, [0, intro], [0.96, 1]);

  const shownChars =
    shot.animation === "typewriter"
      ? Math.max(1, Math.round(clamp(frame, [0, intro * 1.4], [1, shot.text.length])))
      : shot.text.length;

  const lines = splitText(shot.text.slice(0, shownChars));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 88px",
        color: palette.primary,
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...fontMap[styleOptions.fontFamily],
          fontWeight: styleOptions.fontWeight,
          opacity,
          transform: `translateY(${y}px) scale(${scale})`,
          letterSpacing: 0,
          lineHeight: 0.95,
          textShadow:
            styleOptions.palette === "white"
              ? "none"
              : `0 14px 34px ${palette.background}`,
        }}
      >
        {lines.map((line, index) => {
          const isAccent =
            index === 1 ||
            line.includes("不是") ||
            line.includes("坚持") ||
            line.includes("未来");
          return (
            <div
              key={`${line}-${index}`}
              style={{
                color: isAccent ? palette.accent : palette.primary,
                fontSize:
                  line.length <= 3
                    ? baseFontSize * 1.16
                    : line.length <= 5
                      ? baseFontSize
                      : baseFontSize * 0.78,
                marginBottom: 18,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};
