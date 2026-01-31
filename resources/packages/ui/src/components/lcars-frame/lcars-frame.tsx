import {
  useState,
  useCallback,
  useRef,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import "./lcars-frame.css";

export interface LcarsTab {
  /** Unique identifier for the tab */
  id: string;
  /** Label displayed on the tab button */
  label: string;
  /** Optional LCARS-style subtext code */
  subtext?: string;
  /** Content to display when tab is active */
  content: ReactNode;
}

export interface LcarsFrameProps {
  /** Array of tab configurations */
  tabs: LcarsTab[];
  /** Currently active tab ID (controlled) */
  activeTab?: string;
  /** Callback when active tab changes */
  onTabChange?: (tabId: string) => void;
  /** Default active tab ID (uncontrolled) */
  defaultTab?: string;
  /** Buttons/controls for the header bar */
  headerActions?: ReactNode;
  /** Title displayed in the header */
  title?: string;
  /** Color tone */
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
  /** Additional CSS class names */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  "data-testid"?: string;
}

export interface LcarsHeaderChipProps {
  children: ReactNode;
  className?: string;
}

export function LcarsHeaderChip({ children, className = "" }: LcarsHeaderChipProps) {
  return (
    <div className={`helm-lcars-header-chip ${className}`.trim()}>
      {children}
    </div>
  );
}

export function LcarsFrame({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  defaultTab,
  headerActions,
  title,
  tone = "gold",
  className = "",
  style,
  "data-testid": testId,
}: LcarsFrameProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab ?? tabs[0]?.id ?? ""
  );

  const isControlled = controlledActiveTab !== undefined;
  const activeTabId = isControlled ? controlledActiveTab : internalActiveTab;

  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (!isControlled) {
        setInternalActiveTab(tabId);
      }
      onTabChange?.(tabId);
    },
    [isControlled, onTabChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      let newIndex = currentIndex;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;
        case "ArrowDown":
          event.preventDefault();
          newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      const newTab = tabs[newIndex];
      if (newTab) {
        handleTabChange(newTab.id);
        tabRefs.current.get(newTab.id)?.focus();
      }
    },
    [tabs, activeTabId, handleTabChange]
  );

  const classNames = [
    "helm-lcars-frame",
    `helm-lcars-frame--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const activeContent = tabs.find((tab) => tab.id === activeTabId)?.content;

  return (
    <div className={classNames} style={style} data-testid={testId}>
      {/* Top row: corner + header bar */}
      <div className="helm-lcars-frame__header">
        <div className="helm-lcars-frame__corner" />
        <div className="helm-lcars-frame__header-bar">
          {title && <span className="helm-lcars-frame__title">{title}</span>}
          {headerActions && (
            <div className="helm-lcars-frame__header-actions">{headerActions}</div>
          )}
        </div>
      </div>

      {/* Body row: sidebar + content */}
      <div className="helm-lcars-frame__body">
        <div
          className="helm-lcars-frame__sidebar"
          role="tablist"
          aria-label={title ?? "Tabs"}
          aria-orientation="vertical"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                data-subtext={tab.subtext}
                className={isActive ? "helm-lcars-frame__tab--active" : ""}
                onClick={() => handleTabChange(tab.id)}
                onKeyDown={handleKeyDown}
              >
                {tab.label}
              </button>
            );
          })}
          <div className="helm-lcars-frame__sidebar-cap" />
        </div>
        <div
          className="helm-lcars-frame__content"
          role="tabpanel"
          id={`tabpanel-${activeTabId}`}
          aria-labelledby={`tab-${activeTabId}`}
          tabIndex={0}
        >
          {activeContent}
        </div>
      </div>
    </div>
  );
}
