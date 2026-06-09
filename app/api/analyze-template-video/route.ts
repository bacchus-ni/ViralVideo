import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { styleOptionsSchema } from "@/lib/schemas";
import {
  normalizeAdvancedTemplate,
  summarizeAdvancedTemplate,
} from "@/lib/advanced-template";
import { getPalettePreset } from "@/lib/style-presets";
import { defaultPlan } from "@/lib/templates";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

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

const safeExtension = (mimeType: string) => {
  if (mimeType.includes("quicktime")) return "mov";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("x-matroska")) return "mkv";
  return "mp4";
};

const extractAudioFromDemoVideo = async (
  videoBytes: Buffer,
  mimeType: string,
) => {
  const id = `demo-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uploadDir = path.join(process.cwd(), ".uploads", "template-videos");
  const audioDir = path.join(process.cwd(), "public", "music", "template-audio");
  const inputPath = path.join(uploadDir, `${id}.${safeExtension(mimeType)}`);
  const outputFilename = `${id}.mp4`;
  const outputPath = path.join(audioDir, outputFilename);
  const remotionBin = path.join(process.cwd(), "node_modules", ".bin", "remotion");

  await mkdir(uploadDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await writeFile(inputPath, videoBytes);

  const ffmpegArgs = [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-map",
    "0:a:0?",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  try {
    try {
      await execFileAsync(
        remotionBin,
        ["ffmpeg", ...ffmpegArgs],
        {
          cwd: process.cwd(),
          timeout: 90 * 1000,
          maxBuffer: 1024 * 1024 * 8,
        },
      );
    } catch {
      await execFileAsync("ffmpeg", ffmpegArgs, {
        cwd: process.cwd(),
        timeout: 90 * 1000,
        maxBuffer: 1024 * 1024 * 8,
      });
    }

    return {
      url: `/music/template-audio/${outputFilename}`,
      volume: 0.22,
    };
  } catch {
    return undefined;
  } finally {
    await unlink(inputPath).catch(() => undefined);
  }
};

const systemPrompt = `你是一个短视频模板拆解师。
用户会上传一段 demo 视频。请分析它的文字视频风格、配色、字体气质、背景类型、节奏、转场、运镜、文字动画和镜头时间线，并生成可用于 Remotion 纯文本混剪的模板草稿。

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
  },
  "advancedTemplate": {
    "name": "高级模板名",
    "description": "模板结构说明",
    "durationSec": 视频总时长秒数，可估算,
    "fps": 帧率，可估算,
    "aspectRatio": "9:16|16:9|1:1|4:3|3:4|custom",
    "style": {
      "palette": "gold|blue|white|dark|fresh|macaron|custom",
      "colors": {"background":"#000000","surface":"#111111","primary":"#ffffff","accent":"#e7b84b","muted":"#897247"},
      "fontFamily": "hei|song|yuan|serif",
      "fontSize": 72到260之间的数字,
      "fontWeight": 300到1000之间的数字,
      "backgroundStyle": "particles|gradient|solid|image",
      "motionIntensity": 0到1之间的数字
    },
    "beatMarkers": [0, 0.5, 1.0],
    "flashCuts": [0.5, 1.0],
    "slots": [
      {
        "id": "slot-1",
        "startSec": 0,
        "durationSec": 0.5,
        "sceneType": "intro-wipe|word-card|split-word|stomp-word|letter-scatter|outline-rows|logo-hold|blank-color|stacked-title",
        "textRole": "hook|keyword|point|brand|ending|filler",
        "defaultText": "该镜头默认文字",
        "maxChars": 8,
        "visualDescription": "画面、文字入场、转场说明",
        "layout": {"align":"center|left|right","vertical":"center|top|bottom","maxWidth":0.8,"scale":1,"rotate":0,"rows":8,"split":"none|horizontal|vertical|letters"},
        "motion": {"entrance":"wipe|stomp|slide|scale|scatter|typewriter|none","emphasis":["jitter","flash","skew","clip-split","outline","repeat-rows"],"easing":"expo-out|linear|back-out|snap","intensity":0.8},
        "background": {"type":"solid|gradient|particles|image|transparent","colorRole":"background|surface|primary|accent|muted","color":"#050505","accentColor":"#e7b84b"},
        "transitionOut": {"type":"cut|flash-cut|wipe|fade","durationSec":0.08}
      }
    ]
  }
}

要求：
1. 不要只描述浅层风格，必须逐镜头拆 slots。
2. sceneType 和 motion 枚举必须从上面选择，不要发明新值。
3. startSec、durationSec、beatMarkers、flashCuts 可以估算，但必须顺序合理。
4. 如果视频是强节奏文字快剪，应优先使用 intro-wipe、word-card、split-word、stomp-word、letter-scatter、outline-rows、logo-hold、blank-color。
5. 输出 slots 数量建议 8 到 20 个。
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
    const extractedAudio = await extractAudioFromDemoVideo(
      bytes,
      file.type || "video/mp4",
    );
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
    const advancedTemplate = normalizeAdvancedTemplate(
      parsed.advancedTemplate ?? parsed,
      {
        ...defaultPlan.style,
        ...baseStyle,
        ...style,
        musicUrl: extractedAudio?.url ?? style.musicUrl ?? baseStyle.musicUrl,
        musicVolume:
          extractedAudio?.volume ?? style.musicVolume ?? baseStyle.musicVolume,
        colors: {
          ...defaultPlan.style.colors,
          ...(baseStyle.colors ?? {}),
          ...(style.colors ?? {}),
        },
      },
      {
        name: parsed.name || "视频模板",
        description: parsed.description || "从 demo 视频解析生成",
        source: "qwen-video",
      },
    );
    const mergedStyle = styleOptionsSchema.partial().parse({
      ...style,
      ...(advancedTemplate.style ?? {}),
      colors: {
        ...(style.colors ?? {}),
        ...(advancedTemplate.style?.colors ?? {}),
      },
      aspectRatio: advancedTemplate.aspectRatio,
      musicUrl: extractedAudio?.url ?? style.musicUrl ?? baseStyle.musicUrl,
      musicVolume:
        extractedAudio?.volume ?? style.musicVolume ?? baseStyle.musicVolume ?? 0.2,
    });
    const templateWithAudio = {
      ...advancedTemplate,
      audio:
        extractedAudio?.url
          ? {
              url: extractedAudio.url,
              volume: extractedAudio.volume,
              loop: true,
            }
          : advancedTemplate.audio,
    };

    return NextResponse.json({
      template: {
        name: parsed.name || "视频模板",
        description: parsed.description || "从 demo 视频解析生成",
        promptHint: parsed.promptHint || "参考 demo 视频的节奏、配色和文字风格。",
        style: mergedStyle,
        advancedTemplate: templateWithAudio,
        advancedSummary: summarizeAdvancedTemplate(templateWithAudio),
        extractedAudioUrl: extractedAudio?.url,
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
