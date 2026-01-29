import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { ButtonPanel } from "../button-panel";
import { Title } from "../title/title";
import { Widget } from "./widget";

const meta = {
  title: "UI/Widget",
  component: Widget,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    edge: { control: "inline-radio" },
    titlePosition: { control: "inline-radio" },
    titleAlign: { control: "inline-radio" },
  },
} satisfies Meta<typeof Widget>;

export default meta;
type Story = StoryObj<typeof meta>;

const LeftPanel = () => (
  <ButtonPanel edge="left" layout="stretch">
    <Button variant="primary" edge="left" fullWidth stacked secondary="E-01">
      Helm
    </Button>
    <Button variant="secondary" edge="left" fullWidth stacked secondary="CF-44">
      Nav
    </Button>
    <Button variant="ghost" edge="left" fullWidth stacked secondary="OPS">
      Ops
    </Button>
  </ButtonPanel>
);

const RightPanel = () => (
  <ButtonPanel edge="right" layout="stretch">
    <Button variant="primary" edge="right" fullWidth stacked secondary="TK-7">
      Tactical
    </Button>
    <Button variant="secondary" edge="right" fullWidth stacked secondary="SN-2">
      Sensors
    </Button>
    <Button variant="ghost" edge="right" fullWidth stacked secondary="CM-9">
      Comms
    </Button>
  </ButtonPanel>
);

export const LeftEdge: Story = {
  args: {
    title: "Flight Control",
    titleAlign: "left",
    titlePosition: "top",
    edge: "left",
    surface: "neutral",
  },
  render: (args) => (
    <Widget {...args} buttonPanel={<LeftPanel />}>
      <div style={{ display: "grid", gap: "12px" }}>
        <Title label="Status" size="sm" align="left" />
        <div style={{ color: "#b9ad96", fontSize: "12px" }}>
          Navigation feed active. Heading stable. Warp field nominal.
        </div>
      </div>
    </Widget>
  ),
};

export const RightEdge: Story = {
  args: {
    title: "Tactical",
    titleAlign: "right",
    titlePosition: "top",
    edge: "right",
    surface: "neutral",
  },
  render: (args) => (
    <Widget {...args} buttonPanel={<RightPanel />}>
      <div style={{ display: "grid", gap: "12px", textAlign: "right" }}>
        <Title label="Alerts" size="sm" align="right" />
        <div style={{ color: "#b9ad96", fontSize: "12px" }}>
          Shield array balanced. Target lock standby.
        </div>
      </div>
    </Widget>
  ),
};
