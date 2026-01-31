import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LcarsModal } from "./lcars-modal";
import { Button } from "../button";
import { Readout } from "../readout";

const meta = {
  title: "Overlay/LcarsModal",
  component: LcarsModal,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "accent", "orange", "gold", "peach", "blue", "sky", "lilac", "violet", "danger"],
    },
    size: {
      control: "radio",
      options: ["small", "medium", "large", "fill"],
    },
  },
} satisfies Meta<typeof LcarsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Confirm Action",
    onRequestClose: () => {},
    isOpen: true,
    tone: "gold",
    size: "medium",
    children: (
      <p>Are you sure you want to proceed with this action?</p>
    ),
    footer: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </>
    ),
  },
  render: function DefaultModal(args) {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <LcarsModal
          {...args}
          isOpen={isOpen}
          onRequestClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>Confirm</Button>
            </>
          }
        />
      </>
    );
  },
};

export const JumpConfirmation: Story = {
  args: {
    title: "Confirm Jump",
    onRequestClose: () => {},
    tone: "sky",
    size: "medium",
    children: null,
  },
  render: function JumpModal() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <>
        <Button onClick={() => setIsOpen(true)} surface="base">Initiate Jump</Button>
        <LcarsModal
          title="Confirm Jump"
          tone="sky"
          isOpen={isOpen}
          onRequestClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Abort</Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>Engage</Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0 }}>Initiate warp jump to the following destination?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Readout label="Destination" value="Tau Ceti" tone="sky" size="sm" />
              <Readout label="Distance" value={11.9} unit="LY" tone="sky" size="sm" />
              <Readout label="ETA" value="4h 32m" tone="sky" size="sm" />
            </div>
          </div>
        </LcarsModal>
      </>
    );
  },
};

export const RedAlert: Story = {
  args: {
    title: "Red Alert",
    onRequestClose: () => {},
    tone: "danger",
    size: "medium",
    children: null,
  },
  render: function AlertModal() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <>
        <Button onClick={() => setIsOpen(true)} variant="danger">Trigger Alert</Button>
        <LcarsModal
          title="Red Alert"
          tone="danger"
          isOpen={isOpen}
          onRequestClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Stand Down</Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>Confirm Alert</Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, color: "#ff6b6b", fontWeight: 700 }}>
              WARNING: Hostile contact detected
            </p>
            <p style={{ margin: 0 }}>
              Raise shields and arm weapons? This will alert nearby vessels to your defensive posture.
            </p>
          </div>
        </LcarsModal>
      </>
    );
  },
};

export const Sizes: Story = {
  args: {
    title: "Size Demo",
    onRequestClose: () => {},
    tone: "gold",
    children: null,
  },
  render: function SizesDemo() {
    const [openSize, setOpenSize] = useState<string | null>(null);

    const content = (
      <p style={{ margin: 0 }}>
        This modal demonstrates different size variants. The content area adjusts to fit the modal width.
      </p>
    );

    return (
      <div style={{ display: "flex", gap: 12 }}>
        <Button onClick={() => setOpenSize("small")}>Small</Button>
        <Button onClick={() => setOpenSize("medium")}>Medium</Button>
        <Button onClick={() => setOpenSize("large")}>Large</Button>

        {openSize === "small" && (
          <LcarsModal
            title="Small Modal"
            tone="gold"
            size="small"
            isOpen
            onRequestClose={() => setOpenSize(null)}
            footer={<Button onClick={() => setOpenSize(null)}>Close</Button>}
          >
            {content}
          </LcarsModal>
        )}

        {openSize === "medium" && (
          <LcarsModal
            title="Medium Modal"
            tone="sky"
            size="medium"
            isOpen
            onRequestClose={() => setOpenSize(null)}
            footer={<Button onClick={() => setOpenSize(null)}>Close</Button>}
          >
            {content}
          </LcarsModal>
        )}

        {openSize === "large" && (
          <LcarsModal
            title="Large Modal"
            tone="lilac"
            size="large"
            isOpen
            onRequestClose={() => setOpenSize(null)}
            footer={<Button onClick={() => setOpenSize(null)}>Close</Button>}
          >
            {content}
          </LcarsModal>
        )}
      </div>
    );
  },
};

export const AllTones: Story = {
  args: {
    title: "Tones",
    onRequestClose: () => {},
    tone: "gold",
    children: null,
  },
  render: function TonesDemo() {
    const [openTone, setOpenTone] = useState<string | null>(null);
    const tones = ["gold", "sky", "accent", "lilac", "orange", "danger"] as const;

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tones.map((tone) => (
          <Button key={tone} onClick={() => setOpenTone(tone)}>
            {tone.charAt(0).toUpperCase() + tone.slice(1)}
          </Button>
        ))}

        {tones.map((tone) => (
          openTone === tone && (
            <LcarsModal
              key={tone}
              title={`${tone.charAt(0).toUpperCase() + tone.slice(1)} Modal`}
              tone={tone}
              size="small"
              isOpen
              onRequestClose={() => setOpenTone(null)}
              footer={<Button onClick={() => setOpenTone(null)}>Close</Button>}
            >
              <p style={{ margin: 0 }}>This is a {tone} toned modal.</p>
            </LcarsModal>
          )
        ))}
      </div>
    );
  },
};

export const NoFooter: Story = {
  args: {
    title: "Information",
    onRequestClose: () => {},
    tone: "accent",
    size: "small",
    children: null,
  },
  render: function NoFooterModal() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Show Info</Button>
        <LcarsModal
          title="Information"
          tone="accent"
          size="small"
          isOpen={isOpen}
          onRequestClose={() => setIsOpen(false)}
        >
          <p style={{ margin: 0 }}>
            This modal has no footer. Click the X or press Escape to close.
          </p>
        </LcarsModal>
      </>
    );
  },
};
