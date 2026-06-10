"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type SettingsModalProps = {
  title: string;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  onClose: () => void;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  title,
  ariaLabel,
  className,
  contentClassName,
  headerAction,
  children,
  onClose,
}) => (
  <div className="settings-backdrop" role="presentation" onClick={onClose}>
    <section
      className={`settings-modal ${className ?? ""}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="settings-header">
        <h3>{title}</h3>
        <div className="settings-header-actions">
          {headerAction}
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </div>
      </header>
      <div className={`settings-content ${contentClassName ?? ""}`.trim()}>
        {children}
      </div>
    </section>
  </div>
);
