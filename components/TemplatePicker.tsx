"use client";

import { CheckCircle2, Settings2 } from "lucide-react";
import type { TemplatePreset } from "@/lib/templates";

type TemplatePickerProps = {
  templates: TemplatePreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
};

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  templates,
  selectedId,
  onSelect,
  onManage,
}) => {
  return (
    <aside className="template-panel" aria-label="选择模板">
      <div className="template-heading">
        <h1>选择模板</h1>
        <button type="button" className="manage-template-button" onClick={onManage}>
          <Settings2 size={18} aria-hidden />
          管理模板
        </button>
      </div>
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
