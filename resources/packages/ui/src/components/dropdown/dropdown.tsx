import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode, RefCallback } from "react";

export type DropdownPlacement = "bottom-start" | "bottom-end";

export interface DropdownTriggerProps {
  ref: React.RefCallback<HTMLElement>;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "aria-controls": string;
}

export interface DropdownProps {
  renderTrigger: (props: DropdownTriggerProps) => ReactNode;
  children: ReactNode;
  placement?: DropdownPlacement;
  label: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function Dropdown({
  renderTrigger,
  children,
  placement = "bottom-start",
  label,
  onOpenChange,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  // Close on Escape and click-outside.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        open(false);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        open(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen, open]);

  // Focus first interactive element when panel opens.
  const panelCallbackRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    panelRef.current = node;
    if (node) {
      const first = node.querySelector<HTMLElement>(
        "input, button, select, textarea, [tabindex]",
      );
      first?.focus();
    }
  }, []);

  const triggerCallbackRef: RefCallback<HTMLElement> = useCallback((node) => {
    triggerRef.current = node;
  }, []);

  return (
    <div className={`helm-dropdown helm-dropdown--${placement}`}>
      {renderTrigger({
        ref: triggerCallbackRef,
        onClick: () => open(!isOpen),
        "aria-expanded": isOpen,
        "aria-haspopup": "dialog",
        "aria-controls": panelId,
      })}
      {isOpen && (
        <div
          ref={panelCallbackRef}
          id={panelId}
          className="helm-dropdown__content"
          role="dialog"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}
