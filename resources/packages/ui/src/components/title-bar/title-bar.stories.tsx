import type { Meta, StoryObj } from "@storybook/react-vite";
import { TitleBar } from "./title-bar";

const meta = {
  title: "UI/TitleBar",
  component: TitleBar,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    align: { control: "inline-radio" },
    tone: { control: "inline-radio" },
    size: { control: "inline-radio" },
    surface: { control: "select" },
  },
} satisfies Meta<typeof TitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    label: "Operations",
    align: "left",
    tone: "neutral",
    size: "md",
  },
};

export const Alignments: Story = {
  args: { label: "Label" },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "520px",
      }}
    >
      <TitleBar label="Docking Control" align="left" tone="neutral" />
      <TitleBar label="Flight Status" align="right" tone="neutral" />
      <TitleBar label="Warp Core" align="left" tone="accent" />
    </div>
  ),
};
