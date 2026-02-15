import type { Meta, StoryObj } from "@storybook/react-vite";
import { MatrixIndicator } from "./matrix-indicator";
import { LCARS_TONES } from "../../tones";

const meta = {
  title: "UI/Indicators/Matrix",
  component: MatrixIndicator,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: [...LCARS_TONES],
    },
    level: { control: { type: "range", min: 0, max: 100 } },
    rows: { control: { type: "number", min: 2, max: 12 } },
    cols: { control: { type: "number", min: 2, max: 12 } },
  },
} satisfies Meta<typeof MatrixIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: "orange",
    level: 62,
    rows: 6,
    cols: 4,
  },
};
