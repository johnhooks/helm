import type { Meta, StoryObj } from "@storybook/react-vite";
import { LcarsFrame } from "./lcars-frame";
import { StatusBadge } from "../status-badge";
import { Readout } from "../readout";

const meta = {
  title: "Experimental/LcarsFrame",
  component: LcarsFrame,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "accent", "orange", "gold", "peach", "blue", "sky", "lilac", "violet", "danger"],
    },
  },
} satisfies Meta<typeof LcarsFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Engineering",
    tone: "gold",
    children: (
      <div style={{ color: "#ccc" }}>
        Main content area. The sidebar to the left can hold navigation buttons.
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export const WithSidebarButtons: Story = {
  args: {
    title: "Engineering",
    tone: "gold",
    children: null,
  },
  render: () => (
    <div style={{ minWidth: 400 }}>
      <LcarsFrame
        title="Engineering"
        tone="gold"
        sidebar={
          <>
            <button type="button" data-subtext="07-341">PWR</button>
            <button type="button" data-subtext="14-092">SHD</button>
            <button type="button" data-subtext="22-187">WRP</button>
            <button type="button" data-subtext="09-445">IMP</button>
          </>
        }
        headerActions={<StatusBadge tone="success">NOMINAL</StatusBadge>}
      >
        <div style={{ color: "#ccc" }}>
          <p>Select a system from the sidebar to view details.</p>
        </div>
      </LcarsFrame>
    </div>
  ),
};

export const NavigationFrame: Story = {
  args: {
    title: "Navigation",
    tone: "sky",
    children: null,
  },
  render: () => (
    <div style={{ minWidth: 400 }}>
      <LcarsFrame
        title="Navigation"
        tone="sky"
        sidebar={
          <>
            <button type="button" data-subtext="41-227">MAP</button>
            <button type="button" data-subtext="18-903">RTE</button>
            <button type="button" data-subtext="55-118">WPT</button>
            <button type="button" data-subtext="33-764">SNS</button>
          </>
        }
        headerActions={<StatusBadge tone="info">WARP 6</StatusBadge>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Readout label="Destination" value="Tau Ceti" tone="sky" size="sm" />
          <Readout label="Distance" value={11.9} unit="LY" tone="sky" size="sm" />
          <Readout label="ETA" value="4h 32m" tone="sky" size="sm" />
        </div>
      </LcarsFrame>
    </div>
  ),
};

export const TacticalFrame: Story = {
  args: {
    title: "Tactical",
    tone: "danger",
    children: null,
  },
  render: () => (
    <div style={{ minWidth: 400 }}>
      <LcarsFrame
        title="Tactical"
        tone="danger"
        sidebar={
          <>
            <button type="button" data-subtext="88-201">WPN</button>
            <button type="button" data-subtext="14-092">SHD</button>
            <button type="button" data-subtext="67-445">TGT</button>
            <button type="button" data-subtext="99-000">ALT</button>
          </>
        }
        headerActions={<StatusBadge tone="danger" pulse>RED ALERT</StatusBadge>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Readout label="Phasers" value={100} unit="%" tone="orange" size="sm" />
          <Readout label="Torpedoes" value={12} max={12} tone="orange" size="sm" />
          <Readout label="Threat" value={45} unit="%" tone="gold" size="sm" />
        </div>
      </LcarsFrame>
    </div>
  ),
};

export const AllTones: Story = {
  args: {
    title: "Test",
    tone: "gold",
    children: null,
  },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(280px, 1fr))", gap: 24 }}>
      <LcarsFrame title="Gold" tone="gold" sidebar={<button type="button" data-subtext="07-341">ENG</button>}>
        <div style={{ color: "#ccc", fontSize: 11 }}>Engineering</div>
      </LcarsFrame>
      <LcarsFrame title="Sky" tone="sky" sidebar={<button type="button" data-subtext="41-227">NAV</button>}>
        <div style={{ color: "#ccc", fontSize: 11 }}>Navigation</div>
      </LcarsFrame>
      <LcarsFrame title="Accent" tone="accent" sidebar={<button type="button" data-subtext="31-847">OPS</button>}>
        <div style={{ color: "#ccc", fontSize: 11 }}>Operations</div>
      </LcarsFrame>
      <LcarsFrame title="Danger" tone="danger" sidebar={<button type="button" data-subtext="88-201">TAC</button>}>
        <div style={{ color: "#ccc", fontSize: 11 }}>Tactical</div>
      </LcarsFrame>
    </div>
  ),
};

export const CompactVsExpanded: Story = {
  args: {
    title: "Test",
    tone: "gold",
    children: null,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <div style={{ color: "#666", fontSize: 11, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          COMPACT (under 600px)
        </div>
        <div style={{ width: 320 }}>
          <LcarsFrame
            title="Engineering"
            tone="gold"
            sidebar={
              <>
                <button type="button">PWR</button>
                <button type="button">SHD</button>
                <button type="button">WRP</button>
              </>
            }
          >
            <Readout label="Core" value={85} unit="%" tone="gold" size="sm" />
          </LcarsFrame>
        </div>
      </div>

      <div>
        <div style={{ color: "#666", fontSize: 11, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          EXPANDED (600px+)
        </div>
        <div style={{ width: 700 }}>
          <LcarsFrame
            title="Engineering"
            tone="gold"
            sidebar={
              <>
                <button type="button">Power</button>
                <button type="button">Shields</button>
                <button type="button">Warp</button>
              </>
            }
            headerActions={<StatusBadge tone="success">NOMINAL</StatusBadge>}
          >
            <Readout label="Warp Core" value={85} unit="%" tone="gold" />
          </LcarsFrame>
        </div>
      </div>
    </div>
  ),
};

export const LargeContent: Story = {
  args: {
    title: "Systems Overview",
    tone: "gold",
    children: null,
  },
  render: () => (
    <div style={{ width: 800, height: 400 }}>
      <LcarsFrame
        title="Systems Overview"
        tone="gold"
        sidebar={
          <>
            <button type="button" data-subtext="07-341">ENG</button>
            <button type="button" data-subtext="88-201">TAC</button>
            <button type="button" data-subtext="41-227">NAV</button>
            <button type="button" data-subtext="62-508">SCI</button>
            <button type="button" data-subtext="31-847">OPS</button>
            <button type="button" data-subtext="19-623">MED</button>
          </>
        }
        headerActions={<StatusBadge tone="success">ALL SYS</StatusBadge>}
        style={{ height: "100%" }}
      >
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#333",
            fontSize: 12,
            fontFamily: "Antonio, sans-serif",
            letterSpacing: "0.1em",
          }}
        >
          MAIN VIEWER
        </div>
      </LcarsFrame>
    </div>
  ),
};
