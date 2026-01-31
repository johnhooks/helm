import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toggle } from "./toggle";

const meta = {
  title: "Controls/Toggle",
  component: Toggle,
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
    labelPosition: {
      control: "radio",
      options: ["left", "right"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Auto-scan",
    surface: "accent",
    size: "md",
  },
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Toggle
          checked={checked}
          onChange={setChecked}
          label={checked ? "Enabled" : "Disabled"}
        />
        <span style={{ color: "#a39a88", fontSize: 12 }}>
          State: {checked ? "ON" : "OFF"}
        </span>
      </div>
    );
  },
};

export const Surfaces: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Toggle defaultChecked label="Accent" surface="accent" />
      <Toggle defaultChecked label="Orange" surface="orange" />
      <Toggle defaultChecked label="Gold" surface="gold" />
      <Toggle defaultChecked label="Blue" surface="blue" />
      <Toggle defaultChecked label="Sky" surface="sky" />
      <Toggle defaultChecked label="Success" surface="success" />
      <Toggle defaultChecked label="Lilac" surface="lilac" />
      <Toggle defaultChecked label="Violet" surface="violet" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Toggle defaultChecked label="Small" size="sm" />
      <Toggle defaultChecked label="Medium" size="md" />
    </div>
  ),
};

export const LabelPosition: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Toggle defaultChecked label="Label Right" labelPosition="right" />
      <Toggle defaultChecked label="Label Left" labelPosition="left" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Toggle disabled label="Disabled Off" />
      <Toggle disabled defaultChecked label="Disabled On" />
    </div>
  ),
};

export const NoLabel: Story = {
  args: {
    "aria-label": "Toggle setting",
    defaultChecked: true,
  },
};

export const SystemSettings: Story = {
  render: () => {
    const [settings, setSettings] = useState({
      autoScan: true,
      shields: false,
      comms: true,
      stealth: false,
    });

    const toggle = (key: keyof typeof settings) => () => {
      setSettings((s) => ({ ...s, [key]: !s[key] }));
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 20,
          background: "#141414",
          borderRadius: 12,
          minWidth: 200,
        }}
      >
        <Toggle
          checked={settings.autoScan}
          onChange={toggle("autoScan")}
          label="Auto-scan"
          surface="sky"
        />
        <Toggle
          checked={settings.shields}
          onChange={toggle("shields")}
          label="Shields"
          surface="blue"
        />
        <Toggle
          checked={settings.comms}
          onChange={toggle("comms")}
          label="Comms"
          surface="gold"
        />
        <Toggle
          checked={settings.stealth}
          onChange={toggle("stealth")}
          label="Stealth"
          surface="violet"
        />
      </div>
    );
  },
};
