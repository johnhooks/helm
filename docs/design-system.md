# Helm Design System

LCARS-inspired UI kit for ship operations. Compact, glanceable, WordPress-native.

## Intent

- **Dark mode only** - no light mode; space is dark
- **Compact, glanceable layouts** that fit within WP widgets without losing hierarchy
- **Less color-dependent** structure: color supports meaning but never carries it alone
- **Operational clarity** over ornamentation; elegance comes from restraint and rhythm
- **Accessible**: WCAG AA contrast, focus rings, reduced motion support

## Principles

1. **Glanceable Status**
   Key state is readable in under one second at widget scale.

2. **Quiet by Default**
   The interface stays calm until attention is required. Components default to neutral tones — color is applied intentionally, not automatically.

3. **Redundant Signals**
   Every critical state is expressed via text + shape + position, with color as a helper.

4. **Compact Rhythm**
   Everything aligns to a small, predictable grid so dense layouts remain orderly.

5. **Crew Flow**
   Components favor quick scanning and minimal interaction overhead.

## Visual Language

### Typography

- Antonio as the primary typeface (condensed, LCARS-inspired)
- Labels uppercase for scannability
- Mixed case for longer status text
- Numeric values are the largest element in any readout group

### Color Philosophy

Default to **neutral structure**: dark backgrounds with muted text. Reserve strong color for **intentional emphasis** — an active action, a critical alert, a system identity. Never require color alone to understand meaning; use labels and shape markers.

Every component defaults to `tone="neutral"` (warm gray). This keeps the console calm. When a component needs to pop — an active scan, a shield alert, a navigation panel — pass an explicit tone. The contrast between neutral defaults and intentional color is what gives color its power.

### Shape Language

- **Edge-aligned stacks**: vertical button columns anchored to left or right edge
- **Square interior edges** where buttons meet the panel edge; outer corners stay rounded
- **Header/footer bars**: horizontal bars with labels at top or bottom
- **Indicator shapes**: orbs, bars, stacks, matrices for quick status cues
- Consistent radii across components for visual coherence

## Tokens

Design tokens use the `--helm-ui-*` namespace, defined in `tokens.css` on `.helm-page-root`.

### Base Surfaces

```css
--helm-ui-color-bg: #0a0a0a;
--helm-ui-color-surface: #141414;
--helm-ui-color-surface-2: #1b1b1b;
--helm-ui-color-border: #2a2a2a;
```

### Text

```css
--helm-ui-color-text: #f0e6d2;
--helm-ui-color-muted: #a39a88;
```

### Semantic

```css
--helm-ui-color-accent: #f2b654;
--helm-ui-color-danger: #cc4444;
--helm-ui-color-danger-accent: #ff6b6b;
--helm-ui-color-warning: #e8953a;
--helm-ui-color-success: #8fbf4d;
--helm-ui-color-info: #7fb2ff;
```

### LCARS Palette

Extended palette for varied status displays and visual interest:

```css
--helm-ui-color-orange: #ff9900;
--helm-ui-color-gold: #ffcc66;
--helm-ui-color-blue: #99ccff;
--helm-ui-color-sky: #6699cc;
--helm-ui-color-ice: #ccddff;
--helm-ui-color-lilac: #cc99cc;
--helm-ui-color-violet: #9999cc;
```

### Contrast Foregrounds

Hand-picked dark foreground colors for text on tone-colored backgrounds. Grouped by color temperature:

```css
--helm-ui-fg-on-warm: #1a1206; /* accent, warning, orange, gold, neutral */
--helm-ui-fg-on-warm-muted: #3b2a10;
--helm-ui-fg-on-cool: #0f1420; /* info, blue, sky, ice */
--helm-ui-fg-on-cool-muted: #1f2e4a;
--helm-ui-fg-on-purple: #1b0f1e; /* lilac, violet */
--helm-ui-fg-on-purple-muted: #3b2a3f;
--helm-ui-fg-on-green: #0f140a; /* success */
--helm-ui-fg-on-green-muted: #2f3a24;
--helm-ui-fg-on-red: #1a0808; /* danger */
--helm-ui-fg-on-red-muted: #3a1414;
```

### Sizing

```css
--helm-ui-radius-md: 12px;
--helm-ui-radius-lg: 16px;
--helm-ui-stack-gap: 8px;
--helm-ui-font-family: "Antonio", "Helvetica Neue", Arial, sans-serif;
```

## Tone System

The tone system is the primary color abstraction. It provides a single `tone` prop across all components, sourced from one TypeScript type (`LcarsTone` in `tones.ts`) and one CSS file (`tones.css`).

### How It Works

A tone class (`.helm-tone--{name}`) sets three CSS custom properties:

| Variable               | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `--helm-tone`          | The tone color itself (used for text, borders, fills, focus rings) |
| `--helm-tone-fg`       | Contrasting foreground for text on the tone as a background        |
| `--helm-tone-fg-muted` | Dimmed foreground variant for secondary text on the tone           |

### Available Tones

14 tones: `neutral`, `accent`, `muted`, `danger`, `success`, `warning`, `info`, `orange`, `gold`, `blue`, `sky`, `ice`, `lilac`, `violet`.

### Neutral by Default

Every component defaults to `tone="neutral"`. This is a deliberate design choice — the console stays calm and structural until you intentionally apply color. A few components have domain-specific defaults where a non-neutral tone is part of their identity:

| Component       | Default   | Reason                  |
| --------------- | --------- | ----------------------- |
| TitleBar        | `gold`    | LCARS structural chrome |
| LcarsFrame      | `gold`    | LCARS structural chrome |
| LcarsModal      | `gold`    | LCARS structural chrome |
| ContextMenu     | `sky`     | Distinct from content   |
| Everything else | `neutral` | Quiet by default        |

Primary buttons inherit tone by default. If a parent sets `helm-tone--{name}`, a primary button will use it. Passing a `tone` prop on the button overrides the inherited value.

### Two Layers: Tones and Surfaces

Components use tones in one of two ways:

**Layer 1 — Tone as accent** (display components): The tone color appears as text, borders, or fills on a dark background. Used by readouts, indicators, badges, panels, countdowns, progress bars, log cards, and structural chrome.

```css
color: var(--helm-tone);
border-color: var(--helm-tone);
background: var(--helm-tone); /* for fills like progress bars */
```

**Layer 2 — Tone as surface** (interactive components): The tone color IS the background, with contrasting foreground text. Used by buttons, segmented controls, and select control selected states. The bridge class `.helm-surface--toned` derives `--helm-surface-*` variables from `--helm-tone-*` variables:

```css
.helm-surface--toned {
  --helm-surface-bg: var(--helm-tone);
  --helm-surface-fg: var(--helm-tone-fg);
  /* ... hover, border, muted variants derived automatically */
}
```

This means adding a new tone requires only one block in `tones.css` + one entry in `tones.ts`. Every component gets it for free.

## Building New Components

### Display Component (tone as accent)

For components where the tone colors text, borders, or small fills on a dark background:

```tsx
import type { LcarsTone } from "../../tones";

interface MyComponentProps {
  tone?: LcarsTone;
}

export function MyComponent({ tone = "neutral" }: MyComponentProps) {
  const classNames = ["helm-my-component", `helm-tone--${tone}`].join(" ");

  return <div className={classNames}>...</div>;
}
```

In CSS, reference `var(--helm-tone)` for the accent color:

```css
.helm-my-component__label {
  color: var(--helm-tone);
}
.helm-my-component__border {
  border-color: var(--helm-tone);
}
```

### Interactive Component (tone as background)

For components where the tone is a solid background with contrasting text (buttons, selected states):

```tsx
const classNames = [
  "helm-my-control",
  `helm-tone--${tone}`,
  "helm-surface--toned",
].join(" ");
```

In CSS, reference `--helm-surface-*` variables:

```css
.helm-my-control {
  background: var(--helm-surface-bg);
  color: var(--helm-surface-fg);
}
.helm-my-control:hover {
  background: var(--helm-surface-bg-hover);
}
```

### Focus Rings

Components with a tone prop use `var(--helm-tone)` so the focus ring matches the component's color. Structural layout components without a tone prop (e.g., SideDrawer) use `var(--helm-ui-color-accent)` as a fixed accent.

```css
/* Toned component */
.helm-my-component:focus-visible {
  outline: 2px solid var(--helm-tone);
  outline-offset: 2px;
}

/* Structural component (no tone prop) */
.helm-layout__toggle:focus-visible {
  outline: 2px solid var(--helm-ui-color-accent);
  outline-offset: 2px;
}
```

### Animations

All animations must respect `prefers-reduced-motion`:

```css
.helm-my-component--active .helm-my-component__element {
  animation: my-pulse 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .helm-my-component--active .helm-my-component__element {
    animation: none;
  }
}
```

### Checklist

When adding a new component:

1. Accept `tone?: LcarsTone` with a default of `"neutral"`
2. Apply `helm-tone--${tone}` to set `--helm-tone` CSS variables
3. Use `var(--helm-tone)` for accent colors (display) or `helm-surface--toned` for backgrounds (interactive)
4. Use `var(--helm-tone)` for focus rings
5. Add `prefers-reduced-motion: reduce` for any animations
6. Add a `Tones` story showing the component across several tone values
7. Export the component and any types from `index.ts`

## Component Concepts

### Widget

A composition pattern (Panel + ButtonPanel + TitleBar), not a standalone component. Combines a content area with optional edge button panel and title bar. Title bars can appear at top or bottom, aligned opposite to the button edge for visual balance.

### Button Panel

Vertical stack of buttons anchored to widget edge. Buttons in panels have squared interior edges where they meet the panel, creating a unified control surface.

### Title Bar

Horizontal bar with label. Acts as section header or footer. Squared on the edge that joins with a button panel, rounded on the free end.

### Button

LCARS-style button supporting stacked layouts. Can display primary label plus secondary code (e.g., "SCAN" + "S-01"). Edge variants for panel integration. API: `variant` (structure: primary, secondary, tertiary, ghost, danger) + `tone` (color). The `tone` prop only affects the `primary` variant — other variants use their structural surface colors.

### Indicators

Visual status cues designed for quick scanning:

| Indicator  | Use Case                               |
| ---------- | -------------------------------------- |
| **Orb**    | Simple on/off or status state          |
| **Bar**    | Horizontal level (shields, power)      |
| **Stack**  | Vertical segmented gauge (tank levels) |
| **Matrix** | Grid of cells for multi-state displays |
| **Arc**    | Angular/radial values                  |
| **Warp**   | Special animated warp status           |

All indicators support the full tone palette for consistent coloring.

## Layout Patterns

### Edge Button Widget

Primary pattern for system controls:

- Button panel on left or right edge
- Title bar opposite the buttons
- Content fills remaining space
- 4-6 buttons maximum per panel

### Status Grid

2x2 or 2x3 grid of readouts:

- Consistent indicator width for alignment
- Short labels, abbreviated units
- Values prominent, labels secondary

### Compact Density

- Limit to 4-6 items per widget
- Prefer short status lines over paragraphs
- Use indicators for trends, text for values

## Accessibility

- Minimum text size: 12px
- WCAG AA contrast for all text
- Focus rings visible and tone-aware (match component color)
- Respects `prefers-reduced-motion` — all animations disabled
- All interactive elements keyboard accessible

## Future Considerations

UI library additions under consideration:

- **Alert**: Dismissible/persistent notifications
- **Elbow**: LCARS corner connector (adds complexity, deferred)
- **Data Table**: Dense list for contacts/logs
