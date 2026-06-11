import type { VideoPlan } from "@/lib/schemas";
import { getRenderDimensions } from "@/lib/schemas";
import { execFile } from "child_process";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type RenderResult = {
  id: string;
  status: "done";
  message: string;
  downloadUrl: string;
};

export const createRenderJob = async (plan: VideoPlan): Promise<RenderResult> => {
  const id = `render-${Date.now()}`;
  const dimensions = getRenderDimensions(plan.style);
  const entryPoint = path.join(process.cwd(), "remotion", "index.ts");
  const outputDir = path.join(process.cwd(), "public", "renders");
  const propsDir = path.join(process.cwd(), ".render-props");
  const outputFilename = `${id}.mp4`;
  const outputLocation = path.join(outputDir, outputFilename);
  const propsLocation = path.join(propsDir, `${id}.json`);
  const remotionBin = path.join(process.cwd(), "node_modules", ".bin", "remotion");
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;

  await mkdir(outputDir, { recursive: true });
  await mkdir(propsDir, { recursive: true });
  await writeFile(propsLocation, JSON.stringify({ plan }), "utf8");

  try {
    await execFileAsync(
      remotionBin,
      [
        "render",
        entryPoint,
        "TextMixComposition",
        outputLocation,
        `--props=${propsLocation}`,
        `--width=${dimensions.width}`,
        `--height=${dimensions.height}`,
        "--concurrency=1",
        "--overwrite",
        ...(browserExecutable ? [`--browser-executable=${browserExecutable}`] : []),
      ],
      {
        cwd: process.cwd(),
        timeout: 10 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 10,
      },
    );
  } finally {
    await unlink(propsLocation).catch(() => undefined);
  }

  return {
    id,
    status: "done",
    message: `《${plan.title}》已导出 ${dimensions.width}x${dimensions.height} MP4。`,
    downloadUrl: `/renders/${outputFilename}`,
  };
};
