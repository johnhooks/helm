import type { Meta, StoryObj } from "@storybook/react-vite";
import { StackIndicator } from "./stack-indicator";
import { LCARS_TONES } from "../../tones";

const meta = {
  title: "UI/Indicators/Stack",
  component: StackIndicator,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl", "2xl"] },
    tone: {
      control: "select",
      options: [...LCARS_TONES],
    },
    level: { control: { type: "range", min: 0, max: 100 } },
    segments: { control: { type: "number", min: 2, max: 10 } },
  },
} satisfies Meta<typeof StackIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
    tone: "violet",
    level: 72,
    segments: 6,
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "16px" }}>
      <StackIndicator size="sm" tone="violet" level={72} segments={6} />
      <StackIndicator size="md" tone="violet" level={72} segments={6} />
      <StackIndicator size="lg" tone="violet" level={72} segments={6} />
      <StackIndicator size="xl" tone="violet" level={72} segments={6} />
      <StackIndicator size="2xl" tone="violet" level={72} segments={6} />
    </div>
  ),
};
