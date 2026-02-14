import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Panel } from "./panel";
import { StatusBadge } from "../status-badge";
import { Readout } from "../readout";
import { Countdown } from "../countdown";
import { ProgressBar } from "../progress-bar";
import { Button } from "../button";
import { ContextMenu } from "../context-menu";
import { MatrixIndicator } from "../matrix-indicator";
import { LogCard } from "../log-card";
import { SegmentedControl } from "../segmented-control";

/* ================================================================
 *  Meta
 * ============================================================= */

const meta = {
  title: "Compositions/Bridge Overview",
  component: Panel,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <>
        <style>{`
          @keyframes helm-pulse-ring {
            0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.3); }
          }
          @keyframes helm-twinkle {
            0%, 100% { opacity: var(--base-opacity); }
            50%      { opacity: calc(var(--base-opacity) * 0.4); }
          }
          @keyframes helm-drift-line {
            0%   { opacity: 0; }
            50%  { opacity: 0.06; }
            100% { opacity: 0; }
          }
        `}</style>
        <div style={{ height: "100dvh", boxSizing: "border-box" }}>
          <Story />
        </div>
      </>
    ),
  ],
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ================================================================
 *  Design tokens (inline — mirrors tokens.css values)
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
  gold: "#ffcc66",
  orange: "#ff9900",
  danger: "#cc4444",
  success: "#8fbf4d",
  info: "#7fb2ff",
} as const;

/* ================================================================
 *  Shared styles
 * ============================================================= */

const labelStyle: CSSProperties = {
  fontFamily: "Antonio, sans-serif",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "#555",
  textTransform: "uppercase",
};

/* ================================================================
 *  Engineering Card
 * ============================================================= */

/**
 * Base values (Normal mode). Multipliers from PowerMode enum:
 *   Efficiency → output 0.7×, regen 0.5×, decay 0.0×
 *   Normal     → output 1.0×, regen 1.0×, decay 1.0×
 *   Overdrive  → output 1.3×, regen 1.3×, decay 2.5×
 */
const POWER_MODES = {
  efficiency: { label: "Efficiency", output: 0.7, regen: 0.5, decay: 0.0 },
  normal:     { label: "Normal",     output: 1.0, regen: 1.0, decay: 1.0 },
  overdrive:  { label: "Overdrive",  output: 1.3, regen: 1.3, decay: 2.5 },
} as const;

const BASE = {
  energy: 850, energyMax: 1000,
  regenRate: 2.4,    // MJ/h
  coreLife: 42,       // ly remaining
  jumpRange: 12,      // ly (sustain)
  jumpSpeed: 3.2,     // ly/day (amplitude)
  jumpDraw: 120,      // MJ per jump
  sensorRange: 8,     // ly (base range)
  scanDuration: 72,   // min (route scan)
  discovery: 82,      // % (first-hop chance)
} as const;

const MODE_OPTIONS = [
  { value: "efficiency", label: "Efficiency" },
  { value: "normal", label: "Normal" },
  { value: "overdrive", label: "Overdrive" },
];

const EngCell = ({ label, value, unit, max, level, tone = "gold" }: {
  label: string;
  value: ReactNode;
  unit: string;
  max?: ReactNode;
  level: number;
  tone?: "gold" | "accent" | "sky" | "lilac";
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
    <MatrixIndicator level={level} rows={4} cols={3} tone={tone} />
    <Readout label={label} value={value} max={max} unit={unit} tone={tone} size="sm" />
  </div>
);

type PowerModeKey = keyof typeof POWER_MODES;

const sectionLabel: CSSProperties = {
  ...labelStyle,
  fontSize: 9,
  color: "#444",
  padding: "2px 0 0",
};

const readoutGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
};

const ShipCard = ({ mode, onModeChange }: { mode: PowerModeKey; onModeChange: (m: PowerModeKey) => void }) => {
  const m = POWER_MODES[mode];
  const recharge = +(BASE.regenRate * m.regen).toFixed(1);
  const jumpRange = +(BASE.jumpRange * m.output).toFixed(1);
  const speed = +(BASE.jumpSpeed * m.output).toFixed(1);
  const sensorRange = +(BASE.sensorRange * m.output).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
      <div style={{ ...labelStyle, padding: "2px 0" }}>Ship Systems</div>
      <Panel variant="default" padding="sm" style={{ border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={sectionLabel}>Engineering</div>
          <div style={readoutGrid}>
            <EngCell label="Energy" value={BASE.energy} max={BASE.energyMax} unit="MJ" level={85} tone="gold" />
            <EngCell label="Recharge" value={recharge} unit="MJ/h" level={m.regen * 50} tone="gold" />
            <EngCell label="Core Life" value={BASE.coreLife} unit="ly" level={84} tone="accent" />
          </div>
          <div style={sectionLabel}>Navigation</div>
          <div style={readoutGrid}>
            <EngCell label="Range" value={jumpRange} unit="ly" level={m.output * 70} tone="sky" />
            <EngCell label="Speed" value={speed} unit="ly/d" level={m.output * 65} tone="sky" />
            <EngCell label="Draw" value={BASE.jumpDraw} unit="MJ" level={60} tone="gold" />
          </div>
          <div style={sectionLabel}>Sensors</div>
          <div style={readoutGrid}>
            <EngCell label="Range" value={sensorRange} unit="ly" level={m.output * 65} tone="lilac" />
            <EngCell label="Scan" value={BASE.scanDuration} unit="min" level={55} tone="lilac" />
            <EngCell label="Discovery" value={BASE.discovery} unit="%" level={BASE.discovery} tone="lilac" />
          </div>
          <div style={sectionLabel}>Power Mode</div>
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={(v) => onModeChange(v as PowerModeKey)}
            surface="neutral"
            size="sm"
            fullWidth
            aria-label="Power mode"
          />
        </div>
      </Panel>
    </div>
  );
};

/* ================================================================
 *  Starfield
 * ============================================================= */

interface Star {
  name?: string;
  x: number;          // % from left
  y: number;          // % from top
  size: number;       // px
  color: string;
  brightness: number; // 0–1
  spectral?: string;  // label under name
}

const STARS: Star[] = [
  // Sol — center-ish, bright and warm
  { name: "Sol", x: 38, y: 45, size: 6, color: C.accent, brightness: 1, spectral: "G2V" },
  // Major named stars
  { name: "Tau Ceti", x: 68, y: 32, size: 5, color: "#ffe8a0", brightness: 0.9, spectral: "G8.5V" },
  { name: "Alpha Centauri", x: 28, y: 28, size: 5, color: "#fffbe8", brightness: 0.95, spectral: "G2V" },
  { name: "Barnard's Star", x: 52, y: 65, size: 3, color: "#ffbbaa", brightness: 0.5, spectral: "M4V" },
  { name: "Wolf 359", x: 18, y: 58, size: 2, color: "#ff9988", brightness: 0.35, spectral: "M6.5V" },
  { name: "Sirius", x: 80, y: 55, size: 6, color: "#cce4ff", brightness: 1, spectral: "A1V" },
  { name: "Luyten's Star", x: 45, y: 20, size: 2, color: "#ffccbb", brightness: 0.35, spectral: "M3.5V" },
  { name: "Ross 128", x: 75, y: 75, size: 2, color: "#ffbbaa", brightness: 0.3, spectral: "M4V" },
  // Background field — unnamed, small, dim
  { x: 10, y: 12, size: 1.5, color: "#aabbcc", brightness: 0.2 },
  { x: 90, y: 18, size: 1, color: "#ccbbaa", brightness: 0.15 },
  { x: 5, y: 82, size: 1, color: "#bbbbcc", brightness: 0.12 },
  { x: 55, y: 10, size: 1, color: "#ccccbb", brightness: 0.18 },
  { x: 85, y: 40, size: 1.5, color: "#bbccdd", brightness: 0.2 },
  { x: 30, y: 78, size: 1, color: "#ddccbb", brightness: 0.14 },
  { x: 62, y: 85, size: 1.2, color: "#ccbbdd", brightness: 0.16 },
  { x: 15, y: 38, size: 1, color: "#bbccbb", brightness: 0.12 },
  { x: 48, y: 50, size: 1, color: "#ccccdd", brightness: 0.1 },
  { x: 72, y: 15, size: 1.2, color: "#ddddcc", brightness: 0.18 },
  { x: 35, y: 90, size: 1, color: "#aabbbb", brightness: 0.1 },
  { x: 92, y: 70, size: 1, color: "#bbaacc", brightness: 0.14 },
  { x: 22, y: 50, size: 1.2, color: "#ccddcc", brightness: 0.16 },
  { x: 60, y: 48, size: 1, color: "#bbcccc", brightness: 0.11 },
  { x: 42, y: 72, size: 1, color: "#ddbbcc", brightness: 0.13 },
  { x: 8, y: 25, size: 1, color: "#cccccc", brightness: 0.1 },
  { x: 88, y: 88, size: 1.2, color: "#bbbbaa", brightness: 0.15 },
];

const StarDot = ({ star, selected = false }: { star: Star; selected?: boolean }) => (
  <div style={{
    position: "absolute",
    left: `${star.x}%`,
    top: `${star.y}%`,
    transform: "translate(-50%, -50%)",
    zIndex: star.name ? 2 : 1,
  }}>
    {/* Selection ring */}
    {selected && (
      <div style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `1.5px solid ${C.sky}`,
        animation: "helm-pulse-ring 2s ease-in-out infinite",
        boxShadow: `0 0 12px ${C.sky}44`,
      }} />
    )}

    {/* Star glow */}
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

    {/* Star point */}
    <div style={{
      width: star.size,
      height: star.size,
      borderRadius: "50%",
      background: star.color,
      opacity: star.brightness,
      boxShadow: `0 0 ${star.size * 2}px ${star.color}88`,
      // @ts-expect-error -- CSS custom property for keyframes
      "--base-opacity": star.brightness,
      animation: !star.name
        ? `helm-twinkle ${3 + star.x % 4}s ease-in-out ${(star.y % 3)}s infinite`
        : undefined,
    }} />

    {/* Label */}
    {star.name && (
      <div style={{
        position: "absolute",
        left: star.size / 2 + 8,
        top: "50%",
        transform: "translateY(-50%)",
        whiteSpace: "nowrap",
      }}>
        <div style={{
          fontFamily: "Antonio, sans-serif",
          fontSize: selected ? 12 : 10,
          letterSpacing: "0.06em",
          color: selected ? C.text : C.muted,
          lineHeight: 1,
        }}>
          {star.name}
        </div>
        {star.spectral && (
          <div style={{
            fontFamily: "Antonio, sans-serif",
            fontSize: 8,
            letterSpacing: "0.1em",
            color: "#444",
            marginTop: 2,
          }}>
            {star.spectral}
          </div>
        )}
      </div>
    )}
  </div>
);

/**
 * Faint grid lines for depth
 */
const GridOverlay = () => (
  <>
    {[20, 40, 60, 80].map((pct) => (
      <div key={`v${pct}`} style={{
        position: "absolute",
        left: `${pct}%`,
        top: 0,
        bottom: 0,
        width: 1,
        background: `linear-gradient(to bottom, transparent, ${C.border}33, transparent)`,
        animation: `helm-drift-line ${6 + (pct % 3)}s ease-in-out infinite`,
      }} />
    ))}
    {[25, 50, 75].map((pct) => (
      <div key={`h${pct}`} style={{
        position: "absolute",
        top: `${pct}%`,
        left: 0,
        right: 0,
        height: 1,
        background: `linear-gradient(to right, transparent, ${C.border}33, transparent)`,
        animation: `helm-drift-line ${7 + (pct % 4)}s ease-in-out infinite`,
      }} />
    ))}
  </>
);

/**
 * Jump range ring centered on Sol
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

const StarfieldView = ({ selectedStar, children }: { selectedStar?: string; children?: ReactNode }) => (
  <Panel variant="inset" padding="none" style={{ height: "100%", position: "relative", overflow: "hidden" }}>
    {/* Deep space background */}
    <div style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at 38% 45%, ${C.surface2}88 0%, ${C.bg} 70%)`,
    }} />

    <GridOverlay />

    {/* Range rings */}
    <RangeRing radius={30} label="5 LY" />
    <RangeRing radius={55} label="10 LY" />
    <RangeRing radius={80} label="15 LY" />

    {/* Stars */}
    {STARS.map((star, i) => (
      <StarDot key={star.name ?? i} star={star} selected={star.name === selectedStar} />
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

    {/* Overlays (context menu, etc.) */}
    {children}
  </Panel>
);

/* ================================================================
 *  Survey View (system map)
 * ============================================================= */

interface Planet {
  name: string;
  orbit: number;   // % radius from center
  angle: number;   // degrees
  size: number;    // px
  color: string;
  type: string;
  scanned?: boolean;
}

const SOL_PLANETS: Planet[] = [
  { name: "Mercury", orbit: 12, angle: 45, size: 4, color: "#aa9988", type: "Rocky" },
  { name: "Venus", orbit: 20, angle: 160, size: 6, color: "#ddbb77", type: "Rocky" },
  { name: "Earth", orbit: 28, angle: 280, size: 6, color: "#6699cc", type: "Terran", scanned: true },
  { name: "Mars", orbit: 36, angle: 30, size: 5, color: "#cc7755", type: "Rocky", scanned: true },
  { name: "Jupiter", orbit: 52, angle: 200, size: 12, color: "#ddaa77", type: "Gas Giant" },
  { name: "Saturn", orbit: 64, angle: 320, size: 10, color: "#ddcc88", type: "Gas Giant" },
  { name: "Uranus", orbit: 76, angle: 110, size: 7, color: "#88bbcc", type: "Ice Giant" },
  { name: "Neptune", orbit: 88, angle: 240, size: 7, color: "#5577cc", type: "Ice Giant" },
];

const SurveyView = ({ selectedPlanet }: { selectedPlanet?: string }) => (
  <Panel variant="inset" padding="none" style={{ height: "100%", position: "relative", overflow: "hidden" }}>
    {/* Background */}
    <div style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(circle at 50% 50%, ${C.accent}08 0%, ${C.bg} 50%)`,
    }} />

    {/* Central star */}
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: C.accent,
      boxShadow: `0 0 20px ${C.accent}66, 0 0 40px ${C.accent}22`,
    }} />
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      fontFamily: "Antonio, sans-serif",
      fontSize: 9,
      color: C.accent,
      letterSpacing: "0.1em",
      marginTop: 16,
    }}>
      SOL
    </div>

    {/* Orbit rings and planets */}
    {SOL_PLANETS.map((planet) => {
      const selected = planet.name === selectedPlanet;
      const rad = (planet.angle * Math.PI) / 180;
      // Convert orbit % to position — orbit is % of half the container
      const px = 50 + planet.orbit * 0.45 * Math.cos(rad);
      const py = 50 + planet.orbit * 0.45 * Math.sin(rad);

      return (
        <div key={planet.name}>
          {/* Orbit path */}
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: `${planet.orbit * 0.9}%`,
            height: `${planet.orbit * 0.9}%`,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `1px solid ${selected ? C.sky + "44" : C.border}33`,
          }} />

          {/* Planet dot */}
          <div style={{
            position: "absolute",
            left: `${px}%`,
            top: `${py}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 2,
          }}>
            {selected && (
              <div style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `1.5px solid ${C.sky}`,
                animation: "helm-pulse-ring 2s ease-in-out infinite",
                boxShadow: `0 0 10px ${C.sky}44`,
              }} />
            )}
            <div style={{
              width: planet.size,
              height: planet.size,
              borderRadius: "50%",
              background: planet.color,
              boxShadow: `0 0 ${planet.size}px ${planet.color}66`,
            }} />
            <div style={{
              position: "absolute",
              left: planet.size / 2 + 6,
              top: "50%",
              transform: "translateY(-50%)",
              whiteSpace: "nowrap",
            }}>
              <div style={{
                fontFamily: "Antonio, sans-serif",
                fontSize: selected ? 11 : 9,
                letterSpacing: "0.06em",
                color: selected ? C.text : C.muted,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                {planet.name}
                {planet.scanned && (
                  <span style={{
                    fontSize: 7,
                    color: C.success,
                    letterSpacing: "0.1em",
                  }}>
                    SCANNED
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: "Antonio, sans-serif",
                fontSize: 7,
                letterSpacing: "0.1em",
                color: "#444",
                marginTop: 1,
              }}>
                {planet.type}
              </div>
            </div>
          </div>
        </div>
      );
    })}

    {/* Context menu on selected planet */}
    {selectedPlanet && (() => {
      const planet = SOL_PLANETS.find((p) => p.name === selectedPlanet);
      if (!planet) {return null;}
      const rad = (planet.angle * Math.PI) / 180;
      const px = 50 + planet.orbit * 0.45 * Math.cos(rad);
      const py = 50 + planet.orbit * 0.45 * Math.sin(rad);
      return (
        <div style={{
          position: "absolute",
          left: `${px + 4}%`,
          top: `${py - 2}%`,
          zIndex: 10,
        }}>
          <ContextMenu
            name={selectedPlanet}
            subtitle={planet.type}
            tone="lilac"
            actions={[
              { label: "Scan Planet", detail: planet.scanned ? "rescan" : "2h 40m" },
              { label: "Survey Moons", detail: "4h" },
            ]}
          />
        </div>
      );
    })()}

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
      Sol System — Survey View
    </div>
  </Panel>
);

/* ================================================================
 *  Log variants
 * ============================================================= */

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
    <LogCard time="Y1 D12" title="Jump to Sol initiated" tone="sky"
      status={<StatusBadge tone="muted" size="sm">Resolved</StatusBadge>}
    />
    <LogCard time="Y1 D11" title="Scan complete — Tau Ceti IV" tone="lilac"
      status={<StatusBadge tone="success" size="sm">Complete</StatusBadge>}
      action={<Button variant="tertiary" size="sm">View Results</Button>}
    />
  </>
);

const LogShell = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minHeight: 0 }}>
    <div style={{ ...labelStyle, padding: "2px 0", flexShrink: 0 }}>Activity Log</div>
    <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  </div>
);

const IdleLog = () => (
  <LogShell>{completedEntries}</LogShell>
);

const ActiveLog = () => (
  <LogShell>
    <LogCard time="now" title="Scanning Sol IV" tone="lilac" variant="active"
      status={<StatusBadge tone="info" size="sm" pulse>In Progress</StatusBadge>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ProgressBar value={32} tone="lilac" size="sm" />
        <Countdown remaining={4320} tone="lilac" active label="Remaining" size="sm" />
      </div>
    </LogCard>

    <LogCard time="now" title="Traveling to Tau Ceti" tone="sky" variant="active"
      status={<StatusBadge tone="info" size="sm" pulse>In Progress</StatusBadge>}
      action={<Button variant="tertiary" size="sm">Cancel</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <Readout label="Distance" value="11.9" unit="ly" tone="sky" size="sm" />
          <Readout label="ETA" value="4d 2h" tone="sky" size="sm" />
        </div>
        <ProgressBar value={18} tone="sky" size="sm" />
      </div>
    </LogCard>

    {completedEntries}
  </LogShell>
);

/* ================================================================
 *  Bridge Layout
 * ============================================================= */

const BridgeLayout = ({ log, view }: { log: ReactNode; view: ReactNode }) => {
  const [mode, setMode] = useState<PowerModeKey>("normal");

  return (
    <div style={{
      display: "flex",
      gap: 8,
      height: "100dvh",
      padding: 8,
      boxSizing: "border-box",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {view}
      </div>
      <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 6 }}>
        <ShipCard mode={mode} onModeChange={setMode} />
        {log}
      </div>
    </div>
  );
};

/* ================================================================
 *  Stories
 * ============================================================= */

/**
 * Idle bridge — starfield with completed log entries.
 */
export const Default: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={<StarfieldView />}
      log={<IdleLog />}
    />
  ),
};

/**
 * Active actions — scan and travel in progress with countdowns.
 */
export const Active: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={<StarfieldView />}
      log={<ActiveLog />}
    />
  ),
};

/**
 * Unscanned star selected — scan available, jump locked.
 */
export const StarSelected: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={
        <StarfieldView selectedStar="Tau Ceti">
          {(() => {
            const star = STARS.find((s) => s.name === "Tau Ceti")!;
            return (
              <div style={{
                position: "absolute",
                left: `${star.x + 3}%`,
                top: `${star.y - 1}%`,
                zIndex: 10,
              }}>
                <ContextMenu
                  name="Tau Ceti"
                  subtitle="G8.5V · 11.9 ly"
                  tone="sky"
                  actions={[
                    { label: "Scan Route", detail: "1h 12m" },
                    { label: "Jump", detail: "route unknown", disabled: true },
                  ]}
                />
              </div>
            );
          })()}
        </StarfieldView>
      }
      log={<IdleLog />}
    />
  ),
};

/**
 * Scanned star selected — route known, jump available.
 */
export const StarSelectedScanned: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={
        <StarfieldView selectedStar="Tau Ceti">
          {(() => {
            const star = STARS.find((s) => s.name === "Tau Ceti")!;
            return (
              <div style={{
                position: "absolute",
                left: `${star.x + 3}%`,
                top: `${star.y - 1}%`,
                zIndex: 10,
              }}>
                <ContextMenu
                  name="Tau Ceti"
                  subtitle="G8.5V · 11.9 ly"
                  tone="sky"
                  actions={[
                    { label: "Rescan Route", detail: "1h 12m" },
                    { label: "Jump", detail: "4d 2h", tone: "accent" },
                  ]}
                />
              </div>
            );
          })()}
        </StarfieldView>
      }
      log={<IdleLog />}
    />
  ),
};

/**
 * Jump chosen — draft card in log with cost/ETA.
 */
export const DraftJump: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={<StarfieldView selectedStar="Tau Ceti" />}
      log={
        <LogShell>
          <LogCard
            time="draft"
            title="Jump to Tau Ceti"
            tone="sky"
            variant="draft"
            status={<StatusBadge tone="warning" size="sm">Pending</StatusBadge>}
            action={
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="primary" size="sm">Confirm Jump</Button>
                <Button variant="tertiary" size="sm">Cancel</Button>
              </div>
            }
          >
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Readout label="Distance" value="11.9" unit="ly" tone="sky" size="sm" />
              <Readout label="ETA" value="4d 2h" tone="sky" size="sm" />
              <Readout label="Draw" value={120} unit="MJ" tone="gold" size="sm" />
            </div>
          </LogCard>
          {completedEntries}
        </LogShell>
      }
    />
  ),
};

/**
 * Survey view — Sol system map with orbit rings.
 */
export const Survey: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={<SurveyView />}
      log={<IdleLog />}
    />
  ),
};

/**
 * Planet selected in survey — context menu on Jupiter.
 */
export const SurveyPlanetSelected: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={<SurveyView selectedPlanet="Jupiter" />}
      log={<IdleLog />}
    />
  ),
};

/**
 * Scan chosen from survey — draft card for planet scan.
 */
export const DraftScan: Story = {
  args: { children: null },
  render: () => (
    <BridgeLayout
      view={<SurveyView selectedPlanet="Jupiter" />}
      log={
        <LogShell>
          <LogCard
            time="draft"
            title="Scan Jupiter"
            tone="lilac"
            variant="draft"
            status={<StatusBadge tone="warning" size="sm">Pending</StatusBadge>}
            action={
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="primary" size="sm">Begin Scan</Button>
                <Button variant="tertiary" size="sm">Cancel</Button>
              </div>
            }
          >
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Readout label="Duration" value="1h 12m" tone="lilac" size="sm" />
              <Readout label="Power Cost" value={8} unit="%" tone="gold" size="sm" />
              <Readout label="Type" value="Gas Giant" tone="lilac" size="sm" />
            </div>
          </LogCard>
          {completedEntries}
        </LogShell>
      }
    />
  ),
};
