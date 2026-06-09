import { NextResponse } from "next/server";
import { generatePlanWithDeepSeek } from "@/lib/deepseek";
import { generatePlanRequestSchema } from "@/lib/schemas";
import { buildFallbackPlan } from "@/lib/templates";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = generatePlanRequestSchema.parse(body);

    try {
      const plan = await generatePlanWithDeepSeek(input);
      return NextResponse.json({
        plan,
        source: "deepseek",
      });
    } catch (error) {
      const plan = buildFallbackPlan(
        input.templateId,
        input.userPrompt,
        input.style,
      );

      return NextResponse.json({
        plan,
        source: "fallback",
        warning:
          error instanceof Error
            ? error.message
            : "DeepSeek 生成失败，已使用本地示例。",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "请求参数无效，请重新填写需求。",
      },
      { status: 400 },
    );
  }
}
