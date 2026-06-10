"use client";

import type { ReactNode } from "react";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const ColorField: React.FC<ColorFieldProps> = ({
  label,
  value,
  onChange,
}) => (
  <label className="color-field">
    <span>{label}</span>
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

export const RangeField: React.FC<RangeFieldProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}) => (
  <label className="settings-field">
    <span>{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

type UploadDropzoneProps = {
  icon: ReactNode;
  label: string;
  accept: string;
  compact?: boolean;
  disabled?: boolean;
  onUpload: (file: File | undefined) => void;
};

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  icon,
  label,
  accept,
  compact,
  disabled,
  onUpload,
}) => (
  <label className={`upload-dropzone ${compact ? "compact-upload" : ""}`.trim()}>
    {icon}
    {label}
    <input
      type="file"
      accept={accept}
      disabled={disabled}
      onChange={(event) => onUpload(event.target.files?.[0])}
    />
  </label>
);

type ProgressBlockProps = {
  title: string;
  value: number;
  description: string;
  rightLabel?: string;
  compact?: boolean;
};

export const ProgressBlock: React.FC<ProgressBlockProps> = ({
  title,
  value,
  description,
  rightLabel,
  compact,
}) => (
  <div
    className={`analysis-progress ${compact ? "compact-progress" : ""}`.trim()}
    role="status"
    aria-live="polite"
  >
    <div className="analysis-progress-header">
      <span>{title}</span>
      <strong>{rightLabel ?? `${Math.round(value)}%`}</strong>
    </div>
    <div className="analysis-progress-track">
      <span style={{ width: `${Math.max(6, Math.min(100, value))}%` }} />
    </div>
    <p>{description}</p>
  </div>
);
