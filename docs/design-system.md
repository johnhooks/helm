# Helm Design System

LCARS-inspired UI kit for ship operations. Compact, glanceable, WordPress-native.

## Intent

- **Dark mode only** - no light mode; space is dark
- **Compact, glanceable layouts** that fit within WP widgets without losing hierarchy
- **Less color-dependent** structure: color supports meaning but never carries it alone
- **Operational clarity** over ornamentation; elegance comes from restraint and rhythm
- **Accessible by default**: WCAG AA contrast, focus rings, reduced motion support

## Principles

1. **Glanceable Status**
   Key state is readable in under one second at widget scale.

2. **Quiet by Default**
   The interface stays calm until attention is required.

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

Default to **neutral structure**: dark backgrounds with muted text. Reserve strong color for **interaction** and **status changes**. Never require color alone to understand meaning—use labels and shape markers.

### Shape Language

- **Edge-aligned stacks**: vertical button columns anchored to left or right edge
- **Square interior edges** where buttons meet the panel edge; outer corners stay rounded
- **Header/footer bars**: horizontal bars with labels at top or bottom
- **Indicator shapes**: orbs, bars, stacks, matrices for quick status cues
- Consistent radii across components for visual coherence

## Tokens

Design tokens use the `--helm-ui-*` namespace.

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
--helm-ui-color-warning: #f2b654;
--helm-ui-color-success: #8fbf4d;
--helm-ui-color-info: #7fb2ff;
--helm-ui-color-focus: #9cc7ff;
```

### LCARS Palette

Extended palette for varied status displays and visual interest:

```css
--helm-ui-color-orange: #ff9900;
--helm-ui-color-gold: #ffcc66;
--helm-ui-color-peach: #ffcc99;
--helm-ui-color-sunset: #ff9966;
--helm-ui-color-blue: #99ccff;
--helm-ui-color-sky: #6699cc;
--helm-ui-color-ice: #ccddff;
--helm-ui-color-lilac: #cc99cc;
--helm-ui-color-violet: #9999cc;
--helm-ui-color-plum: #664466;
--helm-ui-color-hopbush: #c082a9;
```

### Sizing

```css
--helm-ui-radius-md: 12px;
--helm-ui-radius-lg: 16px;
--helm-ui-stack-gap: 8px;
--helm-ui-font-family: "Antonio", "Helvetica Neue", Arial, sans-serif;
```

## Component Concepts

### Widget

The primary layout container. Combines a content area with optional edge button panel and title bar. Title bars can appear at top or bottom, aligned opposite to the button edge for visual balance.

### Button Panel

Vertical stack of buttons anchored to widget edge. Buttons in panels have squared interior edges where they meet the panel, creating a unified control surface.

### Title Bar

Horizontal bar with label. Acts as section header or footer. Squared on the edge that joins with a button panel, rounded on the free end.

### Button

LCARS-style button supporting stacked layouts. Can display primary label plus secondary code (e.g., "SCAN" + "S-01"). Edge variants for panel integration.

### Indicators

Visual status cues designed for quick scanning:

| Indicator | Use Case |
|-----------|----------|
| **Orb** | Simple on/off or status state |
| **Bar** | Horizontal level (shields, power) |
| **Stack** | Vertical segmented gauge (tank levels) |
| **Matrix** | Grid of cells for multi-state displays |
| **Arc** | Angular/radial values |
| **Warp** | Special animated warp status |

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
- Focus rings visible and non-color dependent
- Respects `prefers-reduced-motion` with no continuous animations
- All interactive elements keyboard accessible

## Future Considerations

- **Readout**: Composite value + unit + label component
- **Alert**: Dismissible/persistent notifications
- **Elbow**: LCARS corner connector (adds complexity, deferred)
- **Data Table**: Dense list for contacts/logs
