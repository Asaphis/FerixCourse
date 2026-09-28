import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

export interface BreadcrumbsProps {
  items: Array<{ label: string; href?: string; current?: boolean }>;
  separator?: ReactNode;
  className?: string;
}

export const Breadcrumbs = ({ items, separator = <Icon name="chevronRight" size={14} aria-hidden="true" />, className = "" }: BreadcrumbsProps) => (
  <nav className={`fc-breadcrumbs ${className}`.trim()} aria-label="Breadcrumb">
    <ol className="fc-breadcrumbs-list">
      {items.map((item, index) => (
        <li key={index} className="fc-breadcrumbs-item">
          {item.href ? (
            <a href={item.href} className="fc-breadcrumbs-link">
              {item.label}
            </a>
          ) : (
            <span className={`fc-breadcrumbs-current ${item.current ? "fc-breadcrumbs-current-page" : ""}`} aria-current={item.current ? "page" : undefined}>
              {item.label}
            </span>
          )}
          {index < items.length - 1 && <span className="fc-breadcrumbs-separator" aria-hidden="true">{separator}</span>}
        </li>
      ))}
    </ol>
  </nav>
);