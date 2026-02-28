# Stellar Map Plan

## What This Is

The stellar map is the in-system counterpart to the astrometric star field. Astrometric shows the space between systems; stellar shows the space within a system — the star and its planets. It's a linear sensor readout, not a 3D scene.

## Current State

Shipped in `@helm/stellar` and `@helm/ui`:

- `SystemPlanet` / `SystemContents` types in `@helm/types`
- `SystemMap` component in `@helm/ui` — horizontal grid of star glyph + planet glyphs with labels and orbit distances
- `planetSizeMap` in `@helm/ui` — maps planet type to glyph size
- `SystemView` in `@helm/stellar` — composes SystemMap with a header (star name, spectral class, scan progress)
- Storybook stories covering small/large/scanned/unscanned systems

## Viewport Layout

The stellar view fills the same viewport slot that the astrometric star field uses (the `viewport` prop of `SideDrawer`). The drawer continues to show ship systems and ship log.

### System Level (`/system/:nodeId`)

```
Viewport:
┌─────────────────────────────────┐
│ ☀ ─── ● ─── ● ─── ○ ─── ●     │  SystemMap
│ Sol    Merc  Venus  ???  Earth  │
├─────────────────────────────────┤
│  ● Mercury    molten   0.4 AU  │  Planet list (scrollable)
│  ● Venus      toxic    0.7 AU  │
│  ○ ???        ───      1.5 AU  │
│  ● Earth      terr.    1.0 AU  │
└─────────────────────────────────┘

Drawer:
  Ship Systems Card
  Ship Log
```

The SystemMap is a compact horizontal strip. Below it, a planet list provides the data table — same planets, different representation. Both are click targets for navigation.

### Planet Focused (`/system/:nodeId/planet/:planetId`)

```
Viewport:
┌─────────────────────────────────┐
│ ☀ ─── ● ─── ● ─── ○ ─── [●]   │  SystemMap (planet anchored)
│ Sol    Merc  Venus  ???  Earth  │
├─────────────────────────────────┤
│  EARTH              terrestrial │  Planet stats (replaces list)
│  Mass    1.0 M⊕    Temp  288 K │
│  Radius  1.0 R⊕    Orbit 365 d │
└─────────────────────────────────┘

Drawer:
  Ship Systems Card
  Ship Log
```

Clicking a planet (from the map or the list) navigates to the planet route. The planet list gives way to that planet's stats. The system map remains visible with the selected planet anchored. Navigating back returns to the planet list.

## Mobile Layout

On mobile the SideDrawer stacks vertically (viewport on top, drawer below). The stellar viewport should not use the 1:1 aspect-ratio constraint that the astrometric 3D canvas uses — it's scrollable content, not a fixed canvas. The viewport should be full-length with the drawer underneath.

This requires overriding or conditionalizing the mobile `aspect-ratio: 1` rule in SideDrawer for non-canvas viewports.

## View Transition

When navigating to a planet route, the selected planet in the system map should slide/anchor to the right. This uses the View Transitions API or a CSS animation coordinated with the route change.

## Component Hierarchy

```
SideDrawer
├── viewport: SystemView
│   ├── Header (star name, spectral class, scan progress)
│   ├── SystemMap (@helm/ui)
│   │   ├── StarGlyph
│   │   └── PlanetGlyph × n
│   └── PlanetList | PlanetDetail (route-dependent)
└── drawer: Ship Systems + Ship Log
```

- `SystemMap` lives in `@helm/ui` — a pure presentational primitive
- `SystemView` lives in `@helm/stellar` — composes the map with routing and state
- Planet list and planet detail are future components in `@helm/stellar`

## Packages

| Package | Role |
|---------|------|
| `@helm/types` | `SystemPlanet`, `SystemContents` |
| `@helm/ui` | `SystemMap`, `planetSizeMap` |
| `@helm/stellar` | `SystemView`, planet list, planet detail |

## Next Steps

1. Planet list component in `@helm/stellar`
2. Planet detail component in `@helm/stellar`
3. Bridge routing — system and planet routes
4. View transition animation (planet anchoring)
5. Mobile SideDrawer aspect-ratio fix for content viewports
6. Backend endpoint for system contents
