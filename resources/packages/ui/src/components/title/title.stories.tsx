import type { Meta, StoryObj } from "@storybook/react-vite";
import { Title } from "./title";

const meta = {
  title: "UI/Title",
  component: Title,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    align: { control: "inline-radio" },
    size: { control: "inline-radio" },
  },
} satisfies Meta<typeof Title>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "System Status",
    align: "left",
    size: "sm",
  },
};

export const Alignments: Story = {
  args: { label: "Title" },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "320px",
      }}
    >
      <Title label="Navigation" align="left" size="sm" />
      <Title label="Operations" align="right" size="sm" />
    </div>
  ),
};
