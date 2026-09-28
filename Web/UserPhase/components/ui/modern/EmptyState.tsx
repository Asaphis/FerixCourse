import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

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