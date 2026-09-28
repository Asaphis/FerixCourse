import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

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