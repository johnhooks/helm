import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "ghost", "danger"],
    },
    surface: {
      control: "select",
      options: [
        "neutral",
        "base",
        "accent",
        "muted",
        "danger",
        "success",
        "warning",
        "info",
        "orange",
        "gold",
        "peach",
        "sunset",
        "blue",
        "sky",
        "ice",
        "lilac",
        "violet",
        "plum",
        "hopbush",
      ],
    },
    size: { control: "inline-radio", options: ["sm", "md"] },
    edge: { control: "inline-radio", options: ["none", "left", "right"] },
    fullWidth: { control: "boolean" },
    stacked: { control: "boolean" },
    disabled: { control: "boolean" },
    secondary: { control: "text" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Engage",
    variant: "primary",
    size: "md",
    edge: "none",
    fullWidth: false,
    stacked: false,
    disabled: false,
    secondary: "E-01",
  },
};

export const Variants: Story = {
  args: { children: "Button" },
  render: () => (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const EdgeStack: Story = {
  args: { children: "Button" },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        width: "520px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Button
          variant="primary"
          edge="left"
          fullWidth
          stacked
          secondary="E-01"
        >
          Helm
        </Button>
        <Button
          variant="secondary"
          edge="left"
          fullWidth
          stacked
          secondary="CF-44"
        >
          Nav
        </Button>
        <Button variant="ghost" edge="left" fullWidth stacked secondary="OPS">
          Ops
        </Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Button
          variant="primary"
          edge="right"
          fullWidth
          stacked
          secondary="TK-7"
        >
          Tactical
        </Button>
        <Button
          variant="secondary"
          edge="right"
          fullWidth
          stacked
          secondary="SN-2"
        >
          Sensors
        </Button>
        <Button variant="ghost" edge="right" fullWidth stacked secondary="CM-9">
          Comms
        </Button>
      </div>
    </div>
  ),
};
