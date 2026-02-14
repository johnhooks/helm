import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedControl } from "./segmented-control";

const meta = {
  title: "Controls/SegmentedControl",
  component: SegmentedControl,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    surface: {
      control: "select",
      options: [
        "accent",
        "orange",
        "gold",
        "blue",
        "sky",
        "success",
        "lilac",
        "violet",
      ],
    },
    size: {
      control: "radio",
      options: ["sm", "md"],
    },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const scanOptions = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep" },
];

const rangeOptions = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
  { value: "extreme", label: "Extreme" },
];

const powerOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

export const Default: Story = {
  args: {
    options: scanOptions,
    defaultValue: "standard",
    surface: "accent",
    size: "md",
  },
};

export const Controlled: Story = {
  args: {
    options: rangeOptions,
  },
  render: () => {
    const [value, setValue] = useState("medium");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SegmentedControl
          options={rangeOptions}
          value={value}
          onChange={setValue}
          surface="sky"
        />
        <span style={{ color: "#a39a88", fontSize: 12 }}>
          Selected: {value}
        </span>
      </div>
    );
  },
};

export const Surfaces: Story = {
  args: {
    options: powerOptions,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="accent" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="orange" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="gold" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="blue" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="sky" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="success" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="lilac" />
      <SegmentedControl options={powerOptions} defaultValue="normal" surface="violet" />
    </div>
  ),
};

export const Sizes: Story = {
  args: {
    options: scanOptions,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SegmentedControl options={scanOptions} defaultValue="standard" size="sm" />
      <SegmentedControl options={scanOptions} defaultValue="standard" size="md" />
    </div>
  ),
};

export const FullWidth: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    options: scanOptions,
    defaultValue: "standard",
    fullWidth: true,
    surface: "gold",
  },
};

export const Disabled: Story = {
  args: {
    options: scanOptions,
    defaultValue: "standard",
    disabled: true,
  },
};

export const PartiallyDisabled: Story = {
  args: {
    options: [
      { value: "quick", label: "Quick" },
      { value: "standard", label: "Standard" },
      { value: "deep", label: "Deep", disabled: true },
    ],
    defaultValue: "quick",
  },
};

export const Vertical: Story = {
  args: {
    options: powerOptions,
    defaultValue: "normal",
    orientation: "vertical",
    surface: "gold",
    size: "sm",
  },
};

export const VerticalControlled: Story = {
  args: {
    options: powerOptions,
  },
  render: () => {
    const [value, setValue] = useState("normal");
    return (
      <div style={{ display: "flex", gap: 16, alignItems: "start" }}>
        <SegmentedControl
          options={[
            { value: "low", label: "EFF" },
            { value: "normal", label: "NRM" },
            { value: "high", label: "OVR" },
          ]}
          value={value}
          onChange={setValue}
          orientation="vertical"
          surface="gold"
          size="sm"
        />
        <span style={{ color: "#a39a88", fontSize: 12 }}>
          Selected: {value}
        </span>
      </div>
    );
  },
};

export const ManyOptions: Story = {
  args: {
    options: [
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
      { value: "5", label: "5" },
      { value: "6", label: "6" },
    ],
    defaultValue: "3",
    surface: "violet",
  },
};

export const ScanDepthPanel: Story = {
  args: {
    options: scanOptions,
  },
  render: () => {
    const [depth, setDepth] = useState("standard");
    const [range, setRange] = useState("medium");

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 20,
          background: "#141414",
          borderRadius: 12,
          minWidth: 280,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              color: "#a39a88",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Scan Depth
          </span>
          <SegmentedControl
            options={scanOptions}
            value={depth}
            onChange={setDepth}
            surface="gold"
            fullWidth
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              color: "#a39a88",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Sensor Range
          </span>
          <SegmentedControl
            options={rangeOptions}
            value={range}
            onChange={setRange}
            surface="sky"
            fullWidth
          />
        </div>
      </div>
    );
  },
};
