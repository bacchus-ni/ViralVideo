import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRenderDimensions, styleOptionsSchema, type StyleOptions } from "@/lib/schemas";
import { defaultPlan } from "@/lib/templates";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(4).max(800),
  negativePrompt: z.string().max(500).optional(),
  style: styleOptionsSchema.partial().optional(),
});

type QwenImageResponse = {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{
          image?: string;
        }>;
      };
    }>;
  };
  code?: string;
  message?: string;
  request_id?: string;
};

const sizeForStyle = (style: unknown) => {
  const parsed = {
    ...defaultPlan.style,
    ...(typeof style === "object" && style ? style : {}),
    colors: {
      ...defaultPlan.style.colors,
      ...(typeof style === "object" && style && "colors" in style
        ? (style as Partial<StyleOptions>).colors
        : {}),
    },
  };
  const dimensions = getRenderDimensions(parsed);
  const aspect =
    dimensions.width >= dimensions.height
      ? dimensions.width / dimensions.height
      : dimensions.height / dimensions.width;

  if (Math.abs(dimensions.width / dimensions.height - 16 / 9) < 0.08) {
    return "2688*1536";
  }
  if (Math.abs(dimensions.width / dimensions.height - 9 / 16) < 0.08) {
    return "1536*2688";
  }
  if (Math.abs(dimensions.width / dimensions.height - 4 / 3) < 0.08) {
    return "2368*1728";
  }
  if (Math.abs(dimensions.width / dimensions.height - 3 / 4) < 0.08) {
    return "1728*2368";
  }
  if (aspect < 1.12) return "2048*2048";
  return dimensions.width >= dimensions.height ? "2688*1536" : "1536*2688";
};

const firstImageUrl = (payload: QwenImageResponse) =>
  payload.output?.choices
    ?.flatMap((choice) => choice.message?.content ?? [])
    .find((item) => item.image)?.image;

const imageExtension = (contentType: string) => {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "png";
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 QWEN_API_KEY，无法生成背景图片。" },
        { status: 400 },
      );
    }

    const body = requestSchema.parse(await request.json());
    const endpoint =
      process.env.QWEN_IMAGE_ENDPOINT ||
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
    const model = process.env.QWEN_IMAGE_MODEL || "qwen-image-2.0-pro";
    const prompt = `${body.prompt.trim()}

请生成适合作为纯文本混剪短视频的背景图：画面不要出现任何文字、字幕、水印、logo 或 UI，主体留白充足，方便叠加大号中文标题。`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [{ text: prompt }],
            },
          ],
        },
        parameters: {
          negative_prompt:
            body.negativePrompt?.trim() ||
            "文字，字幕，水印，logo，UI，低分辨率，低画质，构图混乱，过度锐化，过饱和，AI感明显",
          prompt_extend: true,
          watermark: false,
          size: sizeForStyle(body.style),
          n: 1,
        },
      }),
    });

    const payload = (await response.json()) as QwenImageResponse;
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.message || payload.code || "千问文生图调用失败。" },
        { status: 400 },
      );
    }

    const remoteImageUrl = firstImageUrl(payload);
    if (!remoteImageUrl) {
      return NextResponse.json(
        { error: "千问文生图没有返回图片地址。" },
        { status: 400 },
      );
    }

    const imageResponse = await fetch(remoteImageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "生成成功，但下载图片失败，请稍后重试。" },
        { status: 400 },
      );
    }

    const contentType = imageResponse.headers.get("content-type") || "image/png";
    const extension = imageExtension(contentType);
    const filename = `qwen-bg-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const outputDir = path.join(process.cwd(), "public", "generated-backgrounds");
    const outputPath = path.join(outputDir, filename);
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, Buffer.from(await imageResponse.arrayBuffer()));

    return NextResponse.json({
      imageUrl: `/generated-backgrounds/${filename}`,
      requestId: payload.request_id,
      model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "生成背景图片失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}
