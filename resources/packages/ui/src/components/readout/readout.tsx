import type { CSSProperties, ReactNode } from "react";
import "./readout.css";

export interface ReadoutProps {
  /**
   * Readout label
   */
  label: string;
  /**
   * Primary value to display
   */
  value: ReactNode;
  /**
   * Optional max value (displayed smaller and muted)
   */
  max?: ReactNode;
  /**
   * Unit label
   */
  unit?: string;
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
    | "violet";
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
  /**
   * Text alignment
   */
  align?: "left" | "center" | "right";
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

export function Readout({
  label,
  value,
  max,
  unit,
  tone = "accent",
  size = "md",
  align = "left",
  className = "",
  style,
  "data-testid": testId,
}: ReadoutProps) {
  const classNames = [
    "helm-readout",
    `helm-readout--${size}`,
    `helm-readout--${align}`,
    `helm-readout--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <dl className={classNames} style={style} data-testid={testId}>
      <dt className="helm-readout__label-row">
        <span className="helm-readout__label">{label}</span>
        {unit && <span className="helm-readout__unit">{unit}</span>}
      </dt>
      <dd className="helm-readout__value-row">
        <span className="helm-readout__value">{value}</span>
        {max !== undefined && (
          <span className="helm-readout__max">/{max}</span>
        )}
      </dd>
    </dl>
  );
}
