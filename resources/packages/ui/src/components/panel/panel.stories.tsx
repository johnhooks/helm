import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "./panel";
import { TitleBar } from "../title-bar";
import { StatusBadge } from "../status-badge";
import { SystemGrid, SystemCell } from "../system-grid";
import { StackIndicator } from "../stack-indicator";
import { Readout } from "../readout";

const meta = {
  title: "Layout/Panel",
  component: Panel,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "accent", "orange", "gold", "peach", "blue", "sky", "lilac", "violet", "danger"],
    },
    variant: {
      control: "select",
      options: ["default", "bordered", "bracket", "inset"],
    },
    padding: {
      control: "select",
      options: ["none", "xs", "sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Panel content goes here",
    tone: "neutral",
    variant: "default",
    padding: "md",
  },
};

export const AllVariants: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, minWidth: 400 }}>
      <div>
        <div style={{ color: "#666", fontSize: 11, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>DEFAULT</div>
        <Panel variant="default">
          <div style={{ color: "#ccc" }}>Simple dark container with rounded corners</div>
        </Panel>
      </div>

      <div>
        <div style={{ color: "#666", fontSize: 11, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>BORDERED</div>
        <Panel variant="bordered" tone="gold">
          <div style={{ color: "#ccc" }}>Adds a subtle border accent with glow</div>
        </Panel>
      </div>

      <div>
        <div style={{ color: "#666", fontSize: 11, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>INSET</div>
        <Panel variant="inset">
          <div style={{ color: "#ccc" }}>Recessed appearance for nested panels</div>
        </Panel>
      </div>

      <div>
        <div style={{ color: "#666", fontSize: 11, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>BRACKET</div>
        <Panel variant="bracket" tone="sky">
          <div style={{ color: "#ccc" }}>Vertical bars on sides like holding brackets</div>
        </Panel>
      </div>
    </div>
  ),
};

export const BracketTones: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 300 }}>
      <Panel variant="bracket" tone="gold">
        <div style={{ color: "#ccc" }}>Warp Core Status</div>
      </Panel>
      <Panel variant="bracket" tone="sky">
        <div style={{ color: "#ccc" }}>Shield Matrix</div>
      </Panel>
      <Panel variant="bracket" tone="lilac">
        <div style={{ color: "#ccc" }}>Sensor Array</div>
      </Panel>
    </div>
  ),
};

export const BorderedAlert: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Panel variant="bordered" tone="danger" padding="lg">
      <TitleBar title="Warning" tone="danger">
        <StatusBadge tone="danger" pulse>CRITICAL</StatusBadge>
      </TitleBar>
      <div style={{ color: "#ccc", lineHeight: 1.6 }}>
        Hull breach detected in section 14. Emergency forcefields are holding.
        Recommend immediate evacuation of affected areas.
      </div>
    </Panel>
  ),
};

export const NestedPanels: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Panel variant="default" tone="gold" padding="lg">
      <TitleBar title="Engineering" subtitle="Power Systems" tone="gold">
        <StatusBadge tone="success">NOMINAL</StatusBadge>
      </TitleBar>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <Panel variant="inset" padding="md">
          <div style={{ fontSize: 10, color: "#666", marginBottom: 12, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>PRIMARY</div>
          <Readout label="Warp Core" value={85} unit="%" tone="gold" />
        </Panel>
        <Panel variant="inset" padding="md">
          <div style={{ fontSize: 10, color: "#666", marginBottom: 12, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>SECONDARY</div>
          <Readout label="Impulse" value={92} unit="%" tone="gold" />
        </Panel>
      </div>
    </Panel>
  ),
};

export const EngineeringConsole: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Panel variant="default" padding="lg">
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

      <div style={{ marginTop: 24 }}>
        <Panel variant="inset" padding="md">
          <div style={{ fontSize: 10, color: "#666", marginBottom: 12, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>SHIELD GRID</div>
          <SystemGrid columns={4} gap="lg">
            <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="lg" tone="sky" />}>
              <Readout label="Forward" value={100} unit="%" tone="sky" align="center" size="sm" />
            </SystemCell>
            <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="lg" tone="sky" />}>
              <Readout label="Aft" value={100} unit="%" tone="sky" align="center" size="sm" />
            </SystemCell>
            <SystemCell layout="column" indicator={<StackIndicator level={23} segments={5} size="lg" tone="orange" />}>
              <Readout label="Port" value={23} unit="%" tone="orange" align="center" size="sm" />
            </SystemCell>
            <SystemCell layout="column" indicator={<StackIndicator level={100} segments={5} size="lg" tone="sky" />}>
              <Readout label="Starboard" value={100} unit="%" tone="sky" align="center" size="sm" />
            </SystemCell>
          </SystemGrid>
        </Panel>
      </div>
    </Panel>
  ),
};

export const NavigationConsole: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Panel variant="bracket" tone="sky" padding="lg">
      <TitleBar title="Navigation" subtitle="En Route to Tau Ceti" tone="sky">
        <StatusBadge tone="info">WARP 6</StatusBadge>
      </TitleBar>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Panel variant="inset" padding="md">
          <div style={{ fontSize: 10, color: "#666", marginBottom: 16, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>JOURNEY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Readout label="Progress" value={67} unit="%" tone="sky" />
            <Readout label="Distance" value={11.9} unit="LY" tone="sky" />
            <Readout label="Remaining" value={3.9} unit="LY" tone="sky" />
            <Readout label="ETA" value="4h 32m" tone="sky" />
          </div>
        </Panel>

        <Panel variant="inset" padding="md">
          <div style={{ fontSize: 10, color: "#666", marginBottom: 16, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>DESTINATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Readout label="System" value="Tau Ceti" tone="lilac" />
            <Readout label="Class" value="G8.5 V" tone="lilac" />
            <Readout label="Planets" value={4} tone="lilac" />
            <Readout label="Stations" value={2} tone="lilac" />
          </div>
        </Panel>
      </div>
    </Panel>
  ),
};

export const TacticalConsole: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Panel variant="bordered" tone="danger" padding="lg">
      <TitleBar title="Tactical" subtitle="Combat Status" tone="danger">
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
        <SystemCell layout="column" indicator={<StackIndicator level={45} segments={5} size="xl" tone="gold" />}>
          <Readout label="Threat" value={45} unit="%" tone="gold" align="center" size="sm" />
        </SystemCell>
      </SystemGrid>
    </Panel>
  ),
};

export const MultiPanelLayout: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, maxWidth: 900 }}>
      <Panel variant="default" padding="md">
        <TitleBar title="Main Viewer" tone="gold" />
        <Panel variant="inset" padding="lg">
          <div style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#333",
            fontSize: 12,
            fontFamily: "Antonio, sans-serif",
            letterSpacing: "0.1em",
          }}>
            STARFIELD VISUALIZATION
          </div>
        </Panel>
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Panel variant="bracket" tone="sky" padding="sm">
          <Readout label="Heading" value="127.4" unit="MK" tone="sky" size="sm" />
        </Panel>
        <Panel variant="bracket" tone="sky" padding="sm">
          <Readout label="Velocity" value="0.8" unit="C" tone="sky" size="sm" />
        </Panel>
        <Panel variant="bracket" tone="gold" padding="sm">
          <Readout label="Power" value={85} unit="%" tone="gold" size="sm" />
        </Panel>
        <Panel variant="bracket" tone="accent" padding="sm">
          <Readout label="Shields" value={100} unit="%" tone="accent" size="sm" />
        </Panel>
      </div>
    </div>
  ),
};
