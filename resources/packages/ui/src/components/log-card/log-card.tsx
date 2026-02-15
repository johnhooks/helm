import type { CSSProperties, ReactNode } from "react";
import type { LcarsTone } from "../../tones";
import { Panel } from "../panel";
import "./log-card.css";

export interface LogCardProps {
  /**
   * Timestamp or time label (e.g. "08:42", "now", "Y1 D12")
   */
  time: string;
  /**
   * Entry title
   */
  title: string;
  /**
   * Color tone for the accent orb
   */
  tone?: LcarsTone;
  /**
   * Card variant
   *
   * - `default` — completed entry with solid border
   * - `active` — in-progress with tone border + glow
   * - `draft` — pending confirmation with dashed border + sweep
   */
  variant?: "default" | "active" | "draft";
  /**
   * Status indicator (e.g. StatusBadge) rendered at the end of the header row
   */
  status?: ReactNode;
  /**
   * Action area rendered below the body (e.g. buttons)
   */
  action?: ReactNode;
  /**
   * Body content rendered below the header (e.g. progress bars, readouts)
   */
  children?: ReactNode;
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

const PANEL_MAP = {
  default: "default",
  active: "bordered",
  draft: "dashed",
} as const;

export function LogCard({
  time,
  title,
  tone = "neutral",
  variant = "default",
  status,
  action,
  children,
  className = "",
  style,
  "data-testid": testId,
}: LogCardProps) {
  const panelVariant = PANEL_MAP[variant];
  const panelTone = variant === "active" ? tone : "neutral";

  const classNames = [
    "helm-log-card",
    `helm-tone--${tone}`,
    `helm-log-card--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedStyle: CSSProperties = {
    position: "relative",
    ...(variant === "default"
      ? { border: "1px solid var(--helm-ui-color-border)" }
      : undefined),
    ...style,
  };

  return (
    <Panel
      variant={panelVariant}
      tone={panelTone}
      padding="sm"
      className={classNames}
      style={mergedStyle}
      data-testid={testId}
    >
      <div className="helm-log-card__orb" />
      <div className="helm-log-card__header">
        <span className="helm-log-card__time">{time}</span>
        <span className="helm-log-card__title">{title}</span>
        {status && <span className="helm-log-card__status">{status}</span>}
      </div>
      {children && <div className="helm-log-card__body">{children}</div>}
      {action && <div className="helm-log-card__action">{action}</div>}
      {variant === "draft" && <div className="helm-log-card__sweep" />}
    </Panel>
  );
}
