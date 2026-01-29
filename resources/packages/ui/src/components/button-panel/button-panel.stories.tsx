import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { ButtonPanel } from "./button-panel";

const meta = {
  title: "UI/ButtonPanel",
  component: ButtonPanel,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    edge: { control: "inline-radio" },
    layout: { control: "inline-radio" },
  },
} satisfies Meta<typeof ButtonPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LeftStack: Story = {
  args: { edge: "left", layout: "compact", children: "" },
  render: (args) => (
    <ButtonPanel {...args}>
      <Button variant="primary" edge="left" fullWidth stacked>
        Helm
      </Button>
      <Button variant="secondary" edge="left" fullWidth stacked>
        Nav
      </Button>
      <Button variant="ghost" edge="left" fullWidth stacked>
        Ops
      </Button>
    </ButtonPanel>
  ),
};

export const RightStretch: Story = {
  args: { edge: "right", layout: "stretch", children: "" },
  render: (args) => (
    <div style={{ height: "240px" }}>
      <ButtonPanel {...args}>
        <Button variant="primary" edge="right" fullWidth stacked>
          Tactical
        </Button>
        <Button variant="secondary" edge="right" fullWidth stacked>
          Sensors
        </Button>
        <Button variant="ghost" edge="right" fullWidth stacked>
          Comms
        </Button>
      </ButtonPanel>
    </div>
  ),
};
