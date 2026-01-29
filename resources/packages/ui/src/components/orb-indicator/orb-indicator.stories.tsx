import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrbIndicator } from "./orb-indicator";

const meta = {
  title: "UI/Indicators/Orb",
  component: OrbIndicator,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl", "2xl"] },
    tone: {
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
  },
} satisfies Meta<typeof OrbIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
    tone: "accent",
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <OrbIndicator size="sm" tone="accent" />
      <OrbIndicator size="md" tone="accent" />
      <OrbIndicator size="lg" tone="accent" />
      <OrbIndicator size="xl" tone="accent" />
      <OrbIndicator size="2xl" tone="accent" />
    </div>
  ),
};
