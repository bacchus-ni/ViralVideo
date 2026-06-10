"use client";

import { CheckCircle2, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { TemplatePreset } from "@/lib/templates";

type TemplatePickerProps = {
  templates: TemplatePreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
  onDelete: (id: string) => void;
};

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  templates,
  selectedId,
  onSelect,
  onManage,
  onDelete,
}) => {
  const [menu, setMenu] = useState<{
    template: TemplatePreset;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

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
              onContextMenu={(event) => {
                event.preventDefault();
                setMenu({
                  template,
                  x: Math.min(event.clientX, window.innerWidth - 180),
                  y: Math.min(event.clientY, window.innerHeight - 58),
                });
              }}
              type="button"
            >
              <span className={`template-thumb thumb-${template.thumbnail}`}>
                <span>{template.name.slice(0, 4)}</span>
              </span>
              <span className="template-copy">
                <strong>
                  {template.name}
                  {template.advancedTemplate ? (
                    <span className="template-type-badge">高级</span>
                  ) : null}
                </strong>
                <small>{template.description}</small>
              </span>
              {selected ? (
                <CheckCircle2 className="template-check" aria-hidden size={24} />
              ) : null}
            </button>
          );
        })}
      </div>
      {menu ? (
        <div
          className="template-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="template-context-danger"
            role="menuitem"
            onClick={() => {
              onDelete(menu.template.id);
              setMenu(null);
            }}
          >
            <Trash2 size={16} aria-hidden />
            删除模板
          </button>
        </div>
      ) : null}
    </aside>
  );
};
