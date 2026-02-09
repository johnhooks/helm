import type { CSSProperties, ReactNode } from "react";

export interface SystemGridProps {
  /**
   * Number of columns
   */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Gap between cells
   */
  gap?: "sm" | "md" | "lg";
  /**
   * Children (SystemCell components)
   */
  children: ReactNode;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Inline styles
   */
  style?: CSSProperties;
}

export function SystemGrid({
  columns = 2,
  gap = "md",
  children,
  className = "",
  style,
}: SystemGridProps) {
  const classNames = [
    "helm-system-grid",
    `helm-system-grid--cols-${columns}`,
    `helm-system-grid--gap-${gap}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} style={style}>
      {children}
    </div>
  );
}

export interface SystemCellProps {
  /**
   * Indicator element
   */
  indicator?: ReactNode;
  /**
   * Readout or other content
   */
  children: ReactNode;
  /**
   * Layout direction
   */
  layout?: "row" | "column";
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Inline styles
   */
  style?: CSSProperties;
}

export function SystemCell({
  indicator,
  children,
  layout = "row",
  className = "",
  style,
}: SystemCellProps) {
  const classNames = [
    "helm-system-cell",
    `helm-system-cell--${layout}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} style={style}>
      {indicator && <div className="helm-system-cell__indicator">{indicator}</div>}
      <div className="helm-system-cell__content">{children}</div>
    </div>
  );
}
