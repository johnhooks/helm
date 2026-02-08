import type { CSSProperties, ReactNode } from "react";
import "./countdown.css";

export interface CountdownProps {
  /**
   * Label for the countdown
   */
  label?: string;
  /**
   * Remaining time in seconds (or formatted string)
   */
  remaining: number | string;
  /**
   * Total time in seconds (for progress calculation)
   */
  total?: number;
  /**
   * Optional indicator element
   */
  indicator?: ReactNode;
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
    | "danger";
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
  /**
   * Layout direction
   */
  layout?: "row" | "column";
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

/**
 * Format seconds into human readable time
 */
function formatTime(seconds: number): string {
  if (seconds <= 0) {
    return "0s";
  }

  const days = Math.floor(seconds / 86400);
  if (days > 0) {
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  const hours = Math.floor((seconds % 86400) / 3600);
  if (hours > 0) {
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const minutes = Math.floor((seconds % 3600) / 60);
  if (minutes > 0) {
    const secs = Math.floor(seconds % 60);
    return secs > 0 && minutes < 10 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  return `${Math.floor(seconds % 60)}s`;
}

export function Countdown({
  label,
  remaining,
  total,
  indicator,
  tone = "accent",
  size = "md",
  layout = "row",
  active = false,
  className = "",
  style,
  "data-testid": testId,
}: CountdownProps) {
  const displayTime = typeof remaining === "number" ? formatTime(remaining) : remaining;

  const progress = total && typeof remaining === "number"
    ? Math.round(((total - remaining) / total) * 100)
    : undefined;

  const classNames = [
    "helm-countdown",
    `helm-countdown--${size}`,
    `helm-countdown--${tone}`,
    `helm-countdown--${layout}`,
    active && "helm-countdown--active",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const countdownStyle = {
    "--countdown-progress": progress !== undefined ? `${progress}%` : undefined,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={classNames}
      style={countdownStyle}
      data-testid={testId}
      role="timer"
      aria-label={label ? `${label}: ${displayTime} remaining` : `${displayTime} remaining`}
    >
      {indicator && <div className="helm-countdown__indicator">{indicator}</div>}
      <div className="helm-countdown__content">
        {label && <span className="helm-countdown__label">{label}</span>}
        <span className="helm-countdown__time">{displayTime}</span>
        {progress !== undefined && (
          <span className="helm-countdown__progress">{progress}%</span>
        )}
      </div>
    </div>
  );
}

export { formatTime };
