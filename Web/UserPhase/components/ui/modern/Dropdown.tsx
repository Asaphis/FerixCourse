import { type ReactNode, useState, useEffect, useRef } from "react";
import { Icon, type IconName } from "../icons";

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