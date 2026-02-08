import type { CSSProperties } from "react";
import "./orb-indicator.css";

export interface OrbIndicatorProps {
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /**
   * Surface tone
   */
  tone?:
    | "neutral"
    | "base"
    | "accent"
    | "muted"
    | "danger"
    | "success"
    | "warning"
    | "info"
    | "orange"
    | "gold"
    | "peach"
    | "sunset"
    | "blue"
    | "sky"
    | "ice"
    | "lilac"
    | "violet"
    | "plum"
    | "hopbush";
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

export function OrbIndicator({
  size = "md",
  tone = "accent",
  className = "",
  style,
  "data-testid": testId,
}: OrbIndicatorProps) {
  const classNames = [
    "helm-orb-indicator",
    "helm-surface",
    `helm-surface--${tone}`,
    `helm-orb-indicator--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classNames} style={style} data-testid={testId} />;
}
