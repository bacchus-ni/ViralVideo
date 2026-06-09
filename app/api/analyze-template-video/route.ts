import { NextResponse } from "next/server";
import { styleOptionsSchema } from "@/lib/schemas";
import { getPalettePreset } from "@/lib/style-presets";
import { defaultPlan } from "@/lib/templates";

export const runtime = "nodejs";

type QwenResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const extractJson = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("千问返回内容中没有 JSON。");
  return match[0];
};

const systemPrompt = `你是一个短视频模板分析助手。
用户会上传一段 demo 视频。请分析它的文字视频风格、配色、字体气质、背景类型、节奏，并生成可用于纯文本混剪的模板草稿。

只输出 JSON，不要输出 Markdown。JSON 形状：
{
  "name": "模板名，6字以内",
  "description": "适合什么内容",
  "promptHint": "给文案生成模型的模板风格提示",
  "style": {
    "palette": "gold|blue|white|dark|fresh|macaron|custom",
    "colors": {"background":"#000000","surface":"#111111","primary":"#ffffff","accent":"#e7b84b","muted":"#897247"},
    "fontFamily": "hei|song|yuan|serif",
    "fontSize": 72到260之间的数字,
    "fontWeight": 300到1000之间的数字,
    "backgroundStyle": "particles|gradient|solid|image",
    "pace": "slow|medium|fast"
  }
}`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 QWEN_API_KEY，无法解析 demo 视频。" },
        { status: 400 },
      );
    }

    const form = await request.formData();
    const file = form.get("video");
    const baseStyleRaw = form.get("baseStyle");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传 demo 视频。" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "当前 demo 视频请控制在 20MB 以内。" },
        { status: 400 },
      );
    }

    const baseStyle =
      typeof baseStyleRaw === "string"
        ? styleOptionsSchema.partial().parse(JSON.parse(baseStyleRaw))
        : defaultPlan.style;
    const bytes = Buffer.from(await file.arrayBuffer());
    const videoUrl = `data:${file.type || "video/mp4"};base64,${bytes.toString("base64")}`;
    const baseURL =
      process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

    const response = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.QWEN_VL_MODEL || "qwen3-vl-plus",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "video_url",
                video_url: { url: videoUrl },
              },
              {
                type: "text",
                text: "请分析这个 demo 视频，生成一个纯文本混剪模板草稿。",
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const payload = (await response.json()) as QwenResponse;
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message || "千问视频解析失败。" },
        { status: 400 },
      );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("千问返回为空。");

    const parsed = JSON.parse(extractJson(content));
    const preset = getPalettePreset(parsed?.style?.palette ?? "gold");
    const style = styleOptionsSchema.partial().parse({
      ...baseStyle,
      ...parsed.style,
      colors: {
        ...preset.colors,
        ...(baseStyle.colors ?? {}),
        ...(parsed.style?.colors ?? {}),
      },
    });

    return NextResponse.json({
      template: {
        name: parsed.name || "视频模板",
        description: parsed.description || "从 demo 视频解析生成",
        promptHint: parsed.promptHint || "参考 demo 视频的节奏、配色和文字风格。",
        style,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "解析 demo 视频失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}
