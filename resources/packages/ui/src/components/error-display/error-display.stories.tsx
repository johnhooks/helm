import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorContent } from "./error-content";
import { ErrorCard } from "./error-card";
import { ErrorCompact } from "./error-compact";
import { ErrorModal } from "./error-modal";
import { ErrorPage } from "./error-page";
import { Button } from "../button";
import { Panel } from "../panel";

// ── ErrorCard ────────────────────────────────────────────────────────

const cardMeta = {
  title: "Feedback/ErrorCard",
  component: ErrorCard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
} satisfies Meta<typeof ErrorCard>;

export default cardMeta;
type CardStory = StoryObj<typeof cardMeta>;

export const Default: CardStory = {
  args: {
    code: "helm.ship.not_found",
    detail: "The requested ship could not be located in the Origin database.",
  },
};

export const WithCauses: CardStory = {
  args: {
    code: "helm.action.failed",
    detail: "The scan action could not be completed.",

    causes: [
      "Scanner array is offline.",
      "Insufficient power allocation.",
    ],
  },
};

export const CodeOnly: CardStory = {
  args: {
    code: "helm.unknown",
  },
};

// ── ErrorCompact ─────────────────────────────────────────────────────

export const Compact: CardStory = {
  args: { code: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 400 }}>
      <ErrorCompact code="helm.ship.not_found" detail="Ship not found." />
      <ErrorCompact code="helm.timeout" detail="Request timed out." />
      <ErrorCompact code="helm.unknown" />
    </div>
  ),
};

export const CompactInPanel: CardStory = {
  args: { code: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <Panel variant="bordered" tone="neutral" padding="md">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ErrorCompact code="helm.system.offline" detail="Scanner offline." />
        <ErrorCompact code="helm.power.insufficient" detail="Not enough power." />
      </div>
    </Panel>
  ),
};

// ── ErrorPage (full-page centered fallback) ─────────────────────────

export const Page: CardStory = {
  args: { code: "" },
  parameters: { layout: "fullscreen", controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <ErrorPage
        code="helm.fatal"
        detail="An unrecoverable error occurred during initialization."
        causes={ [
          "Origin handshake failed.",
          "Ship state could not be restored.",
        ] }
      />
    </div>
  ),
};

export const PageMinimal: CardStory = {
  args: { code: "" },
  parameters: { layout: "fullscreen", controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <ErrorPage code="helm.unknown" />
    </div>
  ),
};

// ── ErrorContent (raw, no wrapper) ───────────────────────────────────

export const ContentOnly: CardStory = {
  args: { code: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <Panel variant="default" padding="md">
      <ErrorContent
        code="helm.action.failed"
        detail="The mining operation encountered an error."

        causes={ ["Asteroid yield exhausted."] }
      />
    </Panel>
  ),
};

// ── ErrorModal ───────────────────────────────────────────────────────

export const Modal: CardStory = {
  args: { code: "" },
  parameters: { controls: { disable: true } },
  render: function ModalStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <>
        <Button onClick={ () => setIsOpen(true) } variant="danger">
          Show Error
        </Button>
        <ErrorModal
          isOpen={ isOpen }
          onDismiss={ () => setIsOpen(false) }
          code="helm.action.failed"
          detail="Jump drive malfunction. The ship could not enter warp."
  
          causes={ [
            "Warp coil integrity below threshold.",
            "Insufficient deuterium reserves.",
          ] }
        />
      </>
    );
  },
};

export const ModalMinimal: CardStory = {
  args: { code: "" },
  parameters: { controls: { disable: true } },
  render: function ModalMinimalStory() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <>
        <Button onClick={ () => setIsOpen(true) } variant="danger">
          Show Error
        </Button>
        <ErrorModal
          isOpen={ isOpen }
          onDismiss={ () => setIsOpen(false) }
          code="helm.unknown"
        />
      </>
    );
  },
};
