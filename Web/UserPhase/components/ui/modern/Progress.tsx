import { type ReactNode } from "react";

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