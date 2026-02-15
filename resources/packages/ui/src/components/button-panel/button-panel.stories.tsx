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
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ width: 120 }}>
      <ButtonPanel edge="left" layout="compact">
        <Button variant="primary">Power</Button>
        <Button variant="primary">Shields</Button>
        <Button variant="primary">Warp</Button>
      </ButtonPanel>
    </div>
  ),
};

export const RightEdge: Story = {
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ width: 120 }}>
      <ButtonPanel edge="right" layout="compact">
        <Button variant="ghost">Navigation</Button>
        <Button variant="ghost">Sensors</Button>
        <Button variant="ghost">Comms</Button>
      </ButtonPanel>
    </div>
  ),
};

export const SpaceLayout: Story = {
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ width: 120, height: 300 }}>
      <ButtonPanel edge="left" layout="space">
        <Button variant="primary">Top</Button>
        <Button variant="primary">Middle</Button>
        <Button variant="primary">Bottom</Button>
      </ButtonPanel>
    </div>
  ),
};

export const StretchLayout: Story = {
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ width: 120, height: 300 }}>
      <ButtonPanel edge="left" layout="stretch">
        <Button variant="primary">Power</Button>
        <Button variant="primary">Shields</Button>
        <Button variant="primary">Warp</Button>
        <Button variant="primary">Impulse</Button>
      </ButtonPanel>
    </div>
  ),
};

export const AllLayouts: Story = {
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 48 }}>
      <div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          COMPACT
        </div>
        <div style={{ width: 100, height: 200, background: "#111", padding: 8 }}>
          <ButtonPanel layout="compact">
            <Button size="sm" variant="primary">PWR</Button>
            <Button size="sm" variant="primary">SHD</Button>
            <Button size="sm" variant="primary">WRP</Button>
          </ButtonPanel>
        </div>
      </div>
      <div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          SPACE
        </div>
        <div style={{ width: 100, height: 200, background: "#111", padding: 8 }}>
          <ButtonPanel layout="space">
            <Button size="sm" variant="ghost">NAV</Button>
            <Button size="sm" variant="ghost">SNS</Button>
            <Button size="sm" variant="ghost">COM</Button>
          </ButtonPanel>
        </div>
      </div>
      <div>
        <div style={{ color: "#666", fontSize: 10, marginBottom: 8, fontFamily: "Antonio, sans-serif", letterSpacing: "0.1em" }}>
          STRETCH
        </div>
        <div style={{ width: 100, height: 200, background: "#111", padding: 8 }}>
          <ButtonPanel layout="stretch">
            <Button size="sm" variant="danger">WPN</Button>
            <Button size="sm" variant="danger">TGT</Button>
            <Button size="sm" variant="danger">ALT</Button>
          </ButtonPanel>
        </div>
      </div>
    </div>
  ),
};
