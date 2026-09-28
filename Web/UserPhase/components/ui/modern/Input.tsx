import { type ReactNode, forwardRef } from "react";
import { Icon, type IconName } from "../icons";

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