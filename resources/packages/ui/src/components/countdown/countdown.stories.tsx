import type { Meta, StoryObj } from "@storybook/react-vite";
import { Countdown } from "./countdown";
import { ArcIndicator } from "../arc-indicator";
import { StackIndicator } from "../stack-indicator";
import { Panel } from "../panel";
import { TitleBar } from "../title-bar";
import { StatusBadge } from "../status-badge";
import { ProgressBar } from "../progress-bar";
import { Readout } from "../readout";
import { LCARS_TONES } from "../../tones";

const meta = {
  title: "Display/Countdown",
  component: Countdown,
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
    layout: {
      control: "radio",
      options: ["row", "column"],
    },
  },
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "ETA",
    remaining: 16320, // 4h 32m
    tone: "sky",
    size: "md",
    layout: "row",
  },
};

export const Active: Story = {
  args: {
    label: "Jump",
    remaining: 16320,
    total: 24000,
    tone: "sky",
    size: "md",
    active: true,
  },
};

export const Sizes: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
      <Countdown label="Small" remaining={16320} size="sm" tone="sky" />
      <Countdown label="Medium" remaining={16320} size="md" tone="sky" />
      <Countdown label="Large" remaining={16320} size="lg" tone="sky" />
    </div>
  ),
};

export const WithArcIndicator: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <Countdown
      label="Jump Progress"
      remaining={8160} // half done
      total={16320}
      tone="sky"
      size="md"
      active
      indicator={<ArcIndicator level={50} size="xl" tone="sky" />}
    />
  ),
};

export const WithStackIndicator: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <Countdown
      label="Scan"
      remaining={4800} // 1h 20m - about 70% done
      total={16320}
      tone="lilac"
      size="md"
      active
      indicator={<StackIndicator level={70} segments={5} size="xl" tone="lilac" />}
    />
  ),
};

export const ColumnLayout: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 48 }}>
      <Countdown
        label="Jump"
        remaining={16320}
        total={24000}
        tone="sky"
        size="md"
        layout="column"
        active
        indicator={<ArcIndicator level={32} size="2xl" tone="sky" />}
      />
      <Countdown
        label="Scan"
        remaining={8100}
        total={14400}
        tone="lilac"
        size="md"
        layout="column"
        active
        indicator={<ArcIndicator level={44} size="2xl" tone="lilac" />}
      />
      <Countdown
        label="Repair"
        remaining={2700}
        total={3600}
        tone="orange"
        size="md"
        layout="column"
        active
        indicator={<ArcIndicator level={75} size="2xl" tone="orange" />}
      />
    </div>
  ),
};

export const TimeFormats: Story = {
  args: { remaining: 0 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Countdown label="Days" remaining={172800} tone="gold" /> {/* 2 days */}
      <Countdown label="Hours" remaining={16320} tone="sky" /> {/* 4h 32m */}
      <Countdown label="Minutes" remaining={540} tone="lilac" /> {/* 9m */}
      <Countdown label="Seconds" remaining={45} tone="orange" /> {/* 45s */}
      <Countdown label="Complete" remaining={0} tone="accent" />
    </div>
  ),
};

export const JumpPanel: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ minWidth: 450 }}>
      <Panel variant="default" padding="lg">
        <TitleBar title="Navigation" subtitle="Jump in Progress" tone="sky">
          <StatusBadge tone="info">WARP 6</StatusBadge>
        </TitleBar>

        <div style={{ display: "flex", gap: 32, marginBottom: 24 }}>
          <Countdown
            label="ETA"
            remaining={16320}
            total={24000}
            tone="sky"
            size="lg"
            layout="column"
            active
            indicator={<ArcIndicator level={32} size="2xl" tone="sky" />}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <Readout label="Destination" value="Tau Ceti" tone="sky" size="sm" />
            <Readout label="Distance" value={11.9} unit="LY" tone="sky" size="sm" />
            <Readout label="Traveled" value={3.8} unit="LY" tone="sky" size="sm" />
          </div>
        </div>

        <ProgressBar value={32} tone="sky" size="md" active label="Jump progress" />
      </Panel>
    </div>
  ),
};

export const MultipleOperations: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ minWidth: 500 }}>
      <Panel variant="default" padding="lg">
        <TitleBar title="Active Operations" tone="gold" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          <Countdown
            label="Jump"
            remaining={16320}
            total={24000}
            tone="sky"
            size="sm"
            layout="column"
            active
            indicator={<ArcIndicator level={32} size="xl" tone="sky" />}
          />
          <Countdown
            label="Scan"
            remaining={8100}
            total={14400}
            tone="lilac"
            size="sm"
            layout="column"
            active
            indicator={<ArcIndicator level={44} size="xl" tone="lilac" />}
          />
          <Countdown
            label="Repair"
            remaining={2700}
            total={3600}
            tone="orange"
            size="sm"
            layout="column"
            active
            indicator={<ArcIndicator level={75} size="xl" tone="orange" />}
          />
        </div>
      </Panel>
    </div>
  ),
};

export const StackCountdowns: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ minWidth: 400 }}>
      <Panel variant="default" padding="lg">
        <TitleBar title="Queue" tone="gold" />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <StackIndicator level={67} segments={5} size="lg" tone="sky" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--helm-ui-color-sky)", letterSpacing: "0.05em", marginBottom: 2 }}>
                JUMP TO TAU CETI
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>4h 32m remaining</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--helm-ui-color-sky)" }}>67%</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <StackIndicator level={44} segments={5} size="lg" tone="lilac" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--helm-ui-color-lilac)", letterSpacing: "0.05em", marginBottom: 2 }}>
                DEEP SPACE SCAN
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>2h 15m remaining</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--helm-ui-color-lilac)" }}>44%</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <StackIndicator level={75} segments={5} size="lg" tone="orange" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--helm-ui-color-orange)", letterSpacing: "0.05em", marginBottom: 2 }}>
                SHIELD REPAIR
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>45m remaining</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--helm-ui-color-orange)" }}>75%</div>
          </div>
        </div>
      </Panel>
    </div>
  ),
};

export const UsingReadout: Story = {
  args: { remaining: 16320 },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ minWidth: 300 }}>
      <Panel variant="default" padding="lg">
        <TitleBar title="Jump Status" tone="sky" />

        {/* Readout can display time too */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Readout label="ETA" value="4h 32m" tone="sky" />
          <Readout label="Progress" value={67} unit="%" tone="sky" />
          <Readout label="Distance" value={3.8} unit="LY" tone="sky" />
        </div>
      </Panel>
    </div>
  ),
};
