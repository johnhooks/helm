import type { CSSProperties, MouseEvent, ReactNode } from "react";

export interface ButtonProps {
  /**
   * Button label
   */
  children: ReactNode;
  /**
   * Secondary code (e.g., E-01)
   */
  secondary?: string;
  /**
   * Visual style variant
   */
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  /**
   * Surface tone
   */
  surface?: "neutral" | "base" | "accent" | "muted" | "danger";
  /**
   * Size variant
   */
  size?: "sm" | "md";
  /**
   * Edge alignment for stacked layouts
   */
  edge?: "left" | "right" | "none";
  /**
   * Full-width button for stacks
   */
  fullWidth?: boolean;
  /**
   * Square edges for stacked layouts
   */
  stacked?: boolean;
  /**
   * Whether button is disabled
   */
  disabled?: boolean;
  /**
   * Click handler
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /**
   * Button type
   */
  type?: "button" | "submit" | "reset";
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
  /**
   * Accessible label
   */
  "aria-label"?: string;
}

export function Button({
  children,
  secondary,
  variant = "primary",
  surface,
  size = "md",
  edge = "none",
  fullWidth = false,
  stacked = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  style,
  "data-testid": testId,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const variantSurfaces: Record<string, ButtonProps["surface"]> = {
    primary: "accent",
    danger: "danger",
    tertiary: "muted",
    ghost: "base",
  };
  const resolvedSurface = surface ?? variantSurfaces[variant] ?? "neutral";

  const classNames = [
    "helm-button",
    "helm-surface",
    `helm-surface--${resolvedSurface}`,
    `helm-button--${variant}`,
    `helm-button--${size}`,
    `helm-button--edge-${edge}`,
    fullWidth && "helm-button--full",
    stacked && "helm-button--stacked",
    disabled && "helm-button--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classNames}
      style={style}
      data-testid={testId}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="helm-button__text">
        <span className="helm-button__label">{children}</span>
        {secondary && (
          <span className="helm-button__secondary">{secondary}</span>
        )}
      </span>
    </button>
  );
}
