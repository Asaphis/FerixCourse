import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
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