import type { Meta, StoryObj } from "@storybook/react-vite";
import { TitleBar } from "./title-bar";
import { StatusBadge } from "../status-badge";

const meta = {
  title: "Layout/TitleBar",
  component: TitleBar,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "accent", "orange", "gold", "peach", "blue", "sky", "lilac", "violet", "danger"],
    },
  },
} satisfies Meta<typeof TitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Engineering",
    subtitle: "Main Systems",
    tone: "gold",
  },
};

export const WithStatus: Story = {
  args: {
    title: "Engineering",
    subtitle: "Main Systems",
    tone: "gold",
  },
  render: (args) => (
    <div style={{ minWidth: 400 }}>
      <TitleBar {...args}>
        <StatusBadge tone="success">ALL SYSTEMS NOMINAL</StatusBadge>
      </TitleBar>
    </div>
  ),
};

export const Danger: Story = {
  args: {
    title: "Critical Damage Report",
    tone: "danger",
  },
  render: (args) => (
    <div style={{ minWidth: 400 }}>
      <TitleBar {...args}>
        <StatusBadge tone="danger" pulse>HULL BREACH</StatusBadge>
      </TitleBar>
    </div>
  ),
};

export const Navigation: Story = {
  args: {
    title: "Navigation",
    subtitle: "En Route to Tau Ceti",
    tone: "sky",
  },
  render: (args) => (
    <div style={{ minWidth: 400 }}>
      <TitleBar {...args}>
        <StatusBadge tone="info">WARP 6</StatusBadge>
      </TitleBar>
    </div>
  ),
};

export const AllTones: Story = {
  args: {
    title: "Panel",
    tone: "gold",
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 300 }}>
      <TitleBar title="Neutral" tone="neutral" />
      <TitleBar title="Accent" tone="accent" />
      <TitleBar title="Orange" tone="orange" />
      <TitleBar title="Gold" tone="gold" />
      <TitleBar title="Peach" tone="peach" />
      <TitleBar title="Blue" tone="blue" />
      <TitleBar title="Sky" tone="sky" />
      <TitleBar title="Lilac" tone="lilac" />
      <TitleBar title="Violet" tone="violet" />
      <TitleBar title="Danger" tone="danger" />
    </div>
  ),
};
