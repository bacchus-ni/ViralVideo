import type { CSSProperties } from "react";
import type { StyleOptions } from "../../lib/schemas";

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;

export const fontMap: Record<StyleOptions["fontFamily"], CSSProperties> = {
  hei: {
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", "Arial Black", Arial, sans-serif',
  },
  song: {
    fontFamily:
      '"Songti SC", "Noto Serif CJK SC", "SimSun", Georgia, serif',
  },
  yuan: {
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  },
  serif: {
    fontFamily:
      '"Noto Serif CJK SC", "Songti SC", "Times New Roman", serif',
  },
};

export const paceMultiplier: Record<StyleOptions["pace"], number> = {
  slow: 0.82,
  medium: 1,
  fast: 1.2,
};
