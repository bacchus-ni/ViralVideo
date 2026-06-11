"use client";

import { useEffect, useMemo, useState } from "react";
import { GeneratedPlanCard } from "@/components/GeneratedPlanCard";
import { PhonePreview } from "@/components/PhonePreview";
import { PromptComposer } from "@/components/PromptComposer";
import { StyleBar } from "@/components/StyleBar";
import { TemplateManagerModal } from "@/components/TemplateManagerModal";
import { TemplatePicker } from "@/components/TemplatePicker";
import type { StyleOptions, VideoPlan } from "@/lib/schemas";
import {
  buildFallbackPlan,
  defaultPlan,
  getTemplateById,
  templates,
  type TemplatePreset,
} from "@/lib/templates";

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

const customTemplateStorageKey = "textMixCustomTemplates";
const deletedTemplateStorageKey = "textMixDeletedTemplateIds";

const readCustomTemplates = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(customTemplateStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TemplatePreset[]) : [];
  } catch {
    return [];
  }
};

const readDeletedTemplateIds = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(deletedTemplateStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

export const StudioApp: React.FC = () => {
  const [customTemplates, setCustomTemplates] = useState<TemplatePreset[]>([]);
  const [deletedTemplateIds, setDeletedTemplateIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultPlan.templateId);
  const [style, setStyle] = useState<StyleOptions>(defaultPlan.style);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<VideoPlan>(defaultPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("默认示例，可直接预览");
  const [warning, setWarning] = useState<string>();
  const [renderMessage, setRenderMessage] = useState<string>();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  useEffect(() => {
    setCustomTemplates(readCustomTemplates());
    setDeletedTemplateIds(readDeletedTemplateIds());
  }, []);

  useEffect(() => {
    if (!isRendering) return undefined;
    setRenderProgress((current) => Math.max(current, 8));
    const timer = window.setInterval(() => {
      setRenderProgress((current) => {
        if (current >= 92) return current;
        const step = current < 35 ? 7 : current < 72 ? 4 : 1.4;
        return Math.min(92, current + step);
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, [isRendering]);

  const allTemplates = useMemo(
    () =>
      [...templates, ...customTemplates].filter(
        (template) => !deletedTemplateIds.includes(template.id),
      ),
    [customTemplates, deletedTemplateIds],
  );

  const previewPlan = useMemo(
    () => ({
      ...plan,
      templateId: selectedTemplateId,
      style,
      advancedTemplate: plan.advancedTemplate,
    }),
    [plan, selectedTemplateId, style],
  );

  const selectedTemplate = useMemo(
    () =>
      allTemplates.find((candidate) => candidate.id === selectedTemplateId) ??
      getTemplateById(selectedTemplateId),
    [allTemplates, selectedTemplateId],
  );
  const defaultMusicUrl =
    plan.advancedTemplate?.audio?.url ?? selectedTemplate.defaultStyle.musicUrl;
  const defaultMusicVolume =
    plan.advancedTemplate?.audio?.volume ?? selectedTemplate.defaultStyle.musicVolume;

  const selectTemplate = (id: string) => {
    const template =
      allTemplates.find((candidate) => candidate.id === id) ?? getTemplateById(id);
    setSelectedTemplateId(id);
    setStyle(template.defaultStyle);
    setWarning(undefined);
    setDownloadUrl(undefined);
    setSourceLabel(`已选择「${template.name}」模板`);
    setPlan((current) => ({
      ...current,
      templateId: id,
      style: template.defaultStyle,
      advancedTemplate: template.advancedTemplate,
    }));
  };

  const createTemplate = (template: TemplatePreset) => {
    const next = [template, ...customTemplates].slice(0, 20);
    setCustomTemplates(next);
    window.localStorage.setItem(customTemplateStorageKey, JSON.stringify(next));
    const restoredDeletedIds = deletedTemplateIds.filter((id) => id !== template.id);
    setDeletedTemplateIds(restoredDeletedIds);
    window.localStorage.setItem(
      deletedTemplateStorageKey,
      JSON.stringify(restoredDeletedIds),
    );
    setSelectedTemplateId(template.id);
    setStyle(template.defaultStyle);
    setPlan((current) => ({
      ...current,
      templateId: template.id,
      style: template.defaultStyle,
      advancedTemplate: template.advancedTemplate,
    }));
    setSourceLabel(`已创建并选择「${template.name}」模板`);
  };

  const deleteTemplate = (id: string) => {
    const templateToDelete = allTemplates.find((template) => template.id === id);
    if (!templateToDelete) return;
    const confirmed = window.confirm(`确定删除「${templateToDelete.name}」模板吗？`);
    if (!confirmed) return;

    const nextCustomTemplates = customTemplates.filter(
      (template) => template.id !== id,
    );
    const isPresetTemplate = templates.some((template) => template.id === id);
    const nextDeletedTemplateIds = isPresetTemplate
      ? Array.from(new Set([...deletedTemplateIds, id]))
      : deletedTemplateIds.filter((templateId) => templateId !== id);
    const nextTemplates = [...templates, ...nextCustomTemplates].filter(
      (template) => !nextDeletedTemplateIds.includes(template.id),
    );

    setCustomTemplates(nextCustomTemplates);
    setDeletedTemplateIds(nextDeletedTemplateIds);
    window.localStorage.setItem(
      customTemplateStorageKey,
      JSON.stringify(nextCustomTemplates),
    );
    window.localStorage.setItem(
      deletedTemplateStorageKey,
      JSON.stringify(nextDeletedTemplateIds),
    );

    if (selectedTemplateId === id) {
      const fallbackTemplate = nextTemplates[0] ?? templates[0];
      setSelectedTemplateId(fallbackTemplate.id);
      setStyle(fallbackTemplate.defaultStyle);
      setPlan((current) => ({
        ...current,
        templateId: fallbackTemplate.id,
        style: fallbackTemplate.defaultStyle,
        advancedTemplate: fallbackTemplate.advancedTemplate,
      }));
      setSourceLabel(`已删除「${templateToDelete.name}」，并切换到「${fallbackTemplate.name}」模板`);
    } else {
      setSourceLabel(`已删除「${templateToDelete.name}」模板`);
    }
    setDownloadUrl(undefined);
    setWarning(undefined);
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
      const selectedTemplate =
        allTemplates.find((candidate) => candidate.id === selectedTemplateId) ??
        getTemplateById(selectedTemplateId);
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          templateName: selectedTemplate.name,
          templateDescription: selectedTemplate.description,
          templatePromptHint: selectedTemplate.promptHint,
          advancedTemplate: selectedTemplate.advancedTemplate,
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
      const selectedTemplate =
        allTemplates.find((candidate) => candidate.id === selectedTemplateId) ??
        getTemplateById(selectedTemplateId);
      setPlan({
        ...fallback,
        advancedTemplate: selectedTemplate.advancedTemplate,
      });
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
    setRenderProgress(6);

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
      setRenderProgress(100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成视频失败。");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <main className="app-shell">
      <TemplatePicker
        templates={allTemplates}
        selectedId={selectedTemplateId}
        onSelect={selectTemplate}
        onManage={() => setIsTemplateManagerOpen(true)}
        onDelete={deleteTemplate}
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

        <StyleBar
          value={style}
          onChange={updateStyle}
          defaultMusicUrl={defaultMusicUrl}
          defaultMusicVolume={defaultMusicVolume}
        />
        {error ? <p className="error-note">{error}</p> : null}
      </div>

      <PhonePreview
        plan={previewPlan}
        isRendering={isRendering}
        renderMessage={renderMessage}
        downloadUrl={downloadUrl}
        renderProgress={renderProgress}
        isPreviewMuted={isPreviewMuted}
        onTogglePreviewMute={() => setIsPreviewMuted((current) => !current)}
        onRender={renderVideo}
      />

      <TemplateManagerModal
        open={isTemplateManagerOpen}
        baseStyle={style}
        onClose={() => setIsTemplateManagerOpen(false)}
        onCreate={createTemplate}
      />
    </main>
  );
};
