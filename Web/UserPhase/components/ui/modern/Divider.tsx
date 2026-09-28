import { type ReactNode } from "react";

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