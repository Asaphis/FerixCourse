"use client";
import type { ButtonHTMLAttributes, ReactNode, ForwardRefExoticComponent, RefAttributes } from "react";
import { forwardRef } from "react";
import { Icon, type IconName } from "../icons";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: IconName;
  rightIcon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles = "fc-btn fc-btn-modern";
    const variantStyles = `fc-btn-${variant}`;
    const sizeStyles = `fc-btn-${size}`;
    const widthStyles = fullWidth ? "fc-btn-full" : "";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`.trim()}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="fc-btn-spinner" aria-hidden="true">
              <Icon name="loader" size={16} className="fc-spin" />
            </span>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <Icon name={leftIcon} size={16} aria-hidden="true" />}
            <span>{children}</span>
            {rightIcon && <Icon name={rightIcon} size={16} aria-hidden="true" />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card = ({
  children,
  className = "",
  variant = "default",
  padding = "md",
  hoverable = false,
  onClick,
}: CardProps) => {
  const variantStyles = `fc-card fc-card-${variant}`;
  const paddingStyles = `fc-card-p-${padding}`;
  const hoverStyles = hoverable || onClick ? "fc-card-hover" : "";
  const clickableStyles = onClick ? "fc-card-clickable" : "";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`${variantStyles} ${paddingStyles} ${hoverStyles} ${clickableStyles} ${className}`.trim()}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </Tag>
  );
};

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export const CardHeader = ({ title, subtitle, action, className = "" }: CardHeaderProps) => (
  <div className={`fc-card-header ${className}`.trim()}>
    <div className="fc-card-header-content">
      <h3 className="fc-card-title">{title}</h3>
      {subtitle && <p className="fc-card-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="fc-card-header-action">{action}</div>}
  </div>
);

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className = "" }: CardContentProps) => (
  <div className={`fc-card-content ${className}`.trim()}>{children}</div>
);

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className = "" }: CardFooterProps) => (
  <div className={`fc-card-footer ${className}`.trim()}>{children}</div>
);

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  className?: string;
}

export const Badge = ({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) => (
  <span className={`fc-badge fc-badge-${variant} fc-badge-${size} ${dot ? "fc-badge-dot" : ""} ${className}`.trim()}>
    {dot && <span className="fc-badge-dot-indicator" aria-hidden="true" />}
    {children}
  </span>
);

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

export const Avatar = ({
  src,
  alt,
  name,
  size = "md",
  status,
  className = "",
}: AvatarProps) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className={`fc-avatar fc-avatar-${size} ${className}`.trim()}>
      {src ? (
        <img src={src} alt={alt || name || "Avatar"} className="fc-avatar-img" />
      ) : (
        <span className="fc-avatar-initials" aria-hidden="true">
          {initials}
        </span>
      )}
      {status && (
        <span className={`fc-avatar-status fc-avatar-status-${status}`} aria-label={status} />
      )}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, leftElement, rightElement, className = "", id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className={`fc-field ${error ? "fc-field-error" : ""} ${className}`.trim()}>
        {label && <label htmlFor={inputId} className="fc-label">{label}</label>}
        <div className="fc-input-wrapper">
          {leftElement && <span className="fc-input-prefix">{leftElement}</span>}
          {leftIcon && !leftElement && <Icon name={leftIcon} size={18} className="fc-input-icon fc-input-icon-left" aria-hidden="true" />}
          <input
            ref={ref}
            id={inputId}
            className={`fc-input ${rightIcon || rightElement ? "fc-input-has-suffix" : ""} ${leftIcon || leftElement ? "fc-input-has-prefix" : ""}`}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightElement && <span className="fc-input-suffix">{rightElement}</span>}
          {rightIcon && !rightElement && <Icon name={rightIcon} size={18} className="fc-input-icon fc-input-icon-right" aria-hidden="true" />}
        </div>
        {error && <p id={`${inputId}-error`} className="fc-field-error-text" role="alert">{error}</p>}
        {hint && !error && <p id={`${inputId}-hint`} className="fc-hint">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = "", id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className={`fc-field ${error ? "fc-field-error" : ""} ${className}`.trim()}>
        {label && <label htmlFor={textareaId} className="fc-label">{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          className="fc-textarea"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error && <p id={`${textareaId}-error`} className="fc-field-error-text" role="alert">{error}</p>}
        {hint && !error && <p id={`${textareaId}-hint`} className="fc-hint">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className={`fc-field ${error ? "fc-field-error" : ""} ${className}`.trim()}>
        {label && <label htmlFor={selectId} className="fc-label">{label}</label>}
        <div className="fc-select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className="fc-select"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={18} className="fc-select-icon" aria-hidden="true" />
        </div>
        {error && <p id={`${selectId}-error`} className="fc-field-error-text" role="alert">{error}</p>}
        {hint && !error && <p id={`${selectId}-hint`} className="fc-hint">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

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

export interface TableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    render?: (row: T, index: number) => ReactNode;
    className?: string;
    width?: string;
    align?: "left" | "center" | "right";
  }>;
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  emptyAction,
  loading = false,
  loadingRows = 5,
  striped = true,
  hoverable = true,
  bordered = false,
  className = "",
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={`fc-table-wrapper ${className}`.trim()}>
        <div className="fc-table-skeleton" role="status" aria-label="Loading table data">
          <table className="fc-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className} style={{ width: col.width, textAlign: col.align }}>
                    <div className="fc-skel fc-skel-text" style={{ width: "80%" }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className} style={{ textAlign: col.align }}>
                      <div className="fc-skel fc-skel-text" style={{ width: "60%" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`fc-table-wrapper ${className}`.trim()}>
        <div className="fc-table-empty">
          <Icon name="inbox" size={32} className="fc-table-empty-icon" aria-hidden="true" />
          <p className="fc-table-empty-message">{emptyMessage}</p>
          {emptyAction && <div className="fc-table-empty-action">{emptyAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`fc-table-wrapper ${className}`.trim()}>
      <div className="fc-table-scroll">
        <table className={`fc-table ${striped ? "fc-table-striped" : ""} ${hoverable ? "fc-table-hoverable" : ""} ${bordered ? "fc-table-bordered" : ""}`}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className} style={{ width: col.width, textAlign: col.align }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "fc-table-row-clickable" : ""}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.className} style={{ textAlign: col.align }}>
                    {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface ProgressProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger" | "info";
  showValue?: boolean;
  className?: string;
}

export const Progress = ({ value, label, size = "md", variant = "default", showValue = true, className = "" }: ProgressProps) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`fc-progress fc-progress-${size} fc-progress-${variant} ${className}`.trim()}>
      {label && (
        <div className="fc-progress-header">
          <span className="fc-progress-label">{label}</span>
          {showValue && <span className="fc-progress-value">{pct}%</span>}
        </div>
      )}
      <div className="fc-progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="fc-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const Alert = ({ variant = "info", title, children, action, dismissible = false, onDismiss, className = "" }: AlertProps) => (
  <div className={`fc-alert fc-alert-${variant} ${dismissible ? "fc-alert-dismissible" : ""} ${className}`.trim()} role={variant === "danger" ? "alert" : "status"}>
    <div className="fc-alert-icon" aria-hidden="true">
      <Icon name={variant === "danger" ? "alertCircle" : variant === "success" ? "checkCircle" : variant === "warning" ? "alertTriangle" : "info"} size={20} />
    </div>
    <div className="fc-alert-content">
      {title && <h4 className="fc-alert-title">{title}</h4>}
      <div className="fc-alert-body">{children}</div>
      {action && <div className="fc-alert-action">{action}</div>}
    </div>
    {dismissible && (
      <button type="button" className="fc-alert-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <Icon name="x" size={16} aria-hidden="true" />
      </button>
    )}
  </div>
);

export interface TabsProps {
  tabs: Array<{ id: string; label: string; icon?: IconName; disabled?: boolean }>;
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "default" | "pills" | "underline";
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, variant = "default", className = "" }: TabsProps) => (
  <div className={`fc-tabs fc-tabs-${variant} ${className}`.trim()} role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={activeTab === tab.id}
        aria-controls={`panel-${tab.id}`}
        id={`tab-${tab.id}`}
        className={`fc-tab ${activeTab === tab.id ? "fc-tab-active" : ""} ${tab.disabled ? "fc-tab-disabled" : ""}`}
        onClick={() => !tab.disabled && onChange(tab.id)}
        disabled={tab.disabled}
      >
        {tab.icon && <Icon name={tab.icon} size={16} aria-hidden="true" />}
        <span>{tab.label}</span>
      </button>
    ))}
    {variant === "underline" && (
      <div className="fc-tabs-indicator" style={{ "--active-index": tabs.findIndex((t) => t.id === activeTab) }} />
    )}
  </div>
);

export interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export const TabPanel = ({ id, activeTab, children, className = "" }: TabPanelProps) => {
  if (activeTab !== id) return null;
  return <div id={`panel-${id}`} role="tabpanel" className={`fc-tab-panel ${className}`.trim()}>{children}</div>;
};

export interface DropdownProps {
  trigger: ReactNode;
  items: Array<{
    label: string;
    onClick: () => void;
    icon?: IconName;
    danger?: boolean;
    disabled?: boolean;
    shortcut?: string;
  }>;
  align?: "left" | "right";
  className?: string;
}

export const Dropdown = ({ trigger, items, align = "right", className = "" }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`fc-dropdown ${className}`.trim()} ref={triggerRef}>
      <div className="fc-dropdown-trigger" onClick={() => setOpen(!open)}>
        {trigger}
        <Icon name="chevronDown" size={14} className={`fc-dropdown-caret ${open ? "fc-dropdown-caret-open" : ""}`} aria-hidden="true" />
      </div>
      {open && (
        <div
          ref={dropdownRef}
          className={`fc-dropdown-menu fc-dropdown-${align}`}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              className={`fc-dropdown-item ${item.danger ? "fc-dropdown-item-danger" : ""} ${item.disabled ? "fc-dropdown-item-disabled" : ""}`}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setOpen(false);
                }
              }}
              disabled={item.disabled}
            >
              {item.icon && <Icon name={item.icon} size={16} aria-hidden="true" />}
              <span>{item.label}</span>
              {item.shortcut && <kbd className="fc-dropdown-shortcut">{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useRef } from "react";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export const Tooltip = ({ content, children, position = "top", delay = 200 }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div className="fc-tooltip-wrapper" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {typeof children === "function" ? children({ visible }) : children}
      {visible && (
        <div className={`fc-tooltip fc-tooltip-${position}`} role="tooltip">
          {content}
          <div className="fc-tooltip-arrow" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "avatar";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = ({ variant = "text", width, height, className = "" }: SkeletonProps) => {
  const baseStyle: React.CSSProperties = {};
  if (width) baseStyle.width = typeof width === "number" ? `${width}px` : width;
  if (height) baseStyle.height = typeof height === "number" ? `${height}px` : height;

  const variantStyles = {
    text: "fc-skel fc-skel-text",
    circular: "fc-skel fc-skel-circular",
    rectangular: "fc-skel fc-skel-rectangular",
    avatar: "fc-skel fc-skel-avatar",
  };

  return <div className={`${variantStyles[variant]} ${className}`.trim()} style={baseStyle} aria-hidden="true" />;
};

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon = "inbox", title, description, action, illustration, className = "" }: EmptyStateProps) => (
  <div className={`fc-empty-state ${className}`.trim()}>
    {illustration ? (
      <div className="fc-empty-illustration" aria-hidden="true">{illustration}</div>
    ) : (
      <div className="fc-empty-icon" aria-hidden="true">
        <Icon name={icon} size={48} />
      </div>
    )}
    <h3 className="fc-empty-title">{title}</h3>
    {description && <p className="fc-empty-description">{description}</p>}
    {action && <div className="fc-empty-action">{action}</div>}
  </div>
);

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  label?: string;
  className?: string;
}

export const Divider = ({ orientation = "horizontal", label, className = "" }: DividerProps) => {
  if (orientation === "vertical") {
    return <div className={`fc-divider fc-divider-vertical ${className}`.trim()} role="separator" aria-orientation="vertical" />;
  }
  return (
    <div className={`fc-divider ${className}`.trim()} role="separator" aria-orientation="horizontal">
      {label && <span className="fc-divider-label">{label}</span>}
    </div>
  );
};

export interface BreadcrumbsProps {
  items: Array<{ label: string; href?: string; current?: boolean }>;
  separator?: ReactNode;
  className?: string;
}

export const Breadcrumbs = ({ items, separator = <Icon name="chevronRight" size={14} aria-hidden="true" />, className = "" }: BreadcrumbsProps) => (
  <nav className={`fc-breadcrumbs ${className}`.trim()} aria-label="Breadcrumb">
    <ol className="fc-breadcrumbs-list">
      {items.map((item, index) => (
        <li key={index} className="fc-breadcrumbs-item">
          {item.href ? (
            <a href={item.href} className="fc-breadcrumbs-link">
              {item.label}
            </a>
          ) : (
            <span className={`fc-breadcrumbs-current ${item.current ? "fc-breadcrumbs-current-page" : ""}`} aria-current={item.current ? "page" : undefined}>
              {item.label}
            </span>
          )}
          {index < items.length - 1 && <span className="fc-breadcrumbs-separator" aria-hidden="true">{separator}</span>}
        </li>
      ))}
    </ol>
  </nav>
);

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxPageButtons?: number;
  className?: string;
  ariaLabel?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxPageButtons = 5,
  className = "",
  ariaLabel = "Pagination",
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const halfMax = Math.floor(maxPageButtons / 2);

  let start = Math.max(1, currentPage - halfMax);
  let end = Math.min(totalPages, start + maxPageButtons - 1);

  if (end - start + 1 < maxPageButtons) {
    start = Math.max(1, end - maxPageButtons + 1);
  }

  if (showFirstLast && start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (showFirstLast && end < totalPages) {
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav className={`fc-pagination ${className}`.trim()} aria-label={ariaLabel}>
      <ul className="fc-pagination-list">
        {showPrevNext && (
          <li>
            <button
              type="button"
              className="fc-pagination-btn fc-pagination-prev"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <Icon name="chevronLeft" size={16} aria-hidden="true" />
            </button>
          </li>
        )}
        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <li key={`ellipsis-${index}`} className="fc-pagination-ellipsis">
              <span aria-hidden="true">…</span>
            </li>
          ) : (
            <li key={page}>
              <button
                type="button"
                className={`fc-pagination-btn ${page === currentPage ? "fc-pagination-current" : ""}`}
                onClick={() => onPageChange(page as number)}
                disabled={page === currentPage}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          )
        )}
        {showPrevNext && (
          <li>
            <button
              type="button"
              className="fc-pagination-btn fc-pagination-next"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <Icon name="chevronRight" size={16} aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};