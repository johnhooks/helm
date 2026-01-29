import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarIndicator } from "./bar-indicator";

const meta = {
  title: "UI/Indicators/Bar",
  component: BarIndicator,
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
    level: { control: { type: "range", min: 0, max: 100 } },
  },
} satisfies Meta<typeof BarIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
    tone: "sunset",
    level: 62,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
      <BarIndicator size="sm" tone="sunset" level={62} />
      <BarIndicator size="md" tone="sunset" level={62} />
      <BarIndicator size="lg" tone="sunset" level={62} />
      <BarIndicator size="xl" tone="sunset" level={62} />
      <BarIndicator size="2xl" tone="sunset" level={62} />
    </div>
  ),
};
