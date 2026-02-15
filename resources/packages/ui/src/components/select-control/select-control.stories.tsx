import type { Meta, StoryObj } from "@storybook/react-vite";
import { LCARS_TONES } from "../../tones";
import { SelectControl } from "./select-control";

const meta = {
  title: "Controls/SelectControl",
  component: SelectControl,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    surface: {
      control: "select",
      options: ["neutral", "base", "accent", "muted"],
    },
    tone: {
      control: "select",
      options: [...LCARS_TONES],
    },
    size: {
      control: "radio",
      options: ["sm", "md"],
    },
  },
} satisfies Meta<typeof SelectControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const scanDepthOptions = [
  { value: "quick", label: "Quick Scan" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep Scan" },
  { value: "intensive", label: "Intensive" },
];

const systemOptions = [
  { value: "alpha-centauri", label: "Alpha Centauri" },
  { value: "proxima", label: "Proxima Centauri" },
  { value: "barnards", label: "Barnard's Star" },
  { value: "wolf-359", label: "Wolf 359" },
  { value: "sirius", label: "Sirius" },
];

export const Default: Story = {
  args: {
    options: scanDepthOptions,
    placeholder: "Select scan depth...",
    surface: "neutral",
    size: "md",
  },
};

export const WithValue: Story = {
  args: {
    options: scanDepthOptions,
    defaultValue: scanDepthOptions[1],
  },
};

export const Searchable: Story = {
  args: {
    options: systemOptions,
    placeholder: "Search systems...",
    isSearchable: true,
  },
};

export const Clearable: Story = {
  args: {
    options: scanDepthOptions,
    defaultValue: scanDepthOptions[0],
    isClearable: true,
  },
};

export const Disabled: Story = {
  args: {
    options: scanDepthOptions,
    defaultValue: scanDepthOptions[2],
    isDisabled: true,
  },
};

export const Small: Story = {
  args: {
    options: scanDepthOptions,
    placeholder: "Select...",
    size: "sm",
  },
};

export const Surfaces: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SelectControl
        options={scanDepthOptions}
        placeholder="Neutral"
        surface="neutral"
      />
      <SelectControl
        options={scanDepthOptions}
        placeholder="Base"
        surface="base"
      />
      <SelectControl
        options={scanDepthOptions}
        placeholder="Accent"
        surface="accent"
      />
      <SelectControl
        options={scanDepthOptions}
        placeholder="Muted"
        surface="muted"
      />
    </div>
  ),
};

export const MultiSelect: Story = {
  args: {
    options: systemOptions,
    placeholder: "Select destinations...",
    isMulti: true,
  },
};

export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="accent"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="orange"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="gold"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="blue"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="sky"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="success"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="lilac"
      />
      <SelectControl
        options={scanDepthOptions}
        defaultValue={scanDepthOptions[1]}
        tone="violet"
      />
    </div>
  ),
};
