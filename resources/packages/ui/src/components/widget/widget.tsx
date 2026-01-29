import type { CSSProperties, ReactNode } from "react";
import { TitleBar } from "../title-bar";
import "./widget.css";

export interface WidgetProps {
  /** Optional top/bottom bar label */
  title?: string;
  /** Title position */
  titlePosition?: "top" | "bottom";
  /** Title alignment */
  titleAlign?: "left" | "right" | "opposite";
  /** Title tone */
  titleTone?: "neutral" | "accent";
  /** Title size */
  titleSize?: "sm" | "md";
  /** Surface tone */
  surface?: "neutral" | "base" | "accent" | "muted" | "danger";
  /** Edge for button panel */
  edge?: "left" | "right" | "none";
  /** Button panel content */
  buttonPanel?: ReactNode;
  /** Panel width */
  panelWidth?: number | string;
  /** Widget content */
  children?: ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}

export function Widget({
  title,
  titlePosition = "top",
  titleAlign = "opposite",
  titleTone = "accent",
  titleSize = "md",
  surface = "neutral",
  edge = "none",
  buttonPanel,
  panelWidth,
  children,
  className = "",
  style,
  "data-testid": testId,
}: WidgetProps) {
  const classNames = [
    "helm-widget",
    "helm-surface",
    `helm-surface--${surface}`,
    `helm-widget--edge-${edge}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const widgetStyle: CSSProperties = {
    ...style,
    ...(panelWidth
      ? {
          "--helm-widget-panel-width":
            typeof panelWidth === "number" ? `${panelWidth}px` : panelWidth,
        }
      : {}),
  } as CSSProperties;

  const resolvedTitleAlign =
    titleAlign === "opposite"
      ? edge === "left"
        ? "right"
        : edge === "right"
          ? "left"
          : "left"
      : titleAlign;

  const titleBar = title ? (
    <TitleBar
      label={title}
      align={resolvedTitleAlign}
      tone={titleTone}
      size={titleSize}
      edge={edge === "none" ? "none" : edge}
    />
  ) : null;

  return (
    <div className={classNames} style={widgetStyle} data-testid={testId}>
      {titlePosition === "top" && titleBar && (
        <div className="helm-widget__title helm-widget__title--top">
          {titleBar}
        </div>
      )}
      {edge !== "none" && (
        <div className="helm-widget__panel">{buttonPanel}</div>
      )}
      <div className="helm-widget__content">{children}</div>
      {titlePosition === "bottom" && titleBar && (
        <div className="helm-widget__title helm-widget__title--bottom">
          {titleBar}
        </div>
      )}
    </div>
  );
}
