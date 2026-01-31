import type { Meta, StoryObj } from "@storybook/react-vite";
import { SystemGrid, SystemCell } from "./system-grid";
import { Readout } from "../readout";
import { ArcIndicator } from "../arc-indicator";
import { BarIndicator } from "../bar-indicator";
import { StackIndicator } from "../stack-indicator";
import { StatusBadge } from "../status-badge";
import { TitleBar } from "../title-bar";

const meta = {
  title: "Layout/SystemGrid",
  component: SystemGrid,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
} satisfies Meta<typeof SystemGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    columns: 2,
    gap: "md",
    children: null,
  },
  render: () => (
    <SystemGrid columns={2}>
      <SystemCell indicator={<ArcIndicator level={85} size="lg" tone="accent" />}>
        <Readout label="Power" value={85} max={100} unit="MW" tone="accent" />
      </SystemCell>
      <SystemCell indicator={<ArcIndicator level={42} size="lg" tone="accent" />}>
        <Readout label="Shields" value={42} max={100} unit="%" tone="accent" />
      </SystemCell>
    </SystemGrid>
  ),
};

export const EngineeringPanel: Story = {
  args: {
    columns: 2,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
      }}
    >
      <TitleBar title="Engineering" subtitle="Main Systems" tone="gold">
        <StatusBadge tone="success">ALL SYSTEMS NOMINAL</StatusBadge>
      </TitleBar>

      <SystemGrid columns={6} gap="md">
        <SystemCell layout="column" indicator={<StackIndicator level={85} segments={5} size="xl" tone="gold" />}>
          <Readout label="Warp Core" value={85} unit="%" tone="gold" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={92} segments={5} size="xl" tone="gold" />}>
          <Readout label="Impulse" value={92} unit="%" tone="gold" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={74} segments={5} size="xl" tone="gold" />}>
          <Readout label="Core Life" value={74} unit="%" tone="gold" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="accent" />}>
          <Readout label="Hull" value={100} unit="%" tone="accent" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={98} segments={5} size="xl" tone="accent" />}>
          <Readout label="Life Sup" value={98} unit="%" tone="accent" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="accent" />}>
          <Readout label="Dampers" value={100} unit="%" tone="accent" align="center" size="sm" />
        </SystemCell>
      </SystemGrid>

      {/* Shields row */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: "1px solid #333",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#666",
            marginBottom: 16,
            fontFamily: "Antonio, sans-serif",
          }}
        >
          SHIELD GRID
        </div>
        <SystemGrid columns={4} gap="lg">
          <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="sky" />}>
            <Readout label="Forward" value={100} unit="%" tone="sky" align="center" size="sm" />
          </SystemCell>
          <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="sky" />}>
            <Readout label="Aft" value={100} unit="%" tone="sky" align="center" size="sm" />
          </SystemCell>
          <SystemCell layout="column" indicator={<StackIndicator level={23} segments={5} size="xl" tone="orange" />}>
            <Readout label="Port" value={23} unit="%" tone="orange" align="center" size="sm" />
          </SystemCell>
          <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="sky" />}>
            <Readout label="Starboard" value={100} unit="%" tone="sky" align="center" size="sm" />
          </SystemCell>
        </SystemGrid>
      </div>
    </div>
  ),
};

export const TacticalPanel: Story = {
  args: {
    columns: 4,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
      }}
    >
      <TitleBar title="Tactical" subtitle="Weapons Array" tone="danger">
        <StatusBadge tone="danger" pulse>RED ALERT</StatusBadge>
      </TitleBar>

      <SystemGrid columns={4} gap="lg">
        <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="orange" />}>
          <Readout label="Phasers" value={100} unit="%" tone="orange" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={78} segments={5} size="xl" tone="orange" />}>
          <Readout label="Targeting" value={78} unit="%" tone="orange" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="xl" tone="orange" />}>
          <Readout label="Torpedoes" value={12} max={12} tone="orange" align="center" size="sm" />
        </SystemCell>
        <SystemCell layout="column" indicator={<StackIndicator level={45} segments={5} size="xl" tone="orange" />}>
          <Readout label="Threat" value={45} unit="%" tone="orange" align="center" size="sm" />
        </SystemCell>
      </SystemGrid>
    </div>
  ),
};

export const NavigationPanel: Story = {
  args: {
    columns: 2,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
        minWidth: 650,
      }}
    >
      <TitleBar title="Navigation" subtitle="En Route to Tau Ceti" tone="sky">
        <StatusBadge tone="info">WARP 6</StatusBadge>
      </TitleBar>

      <div style={{ display: "flex", gap: 48 }}>
        {/* Left column - Journey (no indicators, just readouts) */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#666",
              marginBottom: 16,
              fontFamily: "Antonio, sans-serif",
            }}
          >
            JOURNEY STATUS
          </div>
          <SystemGrid columns={1} gap="sm">
            <SystemCell>
              <Readout label="Progress" value={67} unit="%" tone="sky" />
            </SystemCell>
            <SystemCell>
              <Readout label="Distance" value={11.9} unit="LY" tone="sky" />
            </SystemCell>
            <SystemCell>
              <Readout label="Remaining" value={3.9} unit="LY" tone="sky" />
            </SystemCell>
            <SystemCell>
              <Readout label="ETA" value="4h 32m" tone="sky" />
            </SystemCell>
          </SystemGrid>
        </div>

        {/* Right column - Drive (all bars) */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#666",
              marginBottom: 16,
              fontFamily: "Antonio, sans-serif",
            }}
          >
            WARP DRIVE
          </div>
          <SystemGrid columns={1} gap="sm">
            <SystemCell indicator={<BarIndicator level={67} size="lg" tone="lilac" />}>
              <Readout label="Warp Factor" value={6} max={9} tone="lilac" />
            </SystemCell>
            <SystemCell indicator={<BarIndicator level={72} size="lg" tone="lilac" />}>
              <Readout label="Field Stability" value={72} unit="%" tone="lilac" />
            </SystemCell>
            <SystemCell indicator={<BarIndicator level={85} size="lg" tone="lilac" />}>
              <Readout label="Plasma Flow" value={85} unit="%" tone="lilac" />
            </SystemCell>
          </SystemGrid>
        </div>
      </div>
    </div>
  ),
};

export const ColumnLayout: Story = {
  args: {
    columns: 4,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
      }}
    >
      <TitleBar title="Core Systems Overview" tone="gold" />
      <SystemGrid columns={4} gap="lg">
        <SystemCell layout="column" indicator={<ArcIndicator level={85} size="2xl" tone="gold" />}>
          <Readout label="Power" value={85} unit="%" tone="gold" align="center" />
        </SystemCell>
        <SystemCell layout="column" indicator={<ArcIndicator level={100} size="2xl" tone="sky" />}>
          <Readout label="Shields" value={100} unit="%" tone="sky" align="center" />
        </SystemCell>
        <SystemCell layout="column" indicator={<ArcIndicator level={100} size="2xl" tone="accent" />}>
          <Readout label="Hull" value={100} unit="%" tone="accent" align="center" />
        </SystemCell>
        <SystemCell layout="column" indicator={<ArcIndicator level={98} size="2xl" tone="lilac" />}>
          <Readout label="Life" value={98} unit="%" tone="lilac" align="center" />
        </SystemCell>
      </SystemGrid>
    </div>
  ),
};

export const CriticalAlert: Story = {
  args: {
    columns: 2,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
        minWidth: 500,
        border: "2px solid #ff6b6b",
        boxShadow: "0 0 40px rgba(255, 107, 107, 0.2)",
      }}
    >
      <TitleBar title="Critical Damage Report" tone="danger">
        <StatusBadge tone="danger" pulse>HULL BREACH</StatusBadge>
      </TitleBar>

      <SystemGrid columns={2} gap="lg">
        <SystemCell indicator={<ArcIndicator level={23} size="xl" tone="orange" />}>
          <Readout label="Hull Integrity" value={23} unit="%" tone="orange" />
        </SystemCell>
        <SystemCell indicator={<ArcIndicator level={0} size="xl" tone="orange" />}>
          <Readout label="Shields" value={0} unit="%" tone="orange" />
        </SystemCell>
        <SystemCell indicator={<ArcIndicator level={45} size="xl" tone="gold" />}>
          <Readout label="Warp Core" value={45} unit="%" tone="gold" />
        </SystemCell>
        <SystemCell indicator={<ArcIndicator level={17} size="xl" tone="orange" />}>
          <Readout label="Torpedoes" value={2} max={12} tone="orange" />
        </SystemCell>
      </SystemGrid>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "rgba(255, 107, 107, 0.1)",
          borderRadius: 8,
          border: "1px solid rgba(255, 107, 107, 0.3)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#ff6b6b",
            fontFamily: "Antonio, sans-serif",
            marginBottom: 8,
          }}
        >
          DAMAGE CONTROL PRIORITY
        </div>
        <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>
          Hull breach detected in sections 12-14. Emergency forcefields active.
          Recommend immediate withdrawal from combat.
        </div>
      </div>
    </div>
  ),
};

export const StacksPanel: Story = {
  args: {
    columns: 3,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
        minWidth: 500,
      }}
    >
      <TitleBar title="Cargo Manifest" tone="gold" />
      <SystemGrid columns={3} gap="lg">
        <SystemCell indicator={<StackIndicator level={80} segments={5} size="lg" tone="gold" />}>
          <Readout label="Dilithium" value={80} max={100} unit="T" tone="gold" />
        </SystemCell>
        <SystemCell indicator={<StackIndicator level={45} segments={5} size="lg" tone="gold" />}>
          <Readout label="Deuterium" value={45} max={100} unit="T" tone="gold" />
        </SystemCell>
        <SystemCell indicator={<StackIndicator level={92} segments={5} size="lg" tone="gold" />}>
          <Readout label="Antimatter" value={92} max={100} unit="T" tone="gold" />
        </SystemCell>
      </SystemGrid>
    </div>
  ),
};

export const ReadoutsOnly: Story = {
  args: {
    columns: 2,
    children: null,
  },
  render: () => (
    <div
      style={{
        background: "#0a0a0a",
        padding: 32,
        borderRadius: 16,
        minWidth: 400,
      }}
    >
      <TitleBar title="Sensor Readings" tone="sky" />
      <SystemGrid columns={2} gap="md">
        <SystemCell>
          <Readout label="Range" value={12.4} unit="LY" tone="sky" />
        </SystemCell>
        <SystemCell>
          <Readout label="Bearing" value="127.4" unit="MK" tone="sky" />
        </SystemCell>
        <SystemCell>
          <Readout label="Velocity" value="0.8" unit="C" tone="sky" />
        </SystemCell>
        <SystemCell>
          <Readout label="Mass" value="4.2M" unit="KG" tone="sky" />
        </SystemCell>
      </SystemGrid>
    </div>
  ),
};
