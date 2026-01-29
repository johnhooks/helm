import type { CSSProperties } from "react";
import "./title-bar.css";

export interface TitleBarProps {
  /** Bar label */
  label: string;
  /** Alignment of label */
  align?: "left" | "right";
  /** Visual tone */
  tone?: "accent" | "neutral";
  /** Surface tone */
  surface?: "neutral" | "base" | "accent" | "muted" | "danger";
  /** Size variant */
  size?: "sm" | "md";
  /** Edge side for squared join */
  edge?: "left" | "right" | "none";
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}

export function TitleBar({
  label,
  align = "left",
  tone = "accent",
  surface,
  size = "md",
  edge = "none",
  className = "",
  style,
  "data-testid": testId,
}: TitleBarProps) {
  const resolvedSurface = surface ?? (tone === "accent" ? "accent" : "neutral");

  const classNames = [
    "helm-titlebar",
    "helm-surface",
    `helm-surface--${resolvedSurface}`,
    `helm-titlebar--${align}`,
    `helm-titlebar--${tone}`,
    `helm-titlebar--${size}`,
    `helm-titlebar--edge-${edge}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} style={style} data-testid={testId}>
      <span className="helm-titlebar__label">{label}</span>
    </div>
  );
}
