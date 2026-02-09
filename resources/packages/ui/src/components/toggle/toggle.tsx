import type { CSSProperties, ChangeEvent, ReactNode } from "react";

export interface ToggleProps {
  /**
   * Whether the toggle is on
   */
  checked?: boolean;
  /**
   * Default checked state for uncontrolled usage
   */
  defaultChecked?: boolean;
  /**
   * Change handler
   */
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * Visible label
   */
  label?: ReactNode;
  /**
   * Label position
   */
  labelPosition?: "left" | "right";
  /**
   * Surface tone
   */
  surface?:
    | "accent"
    | "orange"
    | "gold"
    | "blue"
    | "sky"
    | "success"
    | "lilac"
    | "violet";
  /**
   * Size variant
   */
  size?: "sm" | "md";
  /**
   * Whether toggle is disabled
   */
  disabled?: boolean;
  /**
   * Input name for forms
   */
  name?: string;
  /**
   * Input value for forms
   */
  value?: string;
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
   * Accessible label when no visible label
   */
  "aria-label"?: string;
}

export function Toggle({
  checked,
  defaultChecked,
  onChange,
  label,
  labelPosition = "right",
  surface = "accent",
  size = "md",
  disabled = false,
  name,
  value,
  className = "",
  style,
  "data-testid": testId,
  "aria-label": ariaLabel,
}: ToggleProps) {
  const classNames = [
    "helm-toggle",
    `helm-toggle--${size}`,
    `helm-toggle--label-${labelPosition}`,
    disabled && "helm-toggle--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) {
      onChange(event.target.checked, event);
    }
  };

  return (
    <label className={classNames} style={style} data-testid={testId}>
      <input
        type="checkbox"
        className="helm-toggle__input"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={handleChange}
        disabled={disabled}
        name={name}
        value={value}
        aria-label={!label ? ariaLabel : undefined}
      />
      <span
        className={`helm-toggle__track helm-toggle__track--${surface}`}
        aria-hidden="true"
      >
        <span className="helm-toggle__thumb" />
      </span>
      {label && <span className="helm-toggle__label">{label}</span>}
    </label>
  );
}
