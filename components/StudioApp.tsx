"use client";

import { useMemo, useState } from "react";
import { GeneratedPlanCard } from "@/components/GeneratedPlanCard";
import { PhonePreview } from "@/components/PhonePreview";
import { PromptComposer } from "@/components/PromptComposer";
import { StyleBar } from "@/components/StyleBar";
import { TemplatePicker } from "@/components/TemplatePicker";
import type { StyleOptions, VideoPlan } from "@/lib/schemas";
import { buildFallbackPlan, defaultPlan, getTemplateById, templates } from "@/lib/templates";

type GenerateResponse = {
  plan: VideoPlan;
  source: "deepseek" | "fallback";
  warning?: string;
  error?: string;
};

type RenderResponse = {
  job?: {
    id: string;
    message: string;
    downloadUrl?: string;
  };
  error?: string;
};

export const StudioApp: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultPlan.templateId);
  const [style, setStyle] = useState<StyleOptions>(defaultPlan.style);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<VideoPlan>(defaultPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("默认示例，可直接预览");
  const [warning, setWarning] = useState<string>();
  const [renderMessage, setRenderMessage] = useState<string>();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [error, setError] = useState<string>();

  const previewPlan = useMemo(
    () => ({
      ...plan,
      templateId: selectedTemplateId,
      style,
    }),
    [plan, selectedTemplateId, style],
  );

  const selectTemplate = (id: string) => {
    const template = getTemplateById(id);
    setSelectedTemplateId(id);
    setStyle(template.defaultStyle);
    setWarning(undefined);
    setDownloadUrl(undefined);
    setSourceLabel(`已选择「${template.name}」模板`);
    setPlan((current) => ({
      ...current,
      templateId: id,
      style: template.defaultStyle,
    }));
  };

  const updateStyle = (nextStyle: StyleOptions) => {
    setStyle(nextStyle);
    setPlan((current) => ({
      ...current,
      style: nextStyle,
    }));
    setDownloadUrl(undefined);
  };

  const generatePlan = async () => {
    const text = prompt.trim();
    if (!text) return;

    setIsGenerating(true);
    setError(undefined);
    setWarning(undefined);
    setRenderMessage(undefined);
    setDownloadUrl(undefined);

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          userPrompt: text,
          style,
        }),
      });
      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "生成失败，请稍后重试。");
      }

      setPlan(payload.plan);
      setStyle(payload.plan.style);
      setSourceLabel(
        payload.source === "deepseek"
          ? "DeepSeek 已生成文案和分镜"
          : "当前使用本地示例兜底，配置 API key 后会调用 DeepSeek",
      );
      setWarning(payload.warning);
    } catch (caught) {
      const fallback = buildFallbackPlan(selectedTemplateId, text, style);
      setPlan(fallback);
      setWarning(caught instanceof Error ? caught.message : "生成失败，已使用示例。");
      setSourceLabel("已使用本地示例兜底");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderVideo = async () => {
    setIsRendering(true);
    setError(undefined);
    setRenderMessage(undefined);

    try {
      const response = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: previewPlan }),
      });
      const payload = (await response.json()) as RenderResponse;

      if (!response.ok || payload.error || !payload.job) {
        throw new Error(payload.error || "创建渲染任务失败。");
      }

      setRenderMessage(payload.job.message);
      setDownloadUrl(payload.job.downloadUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成视频失败。");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <main className="app-shell">
      <TemplatePicker
        templates={templates}
        selectedId={selectedTemplateId}
        onSelect={selectTemplate}
      />

      <div className="workspace">
        <PromptComposer
          value={prompt}
          isGenerating={isGenerating}
          onChange={setPrompt}
          onGenerate={generatePlan}
        />

        <GeneratedPlanCard
          plan={previewPlan}
          sourceLabel={sourceLabel}
          warning={warning}
          onChange={setPlan}
        />

        <StyleBar value={style} onChange={updateStyle} />
        {error ? <p className="error-note">{error}</p> : null}
      </div>

      <PhonePreview
        plan={previewPlan}
        isRendering={isRendering}
        renderMessage={renderMessage}
        downloadUrl={downloadUrl}
        onRender={renderVideo}
      />
    </main>
  );
};
