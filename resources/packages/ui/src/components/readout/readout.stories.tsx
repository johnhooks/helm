import type { Meta, StoryObj } from "@storybook/react-vite";
import { Readout } from "./readout";
import { LCARS_TONES } from "../../tones";

const meta = {
  title: "Display/Readout",
  component: Readout,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: [...LCARS_TONES],
    },
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
    },
    align: {
      control: "radio",
      options: ["left", "center", "right"],
    },
  },
} satisfies Meta<typeof Readout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Power",
    value: 85,
    max: 100,
    unit: "MW",
    tone: "accent",
    size: "md",
    align: "left",
  },
};

export const Tones: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 24 }}>
      <Readout label="Power" value={85} max={100} tone="accent" />
      <Readout label="Shields" value={42} max={100} tone="blue" />
      <Readout label="Core" value={742} unit="LY" tone="gold" />
      <Readout label="Range" value={12} unit="LY" tone="sky" />
    </div>
  ),
};

export const AllTones: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      <Readout label="Neutral" value={85} tone="neutral" />
      <Readout label="Accent" value={85} tone="accent" />
      <Readout label="Orange" value={85} tone="orange" />
      <Readout label="Gold" value={85} tone="gold" />
      <Readout label="Ice" value={85} tone="ice" />
      <Readout label="Blue" value={85} tone="blue" />
      <Readout label="Sky" value={85} tone="sky" />
      <Readout label="Lilac" value={85} tone="lilac" />
      <Readout label="Violet" value={85} tone="violet" />
    </div>
  ),
};

export const Sizes: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
      <Readout label="Power" value={85} max={100} unit="MW" size="sm" tone="gold" />
      <Readout label="Power" value={85} max={100} unit="MW" size="md" tone="gold" />
      <Readout label="Power" value={85} max={100} unit="MW" size="lg" tone="gold" />
    </div>
  ),
};

export const Alignments: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ width: 120, padding: 12, background: "#141414", borderRadius: 8 }}>
        <Readout label="Power" value={85} unit="MW" align="left" tone="accent" />
      </div>
      <div style={{ width: 120, padding: 12, background: "#141414", borderRadius: 8 }}>
        <Readout label="Power" value={85} unit="MW" align="center" tone="blue" />
      </div>
      <div style={{ width: 120, padding: 12, background: "#141414", borderRadius: 8 }}>
        <Readout label="Power" value={85} unit="MW" align="right" tone="gold" />
      </div>
    </div>
  ),
};

export const WarpCorePanel: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ padding: 16, background: "#141414", borderRadius: 12 }}>
      <div
        style={{
          marginBottom: 16,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#f2b654",
          fontFamily: "Antonio, sans-serif",
        }}
      >
        WARP CORE — EPOCH-S
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        <Readout label="Power" value={85} max={100} unit="MW" tone="gold" />
        <Readout label="Life" value={742} max={1000} unit="LY" tone="gold" />
        <Readout label="Regen" value={10} unit="/HR" tone="gold" />
      </div>
    </div>
  ),
};

export const ShipSystems: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 20,
        padding: 20,
        background: "#141414",
        borderRadius: 12,
        minWidth: 320,
      }}
    >
      <Readout label="Power" value={85} max={100} unit="MW" tone="accent" />
      <Readout label="Shields" value={0} max={100} unit="%" tone="accent" />
      <Readout label="Core Life" value={742} unit="LY" tone="accent" />
      <Readout label="Hull" value={100} unit="%" tone="accent" />
    </div>
  ),
};

export const NavigationPanel: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ padding: 16, background: "#141414", borderRadius: 12 }}>
      <div
        style={{
          marginBottom: 16,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#99ccff",
          fontFamily: "Antonio, sans-serif",
        }}
      >
        NAVIGATION — TAU CETI
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        <Readout label="Distance" value={11.9} unit="LY" tone="sky" />
        <Readout label="Jumps" value={3} max={3} tone="sky" />
        <Readout label="ETA" value="4h 32m" tone="sky" />
      </div>
    </div>
  ),
};

export const CenteredGrid: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 24,
        padding: 20,
        background: "#141414",
        borderRadius: 12,
        minWidth: 360,
      }}
    >
      <Readout label="Power" value={85} unit="MW" tone="accent" align="center" />
      <Readout label="Shields" value={42} unit="%" tone="accent" align="center" />
      <Readout label="Hull" value={100} unit="%" tone="accent" align="center" />
    </div>
  ),
};

export const WithAccentHighlight: Story = {
  args: { label: "", value: "" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ padding: 16, background: "#141414", borderRadius: 12 }}>
      <div
        style={{
          marginBottom: 16,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#99ccff",
          fontFamily: "Antonio, sans-serif",
        }}
      >
        SHIELDS — STATUS
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        <Readout label="Forward" value={100} unit="%" tone="sky" />
        <Readout label="Aft" value={100} unit="%" tone="sky" />
        <Readout label="Port" value={23} unit="%" tone="orange" />
        <Readout label="Starboard" value={100} unit="%" tone="sky" />
      </div>
    </div>
  ),
};
