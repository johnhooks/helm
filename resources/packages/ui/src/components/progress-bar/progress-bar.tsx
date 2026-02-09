import type { CSSProperties } from "react";

export interface ProgressBarProps {
  /**
   * Current value (0-100 or custom range with min/max)
   */
  value: number;
  /**
   * Minimum value
   */
  min?: number;
  /**
   * Maximum value
   */
  max?: number;
  /**
   * Accessible label
   */
  label?: string;
  /**
   * Show value text
   */
  showValue?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
  /**
   * Color tone
   */
  tone?:
    | "neutral"
    | "accent"
    | "orange"
    | "gold"
    | "peach"
    | "blue"
    | "sky"
    | "lilac"
    | "violet"
    | "danger"
    | "success";
  /**
   * Indeterminate state (for unknown progress)
   */
  indeterminate?: boolean;
  /**
   * Active/in-progress animation
   */
  active?: boolean;
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

export function ProgressBar({
  value,
  min = 0,
  max = 100,
  label,
  showValue = false,
  size = "md",
  tone = "accent",
  indeterminate = false,
  active = false,
  className = "",
  style,
  "data-testid": testId,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const classNames = [
    "helm-progress-bar",
    `helm-progress-bar--${size}`,
    `helm-progress-bar--${tone}`,
    indeterminate && "helm-progress-bar--indeterminate",
    active && "helm-progress-bar--active",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const progressStyle = {
    "--progress-value": `${percentage}%`,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={classNames}
      style={progressStyle}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={label}
      data-testid={testId}
    >
      <div className="helm-progress-bar__track">
        <div className="helm-progress-bar__fill" />
      </div>
      {showValue && !indeterminate && (
        <span className="helm-progress-bar__value">{Math.round(percentage)}%</span>
      )}
    </div>
  );
}
