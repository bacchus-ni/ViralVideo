import type { StoryboardShot, StyleOptions } from "../../lib/schemas";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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

const mediaSrc = (value?: string) =>
  value?.startsWith("/") ? staticFile(value.slice(1)) : value;

const ShotBackground: React.FC<{
  shot: StoryboardShot;
  styleOptions: StyleOptions;
}> = ({ shot, styleOptions }) => {
  const settings = shot.advancedSettings;
  const type = settings?.backgroundType ?? "inherit";
  const color = settings?.backgroundColor || styleOptions.colors.background;
  const accent = settings?.accentColor || styleOptions.colors.accent;
  const imageSrc = mediaSrc(settings?.backgroundImageUrl);

  if (type === "inherit") return null;
  if (type === "image" && imageSrc) {
    return (
      <AbsoluteFill style={{ backgroundColor: color }}>
        <Img
          src={imageSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
        />
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${color}22, ${color}99)` }} />
      </AbsoluteFill>
    );
  }
  if (type === "gradient") {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${color}, ${styleOptions.colors.surface} 52%, ${accent}44)`,
        }}
      />
    );
  }
  if (type === "particles") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: color,
          backgroundImage: `
            radial-gradient(circle at 18% 22%, ${accent} 0 2px, transparent 3px),
            radial-gradient(circle at 76% 36%, ${accent} 0 3px, transparent 4px),
            radial-gradient(circle at 50% 78%, ${accent}99 0 4px, transparent 6px)`,
          backgroundSize: "180px 180px, 260px 260px, 320px 320px",
        }}
      />
    );
  }

  return <AbsoluteFill style={{ backgroundColor: color }} />;
};

export const TextScene: React.FC<{
  shot: StoryboardShot;
  styleOptions: StyleOptions;
}> = ({ shot, styleOptions }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const palette = styleOptions.colors;
  const settings = shot.advancedSettings;
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
  const effect = settings?.effect ?? "none";
  const intensity = settings?.intensity ?? 0.55;
  const effectX =
    effect === "jitter"
      ? Math.sin(frame * 2.7) * 9 * intensity + Math.sin(frame * 9.1) * 3 * intensity
      : 0;
  const flashOpacity =
    effect === "flash" && frame < 5 ? clamp(frame, [0, 4], [0.16, 0]) : 0;
  const textShadow =
    effect === "glow"
      ? `0 0 ${28 + intensity * 36}px ${settings?.accentColor ?? palette.accent}, 0 18px 44px ${palette.background}88`
      : styleOptions.palette === "white"
        ? "none"
        : `0 14px 34px ${palette.background}`;
  const stroke =
    effect === "outline" ? `2.5px ${settings?.textColor ?? palette.primary}` : undefined;

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
      <ShotBackground shot={shot} styleOptions={styleOptions} />
      {flashOpacity > 0 ? <AbsoluteFill style={{ backgroundColor: palette.primary, opacity: flashOpacity }} /> : null}
      <div
        style={{
          ...fontMap[styleOptions.fontFamily],
          fontWeight: styleOptions.fontWeight,
          opacity,
          transform: `translate(${effectX}px, ${y}px) scale(${scale})`,
          letterSpacing: 0,
          lineHeight: 0.95,
          textShadow,
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
                color:
                  effect === "outline"
                    ? "transparent"
                    : isAccent
                      ? settings?.accentColor ?? palette.accent
                      : settings?.textColor ?? palette.primary,
                WebkitTextStroke: stroke,
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
