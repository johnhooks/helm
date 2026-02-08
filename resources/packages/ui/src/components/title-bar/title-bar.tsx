import type { CSSProperties, ReactNode } from "react";
import "./title-bar.css";

export interface TitleBarProps {
  /**
   * Panel title
   */
  title: string;
  /**
   * Optional subtitle or secondary info
   */
  subtitle?: string;
  /**
   * Right-side content (typically a StatusBadge)
   */
  children?: ReactNode;
  /**
   * Color tone for the title and border
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

export function TitleBar({
  title,
  subtitle,
  children,
  tone = "gold",
  className = "",
  style,
  "data-testid": testId,
}: TitleBarProps) {
  const classNames = [
    "helm-title-bar",
    `helm-title-bar--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classNames} style={style} data-testid={testId}>
      <div className="helm-title-bar__content">
        <h2 className="helm-title-bar__title">
          {title}
          {subtitle && (
            <>
              <span className="helm-title-bar__separator"> — </span>
              <span className="helm-title-bar__subtitle">{subtitle}</span>
            </>
          )}
        </h2>
      </div>
      {children && <div className="helm-title-bar__actions">{children}</div>}
    </header>
  );
}
