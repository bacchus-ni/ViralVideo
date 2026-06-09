import type { StyleOptions } from "../../lib/schemas";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export const Background: React.FC<{ styleOptions: StyleOptions }> = ({
  styleOptions,
}) => {
  const frame = useCurrentFrame();
  const palette = styleOptions.colors;
  const drift = interpolate(frame % 180, [0, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (styleOptions.backgroundImageUrl) {
    return (
      <AbsoluteFill style={{ backgroundColor: palette.background }}>
        <Img
          src={styleOptions.backgroundImageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.88,
          }}
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, ${palette.background}33, ${palette.background}77)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (styleOptions.backgroundStyle === "solid") {
    return <AbsoluteFill style={{ backgroundColor: palette.background }} />;
  }

  if (styleOptions.backgroundStyle === "gradient") {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(150deg, ${palette.background}, ${palette.surface} 48%, ${palette.accent}22)`,
        }}
      />
    );
  }

  if (styleOptions.backgroundStyle === "image") {
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 18%, ${palette.accent}33, transparent 36%), linear-gradient(180deg, ${palette.surface}, ${palette.background})`,
        }}
      />
    );
  }

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: palette.background,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.9,
          backgroundImage: `
            radial-gradient(circle at 20% ${20 + drift * 12}%, ${palette.accent} 0 2px, transparent 3px),
            radial-gradient(circle at 72% ${38 + drift * 18}%, ${palette.accent} 0 3px, transparent 4px),
            radial-gradient(circle at 48% ${82 - drift * 16}%, ${palette.accent} 0 4px, transparent 6px),
            radial-gradient(circle at 56% 90%, ${palette.accent}66, transparent 24%),
            radial-gradient(circle at 50% 100%, ${palette.accent}55, transparent 28%)`,
          backgroundSize: "180px 180px, 260px 260px, 320px 320px, 100% 100%, 100% 100%",
          transform: `translateY(${-drift * 80}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-18%",
          right: "-18%",
          bottom: "-8%",
          height: "38%",
          background: `radial-gradient(ellipse at center, ${palette.accent}99, transparent 66%)`,
          filter: "blur(18px)",
          opacity: 0.42,
        }}
      />
    </AbsoluteFill>
  );
};
