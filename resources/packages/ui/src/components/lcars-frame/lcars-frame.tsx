import type { CSSProperties, ReactNode } from "react";
import "./lcars-frame.css";

export interface LcarsFrameProps {
  /** Main content area */
  children: ReactNode;
  /** Buttons/controls for the sidebar (vertical bar) */
  sidebar?: ReactNode;
  /** Buttons/controls for the header bar */
  headerActions?: ReactNode;
  /** Title displayed in the header */
  title?: string;
  /** Color tone */
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
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}

export function LcarsFrame({
  children,
  sidebar,
  headerActions,
  title,
  tone = "gold",
  className = "",
  style,
  "data-testid": testId,
}: LcarsFrameProps) {
  const classNames = [
    "helm-lcars-frame",
    `helm-lcars-frame--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} style={style} data-testid={testId}>
      {/* Top row: corner + header bar */}
      <div className="helm-lcars-frame__header">
        <div className="helm-lcars-frame__corner" />
        <div className="helm-lcars-frame__header-bar">
          {title && <span className="helm-lcars-frame__title">{title}</span>}
          {headerActions && (
            <div className="helm-lcars-frame__header-actions">{headerActions}</div>
          )}
        </div>
      </div>

      {/* Body row: sidebar + content */}
      <div className="helm-lcars-frame__body">
        <div className="helm-lcars-frame__sidebar">
          {sidebar}
          <div className="helm-lcars-frame__sidebar-cap" />
        </div>
        <div className="helm-lcars-frame__content">{children}</div>
      </div>
    </div>
  );
}
