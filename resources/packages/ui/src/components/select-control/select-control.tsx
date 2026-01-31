import type { CSSProperties } from "react";
import Select, {
  type Props as ReactSelectProps,
  type GroupBase,
  type StylesConfig,
} from "react-select";
import "./select-control.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectControlProps<
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> extends Omit<ReactSelectProps<Option, IsMulti, Group>, "styles" | "theme"> {
  /** Surface tone */
  surface?:
    | "neutral"
    | "base"
    | "accent"
    | "muted"
    | "orange"
    | "gold"
    | "blue"
    | "sky"
    | "lilac"
    | "violet";
  /** Size variant */
  size?: "sm" | "md";
  /** Additional CSS class names */
  className?: string;
  /** Inline styles for the container */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}

export function SelectControl<
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({
  surface = "neutral",
  size = "md",
  className = "",
  style,
  "data-testid": testId,
  ...props
}: SelectControlProps<Option, IsMulti, Group>) {
  const classNames = [
    "helm-select",
    "helm-surface",
    `helm-surface--${surface}`,
    `helm-select--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const customStyles: StylesConfig<Option, IsMulti, Group> = {
    control: (base, state) => ({
      ...base,
      background: "var(--helm-surface-bg)",
      borderColor: state.isFocused
        ? "var(--helm-ui-color-focus)"
        : "var(--helm-surface-border)",
      borderRadius: "var(--helm-ui-radius-md)",
      borderWidth: "1px",
      boxShadow: state.isFocused
        ? "0 0 0 1px var(--helm-ui-color-focus)"
        : "none",
      minHeight: size === "sm" ? "32px" : "36px",
      cursor: "pointer",
      "&:hover": {
        borderColor: "var(--helm-surface-border)",
        background: "var(--helm-surface-hover)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: size === "sm" ? "0 10px" : "0 12px",
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--helm-surface-text)",
      fontFamily: "var(--helm-ui-font-family)",
      fontSize: size === "sm" ? "12px" : "13px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      margin: 0,
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--helm-surface-muted)",
      fontFamily: "var(--helm-ui-font-family)",
      fontSize: size === "sm" ? "12px" : "13px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }),
    input: (base) => ({
      ...base,
      color: "var(--helm-surface-text)",
      fontFamily: "var(--helm-ui-font-family)",
      fontSize: size === "sm" ? "12px" : "13px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      margin: 0,
      padding: 0,
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: "var(--helm-surface-text)",
      padding: size === "sm" ? "6px" : "8px",
      transition: "transform 160ms ease",
      transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : undefined,
      "&:hover": {
        color: "var(--helm-surface-text)",
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: "var(--helm-surface-muted)",
      padding: size === "sm" ? "6px" : "8px",
      "&:hover": {
        color: "var(--helm-ui-color-danger)",
      },
    }),
    menu: (base) => ({
      ...base,
      background: "var(--helm-ui-color-surface)",
      border: "1px solid var(--helm-ui-color-border)",
      borderRadius: "var(--helm-ui-radius-md)",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
      marginTop: "4px",
      overflow: "hidden",
      zIndex: 100,
    }),
    menuList: (base) => ({
      ...base,
      padding: "4px",
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected
        ? "var(--helm-ui-color-accent)"
        : state.isFocused
          ? "var(--helm-ui-color-surface-2)"
          : "transparent",
      color: state.isSelected
        ? "#1a1206"
        : "var(--helm-ui-color-text)",
      fontFamily: "var(--helm-ui-font-family)",
      fontSize: size === "sm" ? "12px" : "13px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      borderRadius: "8px",
      padding: size === "sm" ? "8px 10px" : "10px 12px",
      cursor: "pointer",
      "&:active": {
        background: state.isSelected
          ? "var(--helm-ui-color-accent)"
          : "var(--helm-ui-color-surface-2)",
      },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: "var(--helm-surface-muted)",
      fontFamily: "var(--helm-ui-font-family)",
      fontSize: size === "sm" ? "12px" : "13px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }),
    multiValue: (base) => ({
      ...base,
      background: "var(--helm-ui-color-surface-2)",
      borderRadius: "6px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "var(--helm-ui-color-text)",
      fontFamily: "var(--helm-ui-font-family)",
      fontSize: size === "sm" ? "11px" : "12px",
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      padding: "2px 6px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "var(--helm-ui-color-muted)",
      borderRadius: "0 6px 6px 0",
      "&:hover": {
        background: "var(--helm-ui-color-danger)",
        color: "#fff",
      },
    }),
  };

  return (
    <div className={classNames} style={style} data-testid={testId}>
      <Select<Option, IsMulti, Group>
        styles={customStyles}
        classNamePrefix="helm-select"
        {...props}
      />
    </div>
  );
}
