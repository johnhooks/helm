import type { Meta, StoryObj } from "@storybook/react-vite";
import { ButtonPanel } from "./button-panel";
import { Button } from "../button";

const meta = {
  title: "Layout/ButtonPanel",
  component: ButtonPanel,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    edge: {
      control: "radio",
      options: ["left", "right"],
    },
    layout: {
      control: "radio",
      options: ["compact", "space", "stretch"],
    },
  },
} satisfies Meta<typeof ButtonPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    edge: "left",
    layout: "compact",
    children: (
      <>
        <Button surface="accent">Power</Button>
        <Button surface="accent">Shields</Button>
        <Button surface="accent">Warp</Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 120 }}>
        <Story />
      </div>
    ),
  ],
};

export const RightEdge: Story = {
  args: {
    edge: "right",
    layout: "compact",
    children: (
      <>
        <Button surface="base">Navigation</Button>
        <Button surface="base">Sensors</Button>
        <Button surface="base">Comms</Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 120 }}>
        <Story />
      </div>
    ),
  ],
};

export const SpaceLayout: Story = {
  args: {
    edge: "left",
    layout: "space",
    children: (
      <>
        <Button surface="accent">Top</Button>
        <Button surface="accent">Middle</Button>
        <Button surface="accent">Bottom</Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 120, height: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const StretchLayout: Story = {
  args: {
    edge: "left",
    layout: "stretch",
    children: (
      <>
        <Button surface="accent">Power</Button>
        <Button surface="accent">Shields</Button>
        <Button surface="accent">Warp</Button>
        <Button surface="accent">Impulse</Button>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 120, height: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const AllLayouts: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div style={{ display: "flex", gap: 48 }}>
      <div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          COMPACT
        </div>
        <div style={{ width: 100, height: 200, background: "#111", padding: 8 }}>
          <ButtonPanel layout="compact">
            <Button size="sm" surface="accent">PWR</Button>
            <Button size="sm" surface="accent">SHD</Button>
            <Button size="sm" surface="accent">WRP</Button>
          </ButtonPanel>
        </div>
      </div>
      <div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          SPACE
        </div>
        <div style={{ width: 100, height: 200, background: "#111", padding: 8 }}>
          <ButtonPanel layout="space">
            <Button size="sm" surface="base">NAV</Button>
            <Button size="sm" surface="base">SNS</Button>
            <Button size="sm" surface="base">COM</Button>
          </ButtonPanel>
        </div>
      </div>
      <div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          STRETCH
        </div>
        <div style={{ width: 100, height: 200, background: "#111", padding: 8 }}>
          <ButtonPanel layout="stretch">
            <Button size="sm" surface="danger">WPN</Button>
            <Button size="sm" surface="danger">TGT</Button>
            <Button size="sm" surface="danger">ALT</Button>
          </ButtonPanel>
        </div>
      </div>
    </div>
  ),
};
