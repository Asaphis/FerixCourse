import { type ReactNode, useState, useEffect, useRef } from "react";
import { Icon, type IconName } from "../icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && closeOnEscape) onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) onClose();
  };

  return (
    <div
      className="fc-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div className={`fc-modal fc-modal-${size}`}>
        {(title || description) && (
          <div className="fc-modal-header">
            {title && <h2 id="modal-title" className="fc-modal-title">{title}</h2>}
            {description && <p id="modal-description" className="fc-modal-description">{description}</p>}
            <button
              type="button"
              className="fc-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <Icon name="x" size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="fc-modal-content">{children}</div>
      </div>
    </div>
  );
};