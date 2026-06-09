import { NextResponse } from "next/server";
import { createRenderJob } from "@/lib/render";
import { renderVideoRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan } = renderVideoRequestSchema.parse(body);
    const job = await createRenderJob(plan);

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "创建渲染任务失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}
