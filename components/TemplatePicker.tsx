"use client";

import { CheckCircle2 } from "lucide-react";
import type { TemplatePreset } from "@/lib/templates";

type TemplatePickerProps = {
  templates: TemplatePreset[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  templates,
  selectedId,
  onSelect,
}) => {
  return (
    <aside className="template-panel" aria-label="选择模板">
      <h1>选择模板</h1>
      <div className="template-list">
        {templates.map((template) => {
          const selected = template.id === selectedId;

          return (
            <button
              key={template.id}
              className={`template-card ${selected ? "is-selected" : ""}`}
              onClick={() => onSelect(template.id)}
              type="button"
            >
              <span className={`template-thumb thumb-${template.thumbnail}`}>
                <span>{template.name.slice(0, 4)}</span>
              </span>
              <span className="template-copy">
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </span>
              {selected ? (
                <CheckCircle2 className="template-check" aria-hidden size={24} />
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
