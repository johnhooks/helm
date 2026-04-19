import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
  actions?: ContextMenuAction[];
  children?: ReactNode;
  width?: number;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

type ActionRegistration = {
  id: string;
  ref: HTMLButtonElement | null;
  disabled: boolean;
};

type ActionRegistry = {
  registerAction: (registration: ActionRegistration) => void;
  unregisterAction: (id: string) => void;
};

const ContextMenuActionsContext = createContext<ActionRegistry | null>(null);

interface ContextMenuActionListProps {
  children: ReactNode;
}

function ContextMenuActionList({ children }: ContextMenuActionListProps) {
  return (
    <div className="helm-context-menu__actions">
      {children}
    </div>
  );
}

function useActionRegistry() {
  const actionRefs = useRef<Map<string, ActionRegistration>>(new Map());

  const registry = useMemo<ActionRegistry>(
    () => ({
      registerAction: (registration) => {
        actionRefs.current.set(registration.id, registration);
      },
      unregisterAction: (id) => {
        actionRefs.current.delete(id);
      },
    }),
    []
  );

  const getEnabledButtons = useCallback(
    () =>
      Array.from(actionRefs.current.values())
        .filter((registration) => !registration.disabled && registration.ref)
        .map((registration) => registration.ref as HTMLButtonElement),
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const enabledButtons = getEnabledButtons();
      if (enabledButtons.length === 0) {
        return;
      }

      const focused = event.currentTarget.ownerDocument.activeElement;
      const currentIndex = focused instanceof HTMLButtonElement
        ? enabledButtons.indexOf(focused)
        : -1;

      let nextIndex: number | undefined;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          nextIndex = currentIndex < enabledButtons.length - 1
            ? currentIndex + 1
            : 0;
          break;
        case "ArrowUp":
          event.preventDefault();
          nextIndex = currentIndex > 0
            ? currentIndex - 1
            : enabledButtons.length - 1;
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = enabledButtons.length - 1;
          break;
        default:
          return;
      }

      enabledButtons[nextIndex]?.focus();
    },
    [getEnabledButtons]
  );

  return { registry, handleKeyDown };
}

export interface ContextMenuActionItemProps extends ContextMenuAction {}

export function ContextMenuActionItem({
  label,
  detail,
  disabled,
  tone,
  onClick,
}: ContextMenuActionItemProps) {
  const registry = useContext(ContextMenuActionsContext);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!registry) {
      return;
    }

    registry.registerAction({
      id,
      ref: buttonRef.current,
      disabled: Boolean(disabled),
    });

    return () => {
      registry.unregisterAction(id);
    };
  }, [disabled, id, registry]);

  return (
    <button
      ref={buttonRef}
      className={[
        "helm-context-menu__action",
        tone && `helm-tone--${tone}`,
      ]
        .filter(Boolean)
        .join(" ")}
      role="menuitem"
      type="button"
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
    >
      <span className="helm-context-menu__action-label">
        {label}
      </span>
      {detail && (
        <span className="helm-context-menu__action-detail">
          {detail}
        </span>
      )}
    </button>
  );
}

export function ContextMenu({
  name,
  subtitle,
  tone = "sky",
  actions = [],
  children,
  width = 180,
  className,
  style,
  "data-testid": testId,
}: ContextMenuProps) {
  // Render the actions wrapper unconditionally when any children or `actions`
  // are passed. Individual items may still render null at runtime based on
  // their own applicability — CSS `.helm-context-menu__actions:empty` hides
  // the wrapper so the header stays flush when nothing applies.
  const hasAnyContribution = actions.length > 0 || children !== undefined;
  const { registry, handleKeyDown } = useActionRegistry();

  const classNames = ["helm-context-menu", className].filter(Boolean).join(" ");

  return (
    <div
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
      {hasAnyContribution && (
        <ContextMenuActionsContext.Provider value={registry}>
          <ContextMenuActionList>
            {actions.map((action, i) => (
              <div key={`${action.label}-${i}`}>
                <ContextMenuActionItem
                  label={action.label}
                  detail={action.detail}
                  disabled={action.disabled}
                  tone={action.tone}
                  onClick={action.onClick}
                />
              </div>
            ))}
            {children}
          </ContextMenuActionList>
        </ContextMenuActionsContext.Provider>
      )}
    </div>
  );
}
