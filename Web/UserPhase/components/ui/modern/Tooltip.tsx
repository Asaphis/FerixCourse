import { type ReactNode, useState, useEffect, useRef } from "react";
import { Icon, type IconName } from "../icons";

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