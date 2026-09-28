import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

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