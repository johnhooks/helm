import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

const meta = {
  title: "Compositions/Star Context Menu",
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ================================================================
 *  Documentation helpers
 * ============================================================= */

const DOC: CSSProperties = {
  fontFamily: '"Antonio", "Helvetica Neue", Arial, sans-serif',
  color: "#f0e6d2",
  maxWidth: 640,
};

const H1: CSSProperties = { fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: "0 0 4px", color: "#f2b654" };
const H2: CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: "24px 0 8px", color: "#6699cc" };
const P: CSSProperties = { fontSize: 12, lineHeight: 1.6, margin: "0 0 8px", color: "#a39a88" };
const CODE: CSSProperties = { fontFamily: "monospace", fontSize: 11, background: "#1a1a1a", padding: "1px 5px", borderRadius: 3, color: "#f0e6d2" };
const LI: CSSProperties = { fontSize: 12, lineHeight: 1.6, color: "#a39a88", marginBottom: 4 };
const HR: CSSProperties = { border: "none", borderTop: "1px solid #2a2a2a", margin: "20px 0" };

/* ================================================================
 *  Tokens
 * ============================================================= */

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  border: "#2a2a2a",
  text: "#f0e6d2",
  muted: "#a39a88",
  accent: "#f2b654",
  sky: "#6699cc",
  lilac: "#cc99cc",
  gold: "#ffcc66",
  orange: "#ff9900",
} as const;

const FONT: CSSProperties = {
  fontFamily: '"Antonio", "Helvetica Neue", Arial, sans-serif',
};

/* ================================================================
 *  Context Menu
 * ============================================================= */

interface MenuAction {
  label: string;
  detail?: string;
  disabled?: boolean;
  tone?: string;
}

const ContextMenu = ({
  name,
  subtitle,
  tone = C.sky,
  actions,
}: {
  name: string;
  subtitle?: string;
  tone?: string;
  actions: MenuAction[];
}) => (
  <div style={{
    ...FONT,
    width: 180,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    overflow: "hidden",
    filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))",
  }}>
    <div style={{
      padding: "6px 10px",
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 8,
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: tone,
      }}>
        {name}
      </span>
      {subtitle && (
        <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em" }}>
          {subtitle}
        </span>
      )}
    </div>

    <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 2 }}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={action.disabled}
          style={{
            ...FONT,
            width: "100%",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: action.disabled ? "not-allowed" : "pointer",
            opacity: action.disabled ? 0.35 : 1,
          }}
        >
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: action.disabled ? C.muted : (action.tone ?? C.text),
          }}>
            {action.label}
          </span>
          {action.detail && (
            <span style={{ fontSize: 9, color: "#555", letterSpacing: "0.04em" }}>
              {action.detail}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);

/* ================================================================
 *  Design Documentation
 * ============================================================= */

/**
 * Design documentation rendered as a story.
 */
export const Design: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={DOC}>
      <h1 style={H1}>Star Context Menu</h1>
      <p style={P}>
        A compact dropdown menu that appears when a player selects a star or
        planet on the starfield or survey view. This is the primary entry point
        for initiating actions.
      </p>

      <hr style={HR} />

      <h2 style={H2}>Interaction Flow</h2>
      <p style={P}>
        Player clicks a star/planet on the map → context menu appears → menu
        shows available actions based on game state (scanned vs unscanned) →
        selecting an action creates a draft action card in the activity log for
        confirmation.
      </p>

      <h2 style={H2}>Anatomy</h2>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", margin: "12px 0 16px" }}>
        <ContextMenu
          name="Tau Ceti"
          subtitle="G8.5V · 11.9 ly"
          tone={C.sky}
          actions={[
            { label: "Scan Route", detail: "1h 12m" },
            { label: "Jump", detail: "route unknown", disabled: true },
          ]}
        />
        <div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={LI}><span style={{ color: "#6699cc" }}>Header</span> — target name in tone color + subtitle metadata (spectral class, distance, type)</li>
            <li style={LI}><span style={{ color: "#f0e6d2" }}>Action row</span> — label left-aligned, detail (duration, cost, status) right-aligned</li>
            <li style={LI}><span style={{ color: "#555" }}>Disabled row</span> — 35% opacity with explanatory detail text</li>
          </ul>
        </div>
      </div>

      <h2 style={H2}>Props (Future)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
            <th style={{ textAlign: "left", padding: "4px 8px", color: "#6699cc", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Prop</th>
            <th style={{ textAlign: "left", padding: "4px 8px", color: "#6699cc", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Type</th>
            <th style={{ textAlign: "left", padding: "4px 8px", color: "#6699cc", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["name", "string", "Target name displayed in the header"],
            ["subtitle", "string?", "Metadata line (spectral class, distance, type)"],
            ["tone", "string", "Color for the header name (sky, accent, lilac, orange)"],
            ["actions", "MenuAction[]", "List of available actions"],
          ].map(([prop, type, desc]) => (
            <tr key={prop} style={{ borderBottom: "1px solid #1a1a1a" }}>
              <td style={{ padding: "4px 8px" }}><code style={CODE}>{prop}</code></td>
              <td style={{ padding: "4px 8px", color: "#a39a88" }}><code style={CODE}>{type}</code></td>
              <td style={{ padding: "4px 8px", color: "#a39a88" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ ...P, marginTop: 8 }}>
        Each <code style={CODE}>MenuAction</code> has: <code style={CODE}>label</code> (string),{" "}
        <code style={CODE}>detail</code> (string), <code style={CODE}>disabled</code> (boolean),{" "}
        <code style={CODE}>tone</code> (string override for label color).
      </p>

      <h2 style={H2}>Design Decisions</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li style={LI}>No LCARS frame — elbow/sidebar is for persistent widgets, not transient popovers</li>
        <li style={LI}>Fixed 180px width to stay compact over the map</li>
        <li style={LI}>Detail text on disabled actions explains why they are locked (&ldquo;route unknown&rdquo;) — redundant signals per the design system</li>
        <li style={LI}>Tone colors the header name only, not the container</li>
      </ul>

      <h2 style={H2}>Implementation Notes</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li style={LI}>Use the existing <code style={CODE}>Dropdown</code> for positioning and dismissal</li>
        <li style={LI}>Support <code style={CODE}>onClick</code> + keyboard nav on action rows</li>
        <li style={LI}>Use <code style={CODE}>role=menu</code> / <code style={CODE}>menuitem</code> for a11y</li>
        <li style={LI}>Integrate with the <code style={CODE}>editAction</code> datastore slice for draft creation</li>
      </ul>

      <h2 style={H2}>States</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
        <div>
          <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 6 }}>Unscanned</div>
          <ContextMenu name="Tau Ceti" subtitle="G8.5V · 11.9 ly" tone={C.sky} actions={[{ label: "Scan Route", detail: "1h 12m" }, { label: "Jump", detail: "route unknown", disabled: true }]} />
        </div>
        <div>
          <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 6 }}>Scanned</div>
          <ContextMenu name="Tau Ceti" subtitle="G8.5V · 11.9 ly" tone={C.sky} actions={[{ label: "Rescan Route", detail: "1h 12m" }, { label: "Jump", detail: "4d 2h · 32% fuel", tone: C.accent }]} />
        </div>
        <div>
          <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 6 }}>Current System</div>
          <ContextMenu name="Sol" subtitle="G2V · current" tone={C.accent} actions={[{ label: "Survey", detail: "8 planets" }, { label: "Dock", detail: "Sol Station" }]} />
        </div>
        <div>
          <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 6 }}>Planet</div>
          <ContextMenu name="Jupiter" subtitle="Gas Giant" tone={C.lilac} actions={[{ label: "Scan Planet", detail: "2h 40m" }, { label: "Survey Moons", detail: "4h" }]} />
        </div>
      </div>
    </div>
  ),
};

/* ================================================================
 *  Stories
 * ============================================================= */

/**
 * Unscanned star — scan available, jump locked.
 */
export const Unscanned: Story = {
  render: () => (
    <ContextMenu
      name="Tau Ceti"
      subtitle="G8.5V · 11.9 ly"
      tone={C.sky}
      actions={[
        { label: "Scan Route", detail: "1h 12m" },
        { label: "Jump", detail: "route unknown", disabled: true },
      ]}
    />
  ),
};

/**
 * Scanned star — route known, jump available with cost.
 */
export const Scanned: Story = {
  render: () => (
    <ContextMenu
      name="Tau Ceti"
      subtitle="G8.5V · 11.9 ly"
      tone={C.sky}
      actions={[
        { label: "Rescan Route", detail: "1h 12m" },
        { label: "Jump", detail: "4d 2h · 32% fuel", tone: C.accent },
      ]}
    />
  ),
};

/**
 * Current system — survey and dock options.
 */
export const CurrentSystem: Story = {
  render: () => (
    <ContextMenu
      name="Sol"
      subtitle="G2V · current"
      tone={C.accent}
      actions={[
        { label: "Survey", detail: "8 planets" },
        { label: "Dock", detail: "Sol Station" },
      ]}
    />
  ),
};

/**
 * Planet in survey view.
 */
export const Planet: Story = {
  render: () => (
    <ContextMenu
      name="Jupiter"
      subtitle="Gas Giant"
      tone={C.lilac}
      actions={[
        { label: "Scan Planet", detail: "2h 40m" },
        { label: "Survey Moons", detail: "4h" },
      ]}
    />
  ),
};

/**
 * Distant red dwarf.
 */
export const DistantStar: Story = {
  render: () => (
    <ContextMenu
      name="Wolf 359"
      subtitle="M6.5V · 7.9 ly"
      tone={C.orange}
      actions={[
        { label: "Scan Route", detail: "1h 50m" },
        { label: "Jump", detail: "route unknown", disabled: true },
      ]}
    />
  ),
};

/**
 * All states side by side.
 */
export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 8 }}>
          Unscanned
        </div>
        <ContextMenu
          name="Tau Ceti"
          subtitle="G8.5V · 11.9 ly"
          tone={C.sky}
          actions={[
            { label: "Scan Route", detail: "1h 12m" },
            { label: "Jump", detail: "route unknown", disabled: true },
          ]}
        />
      </div>
      <div>
        <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 8 }}>
          Scanned
        </div>
        <ContextMenu
          name="Tau Ceti"
          subtitle="G8.5V · 11.9 ly"
          tone={C.sky}
          actions={[
            { label: "Rescan Route", detail: "1h 12m" },
            { label: "Jump", detail: "4d 2h · 32% fuel", tone: C.accent },
          ]}
        />
      </div>
      <div>
        <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 8 }}>
          Current System
        </div>
        <ContextMenu
          name="Sol"
          subtitle="G2V · current"
          tone={C.accent}
          actions={[
            { label: "Survey", detail: "8 planets" },
            { label: "Dock", detail: "Sol Station" },
          ]}
        />
      </div>
      <div>
        <div style={{ ...FONT, fontSize: 9, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase", marginBottom: 8 }}>
          Planet
        </div>
        <ContextMenu
          name="Jupiter"
          subtitle="Gas Giant"
          tone={C.lilac}
          actions={[
            { label: "Scan Planet", detail: "2h 40m" },
            { label: "Survey Moons", detail: "4h" },
          ]}
        />
      </div>
    </div>
  ),
};
