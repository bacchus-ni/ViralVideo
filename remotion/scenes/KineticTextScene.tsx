import type { CSSProperties, ReactNode } from "react";
import { getSlotReadableLimit } from "../../lib/advanced-template";
import type { EmphasisStyle, StyleOptions, TemplateSlot } from "../../lib/schemas";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
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

type RichSegment = { value: string; emphasized: boolean };

// 把 text 按强调词拆段；强调词必须是原文子串，最长匹配优先
const tokenizeEmphasis = (text: string, emphasis: string[]): RichSegment[] => {
  const words = emphasis
    .map((word) => word.trim())
    .filter((word) => word && text.includes(word))
    .sort((a, b) => b.length - a.length);
  if (!words.length) return [{ value: text, emphasized: false }];

  const segments: RichSegment[] = [];
  let rest = text;
  while (rest) {
    let matchIndex = -1;
    let matchWord = "";
    for (const word of words) {
      const index = rest.indexOf(word);
      if (index === -1) continue;
      if (
        matchIndex === -1 ||
        index < matchIndex ||
        (index === matchIndex && word.length > matchWord.length)
      ) {
        matchIndex = index;
        matchWord = word;
      }
    }
    if (matchIndex === -1) {
      segments.push({ value: rest, emphasized: false });
      break;
    }
    if (matchIndex > 0) {
      segments.push({ value: rest.slice(0, matchIndex), emphasized: false });
    }
    segments.push({ value: matchWord, emphasized: true });
    rest = rest.slice(matchIndex + matchWord.length);
  }
  return segments;
};

const RichWords: React.FC<{
  text: string;
  emphasis: string[];
  emphasisStyle: EmphasisStyle;
  accent: string;
  contrast: string;
}> = ({ text, emphasis, emphasisStyle, accent, contrast }) => (
  <>
    {tokenizeEmphasis(text, emphasis).map((segment, index) =>
      segment.emphasized ? (
        <span
          key={`${segment.value}-${index}`}
          style={
            emphasisStyle === "highlight"
              ? {
                  color: contrast,
                  backgroundColor: accent,
                  padding: "0 0.08em",
                  borderRadius: "0.05em",
                  display: "inline-block",
                  transform: "rotate(-1.4deg)",
                }
              : emphasisStyle === "outline"
                ? { color: "transparent", WebkitTextStroke: `0.045em ${accent}` }
                : { color: accent }
          }
        >
          {segment.value}
        </span>
      ) : (
        <span key={`${segment.value}-${index}`}>{segment.value}</span>
      ),
    )}
  </>
);

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
  emphasis?: string[];
  // typewriter 等部分显示时仍按完整文本算字号，避免字号逐帧跳动
  sizeReferenceText?: string;
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
  emphasis = [],
  sizeReferenceText,
}) => (
  <div
    style={{
      ...baseTextStyle(
        slot,
        styleOptions,
        color,
        textSize(sizeReferenceText ?? text, baseFontSize, slot.layout.scale),
      ),
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
        {stroke || !emphasis.length ? (
          line
        ) : (
          <RichWords
            text={line}
            emphasis={emphasis}
            emphasisStyle={slot.emphasisStyle ?? "color"}
            accent={slot.background.accentColor ?? styleOptions.colors.accent}
            contrast={styleOptions.colors.background}
          />
        )}
      </div>
    ))}
  </div>
);

type EntranceState = {
  opacity: number;
  transform: string;
  // typewriter 时已显示的字符数，其余入场为 Infinity
  revealCount: number;
};

// 让 slot.motion.entrance 真正参与渲染的共享入场状态。
// 有自定义入场编排的场景（split-word、stomp-word 等）不走这里。
const useEntranceState = (
  slot: TemplateSlot,
  durationFrames: number,
  textLength: number,
  beatFrames: number[],
): EntranceState => {
  const frame = useCurrentFrame();
  const intensity = slot.motion.intensity ?? 0.72;
  const head = Math.max(4, Math.min(9, durationFrames * 0.5));

  switch (slot.motion.entrance) {
    case "none":
      return { opacity: 1, transform: "none", revealCount: Number.POSITIVE_INFINITY };
    case "wipe": {
      const x = clamp(frame, [0, head], [-90 * (0.5 + intensity), 0]);
      return {
        opacity: clamp(frame, [0, head * 0.7], [0, 1]),
        transform: `translateX(${x}px)`,
        revealCount: Number.POSITIVE_INFINITY,
      };
    }
    case "stomp": {
      const scale = clamp(
        frame,
        [0, head, durationFrames],
        [1.34 + intensity * 0.2, 1, 1.02],
        backOut,
      );
      const settle = clamp(frame, [0, head], [0, 1]);
      return {
        opacity: clamp(frame, [0, 2], [0, 1]),
        transform: `scale(${scale}) rotate(${(1 - settle) * -2}deg)`,
        revealCount: Number.POSITIVE_INFINITY,
      };
    }
    case "slide": {
      const y = clamp(frame, [0, head], [64 * (0.5 + intensity), 0]);
      return {
        opacity: clamp(frame, [0, head * 0.8], [0, 1]),
        transform: `translateY(${y}px)`,
        revealCount: Number.POSITIVE_INFINITY,
      };
    }
    case "scatter": {
      const scale = clamp(frame, [0, head], [1.3, 1], backOut);
      return {
        opacity: clamp(frame, [0, head * 0.6], [0, 1]),
        transform: `scale(${scale})`,
        revealCount: Number.POSITIVE_INFINITY,
      };
    }
    case "typewriter": {
      // 槽内有节拍时按节拍渐进补全（跟 -> 跟上鼓 -> 跟上鼓点放啥），否则匀速打字
      if (beatFrames.length >= 2 && textLength > 0) {
        const chunk = Math.ceil(textLength / beatFrames.length);
        let revealed = 0;
        for (const beat of beatFrames) {
          if (frame >= beat) revealed += chunk;
        }
        return {
          opacity: 1,
          transform: "none",
          revealCount: Math.min(textLength, Math.max(1, revealed)),
        };
      }
      const revealCount = Math.round(
        clamp(
          frame,
          [0, Math.max(6, durationFrames * 0.6)],
          [0, textLength],
          Easing.linear,
        ),
      );
      return { opacity: 1, transform: "none", revealCount: Math.max(1, revealCount) };
    }
    case "scale":
    default: {
      const scale = clamp(
        frame,
        [0, Math.min(7, durationFrames * 0.46), durationFrames],
        [1.22, 1, 1.03],
        backOut,
      );
      const y = clamp(frame, [0, Math.min(8, durationFrames * 0.5)], [48, 0]);
      return {
        opacity: 1,
        transform: `translateY(${y}px) scale(${scale})`,
        revealCount: Number.POSITIVE_INFINITY,
      };
    }
  }
};

const IntroWipeScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  emphasis,
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
          emphasis={emphasis}
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
  emphasis,
  durationFrames,
  baseFontSize,
  beatFrames,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const entrance = useEntranceState(slot, durationFrames, chars.length, beatFrames);
  const visibleText = Number.isFinite(entrance.revealCount)
    ? chars.slice(0, entrance.revealCount).join("")
    : text;

  return (
    <Center slot={slot}>
      <WordBlock
        slot={slot}
        styleOptions={styleOptions}
        text={visibleText}
        sizeReferenceText={text}
        emphasis={emphasis}
        color={resolveForeground(slot, styleOptions)}
        baseFontSize={baseFontSize}
        opacity={entrance.opacity}
        transform={`translate(${jitter(frame, slot.motion.intensity * 2.8)}px, 0px) ${entrance.transform}`}
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
  emphasis,
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
          emphasis={emphasis}
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
  emphasis,
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
          emphasis={emphasis}
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

// 大标题 + 小副标题：标题撞击入场，副标题延迟一拍以宋体小字进入
const TitleSubScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  emphasis,
  subText,
  durationFrames,
  baseFontSize,
  beatFrames,
}) => {
  const frame = useCurrentFrame();
  const foreground = resolveForeground(slot, styleOptions);
  const accent = slot.background.accentColor ?? styleOptions.colors.accent;
  const chars = Array.from(text);
  const entrance = useEntranceState(slot, durationFrames, chars.length, beatFrames);
  const visibleText = Number.isFinite(entrance.revealCount)
    ? chars.slice(0, entrance.revealCount).join("")
    : text;
  const subStart =
    beatFrames.find((beat) => beat > 3) ?? Math.min(10, Math.round(durationFrames * 0.35));
  const subOpacity = clamp(frame, [subStart, subStart + 6], [0, 1]);
  const subY = clamp(frame, [subStart, subStart + 8], [26, 0]);
  const subSize = Math.max(24, baseFontSize * 0.16);

  return (
    <Center slot={slot}>
      {/* 全宽 flex 列：WordBlock 的百分比 maxWidth 必须相对全宽算，
          放进 shrink-to-fit 容器会循环收缩导致标题逐字折行 */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems:
            slot.layout.align === "left"
              ? "flex-start"
              : slot.layout.align === "right"
                ? "flex-end"
                : "center",
          textAlign: slot.layout.align,
        }}
      >
        <WordBlock
          slot={slot}
          styleOptions={styleOptions}
          text={visibleText}
          sizeReferenceText={text}
          emphasis={emphasis}
          color={foreground}
          baseFontSize={baseFontSize}
          opacity={entrance.opacity}
          transform={entrance.transform}
        />
        {subText ? (
          <div
            style={{
              ...fontMap.song,
              color: foreground,
              fontSize: subSize,
              fontWeight: 600,
              letterSpacing: "0.14em",
              lineHeight: 1.5,
              marginTop: Math.max(14, baseFontSize * 0.1),
              opacity: subOpacity,
              transform: `translateY(${subY}px)`,
            }}
          >
            <RichWords
              text={subText}
              emphasis={emphasis}
              emphasisStyle={slot.emphasisStyle ?? "color"}
              accent={accent}
              contrast={styleOptions.colors.background}
            />
          </div>
        ) : null}
      </div>
    </Center>
  );
};

// 原位换词：句架静止，强调位上的词随节拍替换并弹跳入场
const WordSwapScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  swapWords,
  durationFrames,
  baseFontSize,
  beatFrames,
}) => {
  const frame = useCurrentFrame();
  const foreground = resolveForeground(slot, styleOptions);
  const accent = slot.background.accentColor ?? styleOptions.colors.accent;
  const words = swapWords?.length ? swapWords : [text];
  const anchorWord = words[0];
  const anchorIndex = anchorWord ? text.indexOf(anchorWord) : -1;
  // 第一个换词不在句子里时，把换词追加在句尾，保证场景始终可用
  const prefix = anchorIndex >= 0 ? text.slice(0, anchorIndex) : `${text} `;
  const suffix = anchorIndex >= 0 ? text.slice(anchorIndex + anchorWord.length) : "";
  // 节拍多于词数时按跨步取拍，让换词均匀铺满整个槽位
  const switches =
    beatFrames.length >= 2
      ? (() => {
          const stride = Math.max(1, Math.floor(beatFrames.length / words.length));
          return words.map(
            (_, index) =>
              beatFrames[Math.min(index * stride, beatFrames.length - 1)],
          );
        })()
      : Array.from({ length: words.length }, (_, index) =>
          Math.round((index * durationFrames) / Math.max(1, words.length)),
        );
  let active = 0;
  let lastSwitch = 0;
  switches.forEach((beat, index) => {
    if (frame >= beat) {
      active = Math.min(index, words.length - 1);
      lastSwitch = beat;
    }
  });
  const pop = clamp(frame - lastSwitch, [0, 5], [1.36, 1], backOut);
  const longestWord = words.reduce(
    (longest, word) =>
      Array.from(word).length > Array.from(longest).length ? word : longest,
    anchorWord ?? "",
  );
  const size = textSize(`${prefix}${longestWord}${suffix}`, baseFontSize, slot.layout.scale);

  return (
    <Center slot={slot}>
      <div
        style={{
          ...baseTextStyle(slot, styleOptions, foreground, size),
          maxWidth: `${(slot.layout.maxWidth ?? 0.9) * 100}%`,
        }}
      >
        <span>{prefix}</span>
        <span
          key={active}
          style={{
            color: accent,
            display: "inline-block",
            transform: `scale(${pop})`,
            minWidth: "1em",
          }}
        >
          {words[active]}
        </span>
        <span>{suffix}</span>
      </div>
    </Center>
  );
};

// 爆发词：每拍在确定性伪随机位置弹出一个旋转大词，逐拍累积
const BurstWordsScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  durationFrames,
  baseFontSize,
  beatFrames,
}) => {
  const frame = useCurrentFrame();
  const accent = slot.background.accentColor ?? styleOptions.colors.accent;
  const words = slot.burstWords?.length ? slot.burstWords : [text, text, text, text];
  const burstStride =
    beatFrames.length >= 2
      ? Math.max(1, Math.floor(beatFrames.length / words.length))
      : 1;
  const appearAt = words.map(
    (_, index) =>
      beatFrames[Math.min(index * burstStride, beatFrames.length - 1)] ??
      Math.round(((index + 0.5) * durationFrames) / (words.length + 1)),
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {words.map((word, index) => {
        const start = appearAt[index];
        if (frame < start) return null;
        const sinceStart = frame - start;
        const left = 8 + random(`${slot.id}-burst-x-${index}`) * 66;
        const top = 10 + random(`${slot.id}-burst-y-${index}`) * 62;
        const rotate = -30 + random(`${slot.id}-burst-r-${index}`) * 60;
        const sizeScale = 0.78 + random(`${slot.id}-burst-s-${index}`) * 0.7;
        const popScale = clamp(sinceStart, [0, 4], [1.7, 1], backOut);

        return (
          <div
            key={`${word}-${index}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              ...fontMap[styleOptions.fontFamily],
              fontWeight: styleOptions.fontWeight,
              fontSize: baseFontSize * 0.5 * sizeScale * (slot.layout.scale ?? 1),
              color: accent,
              lineHeight: 1,
              transform: `rotate(${rotate}deg) scale(${popScale})`,
              textShadow: `0 10px 30px ${styleOptions.colors.background}66`,
            }}
          >
            {word}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 大字夹注：2~4 个巨字拉开间距，竖排小字延迟一拍出现在字缝里
const CharAnnotationScene: React.FC<SceneProps> = ({
  slot,
  styleOptions,
  text,
  subText,
  durationFrames,
  baseFontSize,
  beatFrames,
}) => {
  const frame = useCurrentFrame();
  const foreground = resolveForeground(slot, styleOptions);
  const chars = Array.from(text).slice(0, 4);
  const midpoint = Math.ceil(chars.length / 2);
  const leftChars = chars.slice(0, midpoint).join("");
  const rightChars = chars.slice(midpoint).join("");
  const size = baseFontSize * (slot.layout.scale ?? 1) * 1.12;
  const spread = clamp(
    frame,
    [0, Math.min(10, durationFrames * 0.5)],
    [size * 0.06, size * 0.3],
  );
  const subStart =
    beatFrames.find((beat) => beat > 4) ?? Math.min(8, Math.round(durationFrames * 0.4));
  const subOpacity = clamp(frame, [subStart, subStart + 5], [0, 1]);
  const opacity = clamp(frame, [0, 4], [0, 1]);
  const scale = clamp(frame, [0, Math.min(8, durationFrames * 0.5)], [1.18, 1], backOut);

  return (
    <Center slot={slot}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div style={baseTextStyle(slot, styleOptions, foreground, size)}>{leftChars}</div>
        <div
          style={{
            width: subText ? undefined : spread,
            margin: `0 ${spread * 0.4}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {subText ? (
            <div
              style={{
                ...fontMap.song,
                color: foreground,
                opacity: subOpacity,
                writingMode: "vertical-rl",
                fontSize: Math.max(20, size * 0.12),
                letterSpacing: "0.34em",
                lineHeight: 1.4,
                fontWeight: 600,
                maxHeight: size * 1.05,
              }}
            >
              {subText}
            </div>
          ) : null}
        </div>
        {rightChars ? (
          <div style={baseTextStyle(slot, styleOptions, foreground, size)}>
            {rightChars}
          </div>
        ) : null}
      </div>
    </Center>
  );
};

type SceneProps = {
  slot: TemplateSlot;
  styleOptions: StyleOptions;
  text: string;
  emphasis: string[];
  subText?: string;
  swapWords?: string[];
  durationFrames: number;
  baseFontSize: number;
  beatFrames: number[];
};

export const KineticTextScene: React.FC<{
  slot: TemplateSlot;
  text: string;
  emphasis?: string[];
  subText?: string;
  swapWords?: string[];
  beatFrames?: number[];
  styleOptions: StyleOptions;
  durationFrames: number;
}> = ({
  slot,
  text,
  emphasis,
  subText,
  swapWords,
  beatFrames,
  styleOptions,
  durationFrames,
}) => {
  const { width, height } = useVideoConfig();
  const baseFontSize = Math.min(width, height) * (styleOptions.fontSize / 1080);
  const safeText = Array.from(text.trim() || slot.defaultText)
    .slice(0, getSlotReadableLimit(slot))
    .join("");
  const frame = useCurrentFrame();
  const flash =
    slot.motion.emphasis.includes("flash") && frame < 3
      ? clamp(frame, [0, 2], [0.05 + slot.motion.intensity * 0.16, 0])
      : 0;
  const glowColor = slot.background.accentColor ?? styleOptions.colors.accent;
  const glowFilter = slot.motion.emphasis.includes("glow")
    ? `drop-shadow(0 0 ${Math.round(10 + slot.motion.intensity * 26)}px ${glowColor})`
    : undefined;

  // 行级 emphasis（来自文案）优先于模板槽位默认强调词
  const sceneProps: SceneProps = {
    slot,
    styleOptions,
    text: safeText,
    emphasis: emphasis?.length ? emphasis : slot.emphasisWords ?? [],
    subText: subText ?? slot.subText,
    swapWords: swapWords?.length ? swapWords : slot.swapWords,
    durationFrames,
    baseFontSize,
    beatFrames: beatFrames ?? [],
  };

  // 运镜层：按槽位时长插值 zoom/pan/rotate；word-card 默认带极轻推进
  const camera = slot.motion.camera;
  const cameraProgress = clamp(
    frame,
    [0, Math.max(1, durationFrames)],
    [0, 1],
    Easing.linear,
  );
  const targetZoom = camera?.zoom ?? (slot.sceneType === "word-card" ? 1.045 : 1);
  const cameraZoom = 1 + (targetZoom - 1) * cameraProgress;
  const cameraX = (camera?.panX ?? 0) * width * 0.06 * cameraProgress;
  const cameraY = (camera?.panY ?? 0) * height * 0.06 * cameraProgress;
  const cameraRotate = (camera?.rotate ?? 0) * cameraProgress;
  const cameraTransform = `scale(${cameraZoom}) translate(${cameraX}px, ${cameraY}px) rotate(${cameraRotate}deg)`;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: styleOptions.colors.background }}>
      <SlotBackground slot={slot} styleOptions={styleOptions} />
      {slot.backdrop?.text ? (
        <AbsoluteFill
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              ...fontMap[styleOptions.fontFamily],
              fontWeight: styleOptions.fontWeight,
              fontSize: baseFontSize * (slot.backdrop.scale ?? 3.2),
              // 浅色底上用深色幽灵字，避免白字白底不可见
              color: isLightColor(resolveBackground(slot, styleOptions))
                ? styleOptions.colors.muted
                : styleOptions.colors.primary,
              opacity: slot.backdrop.opacity ?? 0.12,
              lineHeight: 1,
              whiteSpace: "nowrap",
              transform: `scale(${1 + cameraProgress * 0.06})`,
            }}
          >
            {slot.backdrop.text}
          </div>
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ filter: glowFilter, transform: cameraTransform }}>
        {slot.sceneType === "intro-wipe" ? <IntroWipeScene {...sceneProps} /> : null}
        {slot.sceneType === "word-card" ? <WordCardScene {...sceneProps} /> : null}
        {slot.sceneType === "split-word" ? <SplitWordScene {...sceneProps} /> : null}
        {slot.sceneType === "stomp-word" ? <StompWordScene {...sceneProps} /> : null}
        {slot.sceneType === "letter-scatter" ? <LetterScatterScene {...sceneProps} /> : null}
        {slot.sceneType === "outline-rows" ? <OutlineRowsScene {...sceneProps} /> : null}
        {slot.sceneType === "logo-hold" ? <LogoHoldScene {...sceneProps} /> : null}
        {slot.sceneType === "stacked-title" ? <StackedTitleScene {...sceneProps} /> : null}
        {slot.sceneType === "title-sub" ? <TitleSubScene {...sceneProps} /> : null}
        {slot.sceneType === "word-swap" ? <WordSwapScene {...sceneProps} /> : null}
        {slot.sceneType === "burst-words" ? <BurstWordsScene {...sceneProps} /> : null}
        {slot.sceneType === "char-annotation" ? (
          <CharAnnotationScene {...sceneProps} />
        ) : null}
      </AbsoluteFill>
      {flash > 0 ? (
        <AbsoluteFill style={{ backgroundColor: styleOptions.colors.primary, opacity: flash }} />
      ) : null}
    </AbsoluteFill>
  );
};
