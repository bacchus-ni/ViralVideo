import type { CSSProperties, ReactNode } from "react";
import { getSlotReadableLimit } from "../../lib/advanced-template";
import type { StyleOptions, TemplateSlot } from "../../lib/schemas";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontMap } from "./theme";

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);

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
  easing = easeOut,
) =>
  interpolate(frame, monotonicInputRange(input), output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

const jitter = (frame: number, amount: number) =>
  Math.sin(frame * 13.17) * amount + Math.sin(frame * 4.91) * amount * 0.35;

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return undefined;
  const value = Number.parseInt(clean, 16);
  if (!Number.isFinite(value)) return undefined;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const isLightColor = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 170;
};

const resolveRoleColor = (
  role: TemplateSlot["background"]["colorRole"],
  styleOptions: StyleOptions,
) => (role ? styleOptions.colors[role] : styleOptions.colors.background);

const resolveBackground = (slot: TemplateSlot, styleOptions: StyleOptions) =>
  slot.background.color ??
  resolveRoleColor(slot.background.colorRole, styleOptions) ??
  styleOptions.colors.background;

const resolveForeground = (slot: TemplateSlot, styleOptions: StyleOptions) => {
  if (slot.textColor) return slot.textColor;
  const background = resolveBackground(slot, styleOptions).toLowerCase();
  if (background === styleOptions.colors.accent.toLowerCase()) {
    return styleOptions.colors.surface;
  }
  if (background === styleOptions.colors.surface.toLowerCase()) {
    return styleOptions.colors.accent;
  }
  if (background === styleOptions.colors.muted.toLowerCase()) {
    return styleOptions.colors.primary;
  }
  if (isLightColor(background)) {
    return styleOptions.colors.muted;
  }
  return styleOptions.colors.primary;
};

const mediaSrc = (value?: string) =>
  value?.startsWith("/") ? staticFile(value.slice(1)) : value;

const splitText = (text: string, maxLineLength = 6) => {
  const chars = Array.from(text);
  if (chars.length <= maxLineLength) return [text];
  const midpoint = Math.ceil(chars.length / 2);
  return [chars.slice(0, midpoint).join(""), chars.slice(midpoint).join("")];
};

const textSize = (text: string, base: number, scale = 1) => {
  const count = Array.from(text).length;
  const lengthScale =
    count <= 4 ? 1.1 : count <= 7 ? 0.94 : count <= 10 ? 0.76 : 0.62;
  return base * scale * lengthScale;
};

const baseTextStyle = (
  slot: TemplateSlot,
  styleOptions: StyleOptions,
  color: string,
  size: number,
): CSSProperties => ({
  ...fontMap[styleOptions.fontFamily],
  color,
  fontSize: size,
  fontWeight: styleOptions.fontWeight,
  letterSpacing: 0,
  lineHeight: 0.9,
  textAlign: slot.layout.align,
  textTransform: "none",
});

const Center: React.FC<{
  children: ReactNode;
  slot: TemplateSlot;
}> = ({ children, slot }) => {
  const alignItems =
    slot.layout.vertical === "top"
      ? "flex-start"
      : slot.layout.vertical === "bottom"
        ? "flex-end"
        : "center";
  const justifyContent =
    slot.layout.align === "left"
      ? "flex-start"
      : slot.layout.align === "right"
        ? "flex-end"
        : "center";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems,
        justifyContent,
        padding: "7% 8%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const SlotBackground: React.FC<{
  slot: TemplateSlot;
  styleOptions: StyleOptions;
}> = ({ slot, styleOptions }) => {
  const frame = useCurrentFrame();
  const color = resolveBackground(slot, styleOptions);
  const accent = slot.background.accentColor ?? styleOptions.colors.accent;
  const drift = clamp(frame % 160, [0, 160], [0, 1], Easing.linear);
  const imageSrc = mediaSrc(slot.background.imageUrl);

  if (slot.background.type === "image" && imageSrc) {
    return (
      <AbsoluteFill style={{ backgroundColor: color }}>
        <Img
          src={imageSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
        />
        <AbsoluteFill
          style={{ background: `linear-gradient(180deg, ${color}22, ${color}88)` }}
        />
      </AbsoluteFill>
    );
  }

  if (slot.background.type === "gradient") {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${color}, ${styleOptions.colors.surface} 52%, ${accent}44)`,
        }}
      />
    );
  }

  if (slot.background.type === "particles") {
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: color }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              radial-gradient(circle at 18% ${22 + drift * 14}%, ${accent} 0 2px, transparent 3px),
              radial-gradient(circle at 76% ${36 + drift * 18}%, ${accent} 0 3px, transparent 4px),
              radial-gradient(circle at 50% ${78 - drift * 20}%, ${accent}99 0 4px, transparent 6px)`,
            backgroundSize: "180px 180px, 260px 260px, 320px 320px",
            transform: `translateY(${-drift * 70}px)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (slot.background.type === "transparent") {
    return null;
  }

  return <AbsoluteFill style={{ backgroundColor: color }} />;
};

const WordBlock: React.FC<{
  slot: TemplateSlot;
  styleOptions: StyleOptions;
  text: string;
  color: string;
  baseFontSize: number;
  opacity?: number;
  transform?: string;
  italic?: boolean;
  stroke?: string;
}> = ({
  slot,
  styleOptions,
  text,
  color,
  baseFontSize,
  opacity = 1,
  transform,
  italic = false,
  stroke,
}) => (
  <div
    style={{
      ...baseTextStyle(slot, styleOptions, color, textSize(text, baseFontSize, slot.layout.scale),),
      maxWidth: `${(slot.layout.maxWidth ?? 0.84) * 100}%`,
      opacity,
      transform,
      fontStyle: italic ? "italic" : "normal",
      WebkitTextStroke: stroke,
      color: stroke ? "transparent" : color,
      textShadow: stroke ? "none" : `0 18px 42px ${styleOptions.colors.background}55`,
    }}
  >
    {splitText(text).map((line, index) => (
      <div key={`${line}-${index}`} style={{ marginBottom: index === 0 ? 10 : 0 }}>
        {line}
      </div>
    ))}
  </div>
);

const IntroWipeScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const foreground = isLightColor(resolveBackground(slot, styleOptions))
    ? styleOptions.colors.background
    : resolveForeground(slot, styleOptions);
  const reveal = clamp(frame, [0, Math.min(9, durationFrames * 0.62)], [0, 1]);
  const opacity = clamp(frame, [2, Math.min(12, durationFrames * 0.7)], [0, 1]);
  const y = clamp(frame, [0, Math.min(10, durationFrames * 0.7)], [-46, 0]);

  return (
    <>
      <AbsoluteFill
        style={{
          backgroundColor: styleOptions.colors.background,
          transform: `translateY(${(1 - reveal) * -100}%)`,
        }}
      />
      {slot.background.accentColor ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${clamp(frame, [5, 13], [0, 28])}%`,
            backgroundColor: slot.background.accentColor,
          }}
        />
      ) : null}
      <Center slot={slot}>
        <WordBlock
          slot={slot}
          styleOptions={styleOptions}
          text={text}
          color={foreground}
          baseFontSize={baseFontSize}
          opacity={opacity}
          transform={`translateY(${y}px) scale(${clamp(frame, [0, 10], [0.86, 1])})`}
        />
      </Center>
    </>
  );
};

const WordCardScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const scale = clamp(
    frame,
    [0, Math.min(7, durationFrames * 0.46), durationFrames],
    [1.22, 1, 1.03],
    backOut,
  );
  const y = clamp(frame, [0, Math.min(8, durationFrames * 0.5)], [48, 0]);

  return (
    <Center slot={slot}>
      <WordBlock
        slot={slot}
        styleOptions={styleOptions}
        text={text}
        color={resolveForeground(slot, styleOptions)}
        baseFontSize={baseFontSize}
        transform={`translate(${jitter(frame, slot.motion.intensity * 2.8)}px, ${y}px) scale(${scale})`}
      />
    </Center>
  );
};

const SplitWordScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const foreground = resolveForeground(slot, styleOptions);
  const split = clamp(frame, [4, Math.min(13, durationFrames * 0.72)], [0, 1]);
  const x = clamp(frame, [0, Math.min(8, durationFrames * 0.5)], [86, 0]);
  const size = textSize(text, baseFontSize, slot.layout.scale);

  return (
    <Center slot={slot}>
      <div
        style={{
          position: "relative",
          width: "min(78%, 1180px)",
          height: size * 1.55,
          transform: `translateX(${x - split * 120}px) scale(${clamp(frame, [0, 8], [1.12, 1])})`,
        }}
      >
        <div
          style={{
            ...baseTextStyle(slot, styleOptions, foreground, size),
            position: "absolute",
            inset: "18% 0 auto",
            clipPath: `inset(0 0 ${split * 40}% 0)`,
          }}
        >
          {text}
        </div>
        <div
          style={{
            ...baseTextStyle(slot, styleOptions, foreground, size),
            position: "absolute",
            inset: `${18 + split * 12}% 0 auto`,
            opacity: split,
            clipPath: `inset(${64 - split * 18}% 0 0 0)`,
            transform: `translateX(${split * 64}px)`,
          }}
        >
          {text}
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 18,
            height: "88%",
            backgroundColor: styleOptions.colors.primary,
            transform: `skewX(-12deg) translateX(${(1 - split) * 68}px)`,
            opacity: split,
          }}
        />
      </div>
    </Center>
  );
};

const StompWordScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const foreground = resolveForeground(slot, styleOptions);
  const x = clamp(frame, [0, Math.min(8, durationFrames * 0.5)], [-220, 0], backOut);
  const slashX = clamp(frame, [0, Math.min(8, durationFrames * 0.5)], [-430, -330]);

  return (
    <Center slot={slot}>
      <div style={{ position: "relative", width: "min(74%, 980px)", height: 260 }}>
        <div
          style={{
            position: "absolute",
            left: `calc(50% + ${slashX}px)`,
            top: 24,
            width: 16,
            height: 220,
            backgroundColor: styleOptions.colors.primary,
            opacity: 0.85,
            transform: "skewX(-14deg)",
          }}
        />
        <WordBlock
          slot={slot}
          styleOptions={styleOptions}
          text={text}
          color={foreground}
          baseFontSize={baseFontSize}
          italic
          transform={`translateX(${x + jitter(frame, 4.5)}px) rotate(${slot.layout.rotate ?? -2}deg) scale(${clamp(
            frame,
            [0, 7, durationFrames],
            [1.16, 1, 1.02],
            backOut,
          )})`}
        />
      </div>
    </Center>
  );
};

const LetterScatterScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text).slice(0, getSlotReadableLimit(slot));
  const settled = clamp(frame, [0, Math.min(10, durationFrames * 0.62)], [0, 1], backOut);
  const foreground = resolveForeground(slot, styleOptions);

  return (
    <Center slot={slot}>
      <div style={{ display: "flex", gap: Math.max(12, baseFontSize * 0.08) }}>
        {chars.map((letter, index) => {
          const direction = index - (chars.length - 1) / 2;
          const offset = direction * (1 - settled) * baseFontSize * 0.46;
          const flicker = frame < 8 ? jitter(frame + index * 2, 18 * slot.motion.intensity) : 0;

          return (
            <span
              key={`${letter}-${index}`}
              style={{
                ...baseTextStyle(slot, styleOptions, foreground, baseFontSize * (slot.layout.scale ?? 1)),
                display: "inline-block",
                transform: `translate(${offset + flicker}px, ${Math.abs(flicker) * 0.55}px)`,
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>
    </Center>
  );
};

const OutlineRowsScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const rows = Array.from({ length: slot.layout.rows ?? 8 }, (_, index) => index);
  const foreground = resolveForeground(slot, styleOptions);
  const scroll = clamp(frame, [0, durationFrames], [-baseFontSize * 1.4, -baseFontSize * 0.2]);
  const x = clamp(frame, [0, Math.min(15, durationFrames * 0.7)], [130, 0]);
  const solidOpacity = clamp(frame, [4, Math.min(13, durationFrames * 0.62)], [0, 1]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {rows.map((row) => (
        <div
          key={row}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: row * baseFontSize * 0.86 + scroll,
            ...baseTextStyle(slot, styleOptions, foreground, baseFontSize * 0.92),
            color: "transparent",
            WebkitTextStroke: `2.3px ${foreground}cc`,
            fontStyle: "italic",
            textAlign: "center",
            transform: `translateX(${x + (row % 2 === 0 ? -8 : 8)}px)`,
          }}
        >
          {text}
        </div>
      ))}
      <Center slot={slot}>
        <WordBlock
          slot={slot}
          styleOptions={styleOptions}
          text={text}
          color={styleOptions.colors.primary}
          baseFontSize={baseFontSize}
          opacity={solidOpacity}
          transform={`translateX(${jitter(frame, 4)}px) scale(${clamp(frame, [5, 14], [1.14, 1], backOut)})`}
          italic
        />
      </Center>
    </AbsoluteFill>
  );
};

const LogoHoldScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const foreground = resolveForeground(slot, styleOptions);
  const fadeFrames = Math.max(2, Math.min(14, durationFrames * 0.28));
  const holdStart = Math.min(durationFrames - 0.002, fadeFrames);
  const holdEnd = Math.max(holdStart + 0.001, durationFrames - fadeFrames);
  const opacity = clamp(frame, [0, holdStart, holdEnd, durationFrames], [0, 1, 1, 0]);
  const scalePeak = Math.min(durationFrames - 0.001, Math.max(2, durationFrames * 0.3));
  const scale = clamp(frame, [0, scalePeak, durationFrames], [0.92, 1.02, 0.96]);
  const lines = splitText(text, 7);

  return (
    <Center slot={slot}>
      <div
        style={{
          ...fontMap[styleOptions.fontFamily],
          color: foreground,
          opacity,
          textAlign: "center",
          transform: `scale(${scale})`,
          textShadow: `0 20px 60px ${styleOptions.colors.background}88`,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            style={{
              fontSize: textSize(line, baseFontSize, slot.layout.scale),
              fontWeight: styleOptions.fontWeight,
              lineHeight: 0.86,
            }}
          >
            {line}
          </div>
        ))}
        <div
          style={{
            marginTop: 28,
            color: slot.background.accentColor ?? styleOptions.colors.accent,
            fontSize: baseFontSize * 0.16,
            fontWeight: 900,
            letterSpacing: 0,
          }}
        >
          TEXT MIXCUT
        </div>
      </div>
    </Center>
  );
};

const StackedTitleScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
}) => {
  const frame = useCurrentFrame();
  const lines = splitText(text, 5);
  const foreground = resolveForeground(slot, styleOptions);

  return (
    <Center slot={slot}>
      <div>
        {lines.map((line, index) => {
          const y = clamp(frame - index * 4, [0, Math.min(12, durationFrames * 0.6)], [54, 0]);
          const opacity = clamp(frame - index * 4, [0, 8], [0, 1]);
          return (
            <div
              key={`${line}-${index}`}
              style={{
                ...baseTextStyle(slot, styleOptions, index === 1 ? styleOptions.colors.accent : foreground, textSize(line, baseFontSize, slot.layout.scale)),
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </Center>
  );
};

type SceneProps = {
  slot: TemplateSlot;
  styleOptions: StyleOptions;
  text: string;
  durationFrames: number;
  baseFontSize: number;
};

export const KineticTextScene: React.FC<{
  slot: TemplateSlot;
  text: string;
  styleOptions: StyleOptions;
  durationFrames: number;
}> = ({ slot, text, styleOptions, durationFrames }) => {
  const { width, height } = useVideoConfig();
  const baseFontSize = Math.min(width, height) * (styleOptions.fontSize / 1080);
  const safeText = Array.from(text.trim() || slot.defaultText)
    .slice(0, getSlotReadableLimit(slot))
    .join("");
  const frame = useCurrentFrame();
  const flash =
    slot.motion.emphasis.includes("flash") && frame < 3
      ? clamp(frame, [0, 2], [0.12, 0])
      : 0;

  const sceneProps = {
    slot,
    styleOptions,
    text: safeText,
    durationFrames,
    baseFontSize,
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: styleOptions.colors.background }}>
      <SlotBackground slot={slot} styleOptions={styleOptions} />
      {slot.sceneType === "intro-wipe" ? <IntroWipeScene {...sceneProps} /> : null}
      {slot.sceneType === "word-card" ? <WordCardScene {...sceneProps} /> : null}
      {slot.sceneType === "split-word" ? <SplitWordScene {...sceneProps} /> : null}
      {slot.sceneType === "stomp-word" ? <StompWordScene {...sceneProps} /> : null}
      {slot.sceneType === "letter-scatter" ? <LetterScatterScene {...sceneProps} /> : null}
      {slot.sceneType === "outline-rows" ? <OutlineRowsScene {...sceneProps} /> : null}
      {slot.sceneType === "logo-hold" ? <LogoHoldScene {...sceneProps} /> : null}
      {slot.sceneType === "stacked-title" ? <StackedTitleScene {...sceneProps} /> : null}
      {slot.sceneType === "blank-color" ? null : null}
      {flash > 0 ? (
        <AbsoluteFill style={{ backgroundColor: styleOptions.colors.primary, opacity: flash }} />
      ) : null}
    </AbsoluteFill>
  );
};
