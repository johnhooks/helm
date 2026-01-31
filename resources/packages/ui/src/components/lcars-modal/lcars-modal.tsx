import type { ReactNode } from "react";
import { Modal } from "@wordpress/components";
import { TitleBar } from "../title-bar";
import "./lcars-modal.css";

export interface LcarsModalProps {
  /** Modal title */
  title: string;
  /** Called when modal should close */
  onRequestClose: () => void;
  /** Main content */
  children: ReactNode;
  /** Footer content (typically buttons) */
  footer?: ReactNode;
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
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Whether modal is open */
  isOpen?: boolean;
  /** Test ID for testing */
  "data-testid"?: string;
}

export function LcarsModal({
  title,
  onRequestClose,
  children,
  footer,
  tone = "gold",
  size = "medium",
  isOpen = true,
  "data-testid": testId,
}: LcarsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      title={title}
      onRequestClose={onRequestClose}
      className={`helm-lcars-modal helm-lcars-modal--${tone} helm-lcars-modal--${size}`}
      overlayClassName="helm-lcars-modal__overlay"
      __experimentalHideHeader
    >
      <div className="helm-lcars-modal__inner" data-testid={testId}>
        <TitleBar title={title} tone={tone} />

        <div className="helm-lcars-modal__content">{children}</div>

        {footer && <div className="helm-lcars-modal__footer">{footer}</div>}
      </div>
    </Modal>
  );
}
