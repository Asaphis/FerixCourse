import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

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