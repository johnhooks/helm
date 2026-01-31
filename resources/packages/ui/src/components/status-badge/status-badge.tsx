import type { CSSProperties } from "react";
import "./status-badge.css";

export interface StatusBadgeProps {
  /** Status label */
  children: string;
  /** Surface tone */
  tone?:
    | "neutral"
    | "muted"
    | "accent"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "orange"
    | "gold"
    | "blue"
    | "sky"
    | "lilac"
    | "violet";
  /** Size variant */
  size?: "sm" | "md";
  /** Show pulsing dot for active states */
  pulse?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}

export function StatusBadge({
  children,
  tone = "neutral",
  size = "md",
  pulse = false,
  className = "",
  style,
  "data-testid": testId,
}: StatusBadgeProps) {
  const classNames = [
    "helm-status-badge",
    `helm-status-badge--${tone}`,
    `helm-status-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classNames} style={style} data-testid={testId}>
      <span
        className={`helm-status-badge__dot ${pulse ? "helm-status-badge__dot--pulse" : ""}`}
        aria-hidden="true"
      />
      <span className="helm-status-badge__label">{children}</span>
    </span>
  );
}
