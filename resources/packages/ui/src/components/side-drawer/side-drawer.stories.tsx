import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SideDrawer } from "./side-drawer";
import { Panel } from "../panel";
import { Title } from "../title";
import { Readout } from "../readout";
import { LogCard } from "../log-card";
import { StatusBadge } from "../status-badge";
import { Button } from "../button";
import { Countdown } from "../countdown";
import { ProgressBar } from "../progress-bar";

/* ================================================================
 *  Meta
 * ============================================================= */

const meta = {
  title: "Layout/SideDrawer",
  component: SideDrawer,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100dvh", boxSizing: "border-box", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SideDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ================================================================
 *  Design tokens
 * ============================================================= */

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  surface2: "#1b1b1b",
  border: "#2a2a2a",
  text: "#f0e6d2",
  muted: "#a39a88",
  accent: "#f2b654",
  sky: "#6699cc",
  lilac: "#cc99cc",
} as const;

const labelStyle: CSSProperties = {
  fontFamily: "Antonio, sans-serif",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "#555",
  textTransform: "uppercase",
};

/* ================================================================
 *  Placeholder Starfield
 * ============================================================= */

interface PlaceholderStar {
  name?: string;
  x: number;
  y: number;
  size: number;
  color: string;
  brightness: number;
}

const STARS: PlaceholderStar[] = [
  { name: "Sol", x: 38, y: 45, size: 6, color: C.accent, brightness: 1 },
  { name: "Tau Ceti", x: 68, y: 32, size: 5, color: "#ffe8a0", brightness: 0.9 },
  { name: "Alpha Centauri", x: 28, y: 28, size: 5, color: "#fffbe8", brightness: 0.95 },
  { name: "Barnard's Star", x: 52, y: 65, size: 3, color: "#ffbbaa", brightness: 0.5 },
  { name: "Sirius", x: 80, y: 55, size: 6, color: "#cce4ff", brightness: 1 },
  { x: 10, y: 12, size: 1.5, color: "#aabbcc", brightness: 0.2 },
  { x: 90, y: 18, size: 1, color: "#ccbbaa", brightness: 0.15 },
  { x: 5, y: 82, size: 1, color: "#bbbbcc", brightness: 0.12 },
  { x: 55, y: 10, size: 1, color: "#ccccbb", brightness: 0.18 },
  { x: 85, y: 40, size: 1.5, color: "#bbccdd", brightness: 0.2 },
  { x: 30, y: 78, size: 1, color: "#ddccbb", brightness: 0.14 },
  { x: 62, y: 85, size: 1.2, color: "#ccbbdd", brightness: 0.16 },
  { x: 15, y: 38, size: 1, color: "#bbccbb", brightness: 0.12 },
  { x: 72, y: 15, size: 1.2, color: "#ddddcc", brightness: 0.18 },
  { x: 92, y: 70, size: 1, color: "#bbaacc", brightness: 0.14 },
];

/**
 * Range ring centered on Sol.
 */
const RangeRing = ({ radius, label }: { radius: number; label: string }) => (
  <div style={{
    position: "absolute",
    left: "38%",
    top: "45%",
    width: `${radius}%`,
    height: `${radius}%`,
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    border: `1px solid ${C.border}44`,
    pointerEvents: "none",
  }}>
    <span style={{
      position: "absolute",
      top: -1,
      left: "50%",
      transform: "translate(-50%, -100%)",
      fontFamily: "Antonio, sans-serif",
      fontSize: 8,
      color: "#333",
      letterSpacing: "0.1em",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  </div>
);

/**
 * Placeholder starfield. Pure CSS — no Three.js.
 * Shows that the viewport resizes when the drawer opens/closes.
 */
const PlaceholderStarfield = () => (
  <Panel variant="inset" padding="none" style={{ height: "100%", position: "relative", overflow: "hidden" }}>
    {/* Background gradient */}
    <div style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at 38% 45%, ${C.surface2}88 0%, ${C.bg} 70%)`,
    }} />

    {/* Range rings */}
    <RangeRing radius={30} label="5 LY" />
    <RangeRing radius={55} label="10 LY" />
    <RangeRing radius={80} label="15 LY" />

    {/* Stars */}
    {STARS.map((star, i) => (
      <div
        key={star.name ?? i}
        style={{
          position: "absolute",
          left: `${star.x}%`,
          top: `${star.y}%`,
          transform: "translate(-50%, -50%)",
          zIndex: star.name ? 2 : 1,
        }}
      >
        {star.size >= 3 && (
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: star.size * 6,
            height: star.size * 6,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${star.color}18 0%, transparent 70%)`,
          }} />
        )}
        <div style={{
          width: star.size,
          height: star.size,
          borderRadius: "50%",
          background: star.color,
          opacity: star.brightness,
          boxShadow: `0 0 ${star.size * 2}px ${star.color}88`,
        }} />
        {star.name && (
          <div style={{
            position: "absolute",
            left: star.size / 2 + 8,
            top: "50%",
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
            fontFamily: "Antonio, sans-serif",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: C.muted,
            lineHeight: 1,
          }}>
            {star.name}
          </div>
        )}
      </div>
    ))}

    {/* Sector label */}
    <div style={{
      position: "absolute",
      bottom: 12,
      left: 16,
      fontFamily: "Antonio, sans-serif",
      fontSize: 10,
      letterSpacing: "0.12em",
      color: "#333",
      textTransform: "uppercase",
    }}>
      Sector 001 — Local Stellar Neighborhood
    </div>
  </Panel>
);

/* ================================================================
 *  Sidebar content
 * ============================================================= */

const SidebarContent = ({ children }: { children?: ReactNode }) => (
  <Panel tone="blue" padding="xs" style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
    <Title label="Navigation" />
    <Readout label="System" value="Sol" />
    <Readout label="Sector" value="001" />
    {children}
  </Panel>
);

const completedEntries = (
  <>
    <LogCard time="08:42" title="Docked at Sol Station" tone="accent"
      status={<StatusBadge tone="success" size="sm">Complete</StatusBadge>}
    />
    <LogCard time="06:15" title="Scan complete — Sol III" tone="lilac"
      status={<StatusBadge tone="success" size="sm">Complete</StatusBadge>}
      action={<Button variant="tertiary" size="sm">View Results</Button>}
    />
    <LogCard time="02:30" title="Arrived in Sol" tone="sky"
      status={<StatusBadge tone="success" size="sm">Complete</StatusBadge>}
    />
  </>
);

const LogShell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minHeight: 0 }}>
    <div style={{ ...labelStyle, padding: "2px 0", flexShrink: 0 }}>{label}</div>
    <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  </div>
);

/* ================================================================
 *  Stories
 * ============================================================= */

/**
 * Drawer open (default). The viewport and sidebar share the space.
 */
export const Default: Story = {
  args: {
    viewport: null,
    children: null,
  },
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <SideDrawer
        open={open}
        onToggle={() => setOpen((v) => !v)}
        viewport={<PlaceholderStarfield />}
        style={{ height: "100%" }}
      >
        <SidebarContent />
      </SideDrawer>
    );
  },
};

/**
 * Drawer closed — the starfield fills the full width.
 * Click the chevron tab to expand.
 */
export const Closed: Story = {
  args: {
    viewport: null,
    children: null,
  },
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <SideDrawer
        open={open}
        onToggle={() => setOpen((v) => !v)}
        viewport={<PlaceholderStarfield />}
        style={{ height: "100%" }}
      >
        <SidebarContent />
      </SideDrawer>
    );
  },
};

/**
 * Full bridge composition with ship log entries in the sidebar.
 */
export const WithLog: Story = {
  args: {
    viewport: null,
    children: null,
  },
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <SideDrawer
        open={open}
        onToggle={() => setOpen((v) => !v)}
        viewport={<PlaceholderStarfield />}
        style={{ height: "100%" }}
      >
        <Panel tone="blue" padding="xs" style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          <Title label="Navigation" />
          <Readout label="System" value="Sol" />
          <LogShell label="Ship Log">
            <LogCard time="now" title="Scanning Tau Ceti" tone="lilac" variant="active"
              status={<StatusBadge tone="info" size="sm" pulse>In Progress</StatusBadge>}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ProgressBar value={32} tone="lilac" size="sm" />
                <Countdown remaining={4320} tone="lilac" active label="Remaining" size="sm" />
              </div>
            </LogCard>
            {completedEntries}
          </LogShell>
        </Panel>
      </SideDrawer>
    );
  },
};

/**
 * Custom width (300px) to show the width prop works.
 */
export const NarrowDrawer: Story = {
  args: {
    viewport: null,
    children: null,
  },
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <SideDrawer
        open={open}
        onToggle={() => setOpen((v) => !v)}
        width={300}
        viewport={<PlaceholderStarfield />}
        style={{ height: "100%" }}
      >
        <SidebarContent />
      </SideDrawer>
    );
  },
};
