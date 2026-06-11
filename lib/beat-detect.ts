import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SAMPLE_RATE = 22050;
const HOP_SIZE = 512;
const WINDOW_SIZE = 1024;
// schema 里 beatMarkers 的上限
const MAX_BEATS = 80;
const MAX_BEAT_SECONDS = 60;
// 两个鼓点之间的最小间隔，过滤同一击打的多次触发
const MIN_ONSET_GAP_SEC = 0.18;

type Onset = { timeSec: number; strength: number };

// 用 ffmpeg 把任意媒体解码成单声道 16bit PCM。
// 与 analyze-template-video 一致：优先 remotion 自带 ffmpeg，失败回退系统 ffmpeg
const decodePcm = async (inputPath: string): Promise<Float32Array> => {
  const args = [
    "-v",
    "error",
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    String(SAMPLE_RATE),
    "-f",
    "s16le",
    "-",
  ];
  const remotionBin = path.join(process.cwd(), "node_modules", ".bin", "remotion");
  const options = {
    cwd: process.cwd(),
    timeout: 90 * 1000,
    maxBuffer: 1024 * 1024 * 256,
    encoding: "buffer" as const,
  };

  let stdout: Buffer;
  try {
    ({ stdout } = await execFileAsync(remotionBin, ["ffmpeg", ...args], options));
  } catch {
    ({ stdout } = await execFileAsync("ffmpeg", args, options));
  }

  const samples = new Float32Array(Math.floor(stdout.length / 2));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = stdout.readInt16LE(i * 2) / 32768;
  }
  return samples;
};

// 能量通量 onset 检测：全频能量差 + 低频（鼓点）能量差加权，
// 再用滑动窗口的均值 + 标准差做自适应阈值取局部峰值
const detectOnsets = (samples: Float32Array, sampleRate: number): Onset[] => {
  const frameCount = Math.floor((samples.length - WINDOW_SIZE) / HOP_SIZE);
  if (frameCount <= 4) return [];

  // 一阶低通（~150Hz）突出底鼓
  const alpha = Math.exp((-2 * Math.PI * 150) / sampleRate);
  const lowPassed = new Float32Array(samples.length);
  let lp = 0;
  for (let i = 0; i < samples.length; i += 1) {
    lp = alpha * lp + (1 - alpha) * samples[i];
    lowPassed[i] = lp;
  }

  const energies = new Float32Array(frameCount);
  const lowEnergies = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const offset = frame * HOP_SIZE;
    let energy = 0;
    let lowEnergy = 0;
    for (let i = 0; i < WINDOW_SIZE; i += 1) {
      const sample = samples[offset + i];
      const low = lowPassed[offset + i];
      energy += sample * sample;
      lowEnergy += low * low;
    }
    energies[frame] = energy / WINDOW_SIZE;
    lowEnergies[frame] = lowEnergy / WINDOW_SIZE;
  }

  const flux = new Float32Array(frameCount);
  for (let frame = 1; frame < frameCount; frame += 1) {
    flux[frame] =
      Math.max(0, energies[frame] - energies[frame - 1]) +
      2 * Math.max(0, lowEnergies[frame] - lowEnergies[frame - 1]);
  }

  const onsets: Onset[] = [];
  const thresholdWindow = Math.round(sampleRate / HOP_SIZE);
  const minGapFrames = Math.round((MIN_ONSET_GAP_SEC * sampleRate) / HOP_SIZE);
  let lastOnsetFrame = -minGapFrames;

  for (let frame = 2; frame < frameCount - 1; frame += 1) {
    const start = Math.max(0, frame - thresholdWindow);
    const end = Math.min(frameCount, frame + thresholdWindow);
    let mean = 0;
    for (let i = start; i < end; i += 1) mean += flux[i];
    mean /= end - start;
    let variance = 0;
    for (let i = start; i < end; i += 1) {
      const diff = flux[i] - mean;
      variance += diff * diff;
    }
    const std = Math.sqrt(variance / (end - start));
    const threshold = mean + 1.3 * std + 1e-6;

    const isPeak = flux[frame] >= flux[frame - 1] && flux[frame] >= flux[frame + 1];
    if (flux[frame] > threshold && isPeak && frame - lastOnsetFrame >= minGapFrames) {
      onsets.push({
        timeSec: (frame * HOP_SIZE + WINDOW_SIZE / 2) / sampleRate,
        strength: flux[frame] - mean,
      });
      lastOnsetFrame = frame;
    }
  }

  return onsets;
};

/**
 * 从音/视频文件本地检测鼓点时间（秒）。
 * 检测不到足够节拍或 ffmpeg 失败时返回 undefined，调用方静默回退到估算值。
 */
export const detectBeatsFromMedia = async (
  inputPath: string,
): Promise<number[] | undefined> => {
  try {
    const samples = await decodePcm(inputPath);
    if (samples.length < SAMPLE_RATE) return undefined;

    const onsets = detectOnsets(samples, SAMPLE_RATE).filter(
      (onset) => onset.timeSec <= MAX_BEAT_SECONDS,
    );
    if (onsets.length < 4) return undefined;

    const strongest =
      onsets.length > MAX_BEATS
        ? [...onsets]
            .sort((a, b) => b.strength - a.strength)
            .slice(0, MAX_BEATS)
            .sort((a, b) => a.timeSec - b.timeSec)
        : onsets;

    return strongest.map((onset) => Number(onset.timeSec.toFixed(3)));
  } catch {
    return undefined;
  }
};
