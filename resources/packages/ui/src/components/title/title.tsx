import type { CSSProperties } from "react";

export interface TitleProps {
  /**
   * Title label
   */
  label: string;
  /**
   * Alignment of label
   */
  align?: "left" | "right";
  /**
   * Size variant
   */
  size?: "sm" | "md";
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Inline styles
   */
  style?: CSSProperties;
  /**
   * Test ID for testing
   */
  "data-testid"?: string;
}

export function Title({
  label,
  align = "left",
  size = "sm",
  className = "",
  style,
  "data-testid": testId,
}: TitleProps) {
  const classNames = [
    "helm-title",
    `helm-title--${align}`,
    `helm-title--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} style={style} data-testid={testId}>
      <span className="helm-title__label">{label}</span>
    </div>
  );
}
