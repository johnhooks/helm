import type { CSSProperties } from "react";
import "./placeholder.css";

export interface PlaceholderProps {
  title?: string;
  detail?: string;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

export function Placeholder({
  title = "UI Prototype",
  detail = "Baseline components to follow",
  className = "",
  style,
  "data-testid": testId,
}: PlaceholderProps) {
  const classNames = ["helm-placeholder", className].filter(Boolean).join(" ");

  return (
    <div className={classNames} style={style} data-testid={testId}>
      <div className="helm-placeholder__title">{title}</div>
      <div className="helm-placeholder__detail">{detail}</div>
    </div>
  );
}
