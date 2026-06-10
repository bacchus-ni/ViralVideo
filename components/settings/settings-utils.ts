import type { StyleOptions } from "@/lib/schemas";
import type { PalettePreset } from "@/lib/style-presets";

export const customPaletteStorageKey = "textMixCustomPalettes";

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("文件读取失败"));
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });

export const readCustomPalettes = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(customPaletteStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PalettePreset[]) : [];
  } catch {
    return [];
  }
};

export const writeCustomPalettes = (palettes: PalettePreset[]) => {
  window.localStorage.setItem(customPaletteStorageKey, JSON.stringify(palettes));
};

export const mergeStylePatch = (
  current: StyleOptions,
  patch: Partial<StyleOptions>,
): StyleOptions => ({
  ...current,
  ...patch,
  colors: {
    ...current.colors,
    ...(patch.colors ?? {}),
  },
});
