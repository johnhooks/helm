import type { CSSProperties, ReactNode } from "react";
import { useInstanceId } from "@wordpress/compose";
import { Icon, chevronLeft, chevronRight } from "@wordpress/icons";
import "./side-drawer.css";

export interface SideDrawerProps {
  /**
   * Content rendered in the main viewport area (left).
   */
  viewport: ReactNode;
  /**
   * Content rendered inside the drawer (right).
   */
  children: ReactNode;
  /**
   * Whether the drawer is open.
   */
  open?: boolean;
  /**
   * Called when the toggle is clicked.
   */
  onToggle?: () => void;
  /**
   * Drawer width in pixels. Defaults to 380.
   */
  width?: number;
  /**
   * Additional CSS class names.
   */
  className?: string;
  /**
   * Inline styles applied to the root element.
   */
  style?: CSSProperties;
  /**
   * Test ID for testing.
   */
  "data-testid"?: string;
}

export function SideDrawer({
  viewport,
  children,
  open = true,
  onToggle,
  width = 380,
  className,
  style,
  "data-testid": testId,
}: SideDrawerProps) {
  const panelId = useInstanceId(SideDrawer, "helm-side-drawer-panel") as string;

  const classNames = [
    "helm-side-drawer",
    !open && "helm-side-drawer--closed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const rootStyle: CSSProperties = {
    "--helm-drawer-width": `${width}px`,
    ...style,
  } as CSSProperties;

  return (
    <div className={classNames} style={rootStyle} data-testid={testId}>
      <div className="helm-side-drawer__viewport">{viewport}</div>
      <div className="helm-side-drawer__wrapper">
        <button
          type="button"
          className="helm-side-drawer__toggle"
          onClick={onToggle}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <Icon
            className="helm-side-drawer__chevron"
            icon={open ? chevronRight : chevronLeft}
            size={16}
          />
        </button>
        <div
          className="helm-side-drawer__drawer"
          id={panelId}
          role="region"
          aria-label="Sidebar"
        >
          <div className="helm-side-drawer__content">{children}</div>
        </div>
      </div>
    </div>
  );
}
