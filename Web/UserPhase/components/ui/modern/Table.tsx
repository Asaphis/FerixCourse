import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

export interface TableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    render?: (row: T, index: number) => ReactNode;
    className?: string;
    width?: string;
    align?: "left" | "center" | "right";
  }>;
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  emptyAction,
  loading = false,
  loadingRows = 5,
  striped = true,
  hoverable = true,
  bordered = false,
  className = "",
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={`fc-table-wrapper ${className}`.trim()}>
        <div className="fc-table-skeleton" role="status" aria-label="Loading table data">
          <table className="fc-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className} style={{ width: col.width, textAlign: col.align }}>
                    <div className="fc-skel fc-skel-text" style={{ width: "80%" }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className} style={{ textAlign: col.align }}>
                      <div className="fc-skel fc-skel-text" style={{ width: "60%" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`fc-table-wrapper ${className}`.trim()}>
        <div className="fc-table-empty">
          <Icon name="inbox" size={32} className="fc-table-empty-icon" aria-hidden="true" />
          <p className="fc-table-empty-message">{emptyMessage}</p>
          {emptyAction && <div className="fc-table-empty-action">{emptyAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`fc-table-wrapper ${className}`.trim()}>
      <div className="fc-table-scroll">
        <table className={`fc-table ${striped ? "fc-table-striped" : ""} ${hoverable ? "fc-table-hoverable" : ""} ${bordered ? "fc-table-bordered" : ""}`}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className} style={{ width: col.width, textAlign: col.align }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "fc-table-row-clickable" : ""}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.className} style={{ textAlign: col.align }}>
                    {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}