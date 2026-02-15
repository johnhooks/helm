import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrbIndicator } from "./orb-indicator";
import { LCARS_TONES } from "../../tones";

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
      options: [...LCARS_TONES],
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
  parameters: { controls: { disable: true } },
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
