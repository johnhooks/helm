import type { Meta, StoryObj } from "@storybook/react-vite";
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
      options: [
        "neutral",
        "base",
        "accent",
        "muted",
        "orange",
        "gold",
        "blue",
        "sky",
        "lilac",
        "violet",
      ],
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
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SelectControl
        options={scanDepthOptions}
        placeholder="Neutral"
        surface="neutral"
      />
      <SelectControl
        options={scanDepthOptions}
        placeholder="Gold"
        surface="gold"
      />
      <SelectControl
        options={scanDepthOptions}
        placeholder="Sky"
        surface="sky"
      />
      <SelectControl
        options={scanDepthOptions}
        placeholder="Lilac"
        surface="lilac"
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
