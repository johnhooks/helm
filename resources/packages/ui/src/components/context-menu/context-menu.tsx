import { useCallback, useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { LcarsTone } from "../../tones";
import "./context-menu.css";

export interface ContextMenuAction {
  label: string;
  detail?: string;
  disabled?: boolean;
  tone?: LcarsTone;
  onClick?: () => void;
}

export interface ContextMenuProps {
  name: string;
  subtitle?: string;
  tone?: LcarsTone;
  actions: ContextMenuAction[];
  width?: number;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

export function ContextMenu({
  name,
  subtitle,
  tone = "sky",
  actions,
  width = 180,
  className,
  style,
  "data-testid": testId,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const getEnabledIndices = useCallback(
    () => actions.reduce<number[]>((acc, action, i) => {
      if (!action.disabled) {
        acc.push(i);
      }
      return acc;
    }, []),
    [actions]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const enabled = getEnabledIndices();
      if (enabled.length === 0) {
        return;
      }

      const focused = menuRef.current?.ownerDocument.activeElement;
      const currentIndex = [...actionRefs.current.entries()].find(
        ([, el]) => el === focused
      )?.[0];

      const currentEnabledPos = currentIndex !== undefined
        ? enabled.indexOf(currentIndex)
        : -1;

      let nextPos: number | undefined;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          nextPos = currentEnabledPos < enabled.length - 1
            ? currentEnabledPos + 1
            : 0;
          break;
        case "ArrowUp":
          event.preventDefault();
          nextPos = currentEnabledPos > 0
            ? currentEnabledPos - 1
            : enabled.length - 1;
          break;
        case "Home":
          event.preventDefault();
          nextPos = 0;
          break;
        case "End":
          event.preventDefault();
          nextPos = enabled.length - 1;
          break;
        default:
          return;
      }

      if (nextPos !== undefined) {
        actionRefs.current.get(enabled[nextPos])?.focus();
      }
    },
    [getEnabledIndices]
  );

  const classNames = [
    "helm-context-menu",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={menuRef}
      className={classNames}
      role="menu"
      tabIndex={-1}
      style={{ width, ...style }}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      <div className={`helm-context-menu__header helm-tone--${tone}`}>
        <span className="helm-context-menu__name">{name}</span>
        {subtitle && (
          <span className="helm-context-menu__subtitle">{subtitle}</span>
        )}
      </div>
      <div className="helm-context-menu__actions">
        {actions.map((action, i) => (
          <button
            key={action.label}
            ref={(el) => {
              if (el) {
                actionRefs.current.set(i, el);
              } else {
                actionRefs.current.delete(i);
              }
            }}
            className={[
              "helm-context-menu__action",
              action.tone && `helm-tone--${action.tone}`,
            ]
              .filter(Boolean)
              .join(" ")}
            role="menuitem"
            type="button"
            disabled={action.disabled}
            tabIndex={action.disabled ? -1 : 0}
            onClick={action.onClick}
          >
            <span className="helm-context-menu__action-label">
              {action.label}
            </span>
            {action.detail && (
              <span className="helm-context-menu__action-detail">
                {action.detail}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
