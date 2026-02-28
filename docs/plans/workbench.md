# Ship Workbench

A standalone design tool for testing ship loadouts, comparing builds, and balancing game mechanics before committing to the progression plan.

## Why

We need to plan ship progression — what Mk II and Mk III components look like, what crossover products do, how power budgets constrain builds, what the maxed-out scout/surveyor/combat ships feel like. Making those decisions without being able to see the numbers interact is guessing.

The workbench lets us:

- Spec out a loadout and instantly see its capabilities (scan range, jump range, speed, cargo, power budget)
- Compare two loadouts side by side
- Tweak a product stat and watch how it ripples through the system
- Test hypothetical products (Mk II, crossovers) before defining them in the real data files
- Visualize tradeoff curves — "what does the power budget look like as I upgrade each component?"
- Validate the formulas match what the server computes

This is the tool that tells us whether our game design works before we build it.

## Architecture

### Standalone Vite SPA

The workbench is **not** a WordPress plugin. It's a standalone Vite + React application with no WordPress dependencies. Different goals, different UI needs.

```
resources/workbench/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── data/              — product catalog loader
│   ├── formulas/          — ship calculation functions
│   ├── components/        — UI (tables, sliders, charts)
│   └── store/             — loadout state management
└── package.json
```

Lives in the Helm monorepo as a workspace but has no imports from `@helm/*` packages. No `@wordpress/components`, no LCARS. Uses whatever UI library makes iteration fastest — probably something like Radix + a charting library (Recharts, visx, or similar).

### Why Not WordPress

- **Speed** — `bun run workbench` and you're tweaking numbers. No Docker, no PHP, no plugin activation.
- **Different UI** — The workbench needs tables, sliders, comparison panels, and charts. Not LCARS readouts.
- **Different audience** — This is a game design tool for us, not a player-facing feature.
- **No coupling** — Changes to the game UI don't break the workbench. Changes to the workbench don't affect the game.

### Why Not Share Components

The `@helm/ui` components depend on `@wordpress/components` and are built for the LCARS game aesthetic. The workbench needs data-dense comparison UIs — spreadsheet-like tables, range sliders, overlaid charts. Different problem, different components.

What IS shared: the product data files and the formulas. Those are the source of truth.

## Data

### Product Catalog

The workbench loads the same JSON files the server uses for seeding:

```
data/products/
├── core.json
├── drive.json
├── sensor.json
├── shield.json
├── nav.json
└── resource.json
```

At startup, the workbench reads these and builds an in-memory product catalog. No database needed for existing products.

### Hypothetical Products

The workbench also supports creating hypothetical products that don't exist in the real data files. This is how we test Mk II concepts, crossover products, and balance ideas:

- Create a "DSC Mk II" with tweaked stats
- Create an "Aegis Drive" crossover and see how it affects a combat build
- Adjust a single stat with a slider and watch the ripple effects

Hypothetical products live in the workbench's local state only. When we're happy with the numbers, we manually add them to the real data files.

### Persistence

Start with **localStorage**. Saved loadouts, hypothetical products, and comparison sets persist across browser sessions. No backend, no database.

If we outgrow localStorage (unlikely for a design tool), add **sql.js** (SQLite compiled to WASM). Runs entirely in the browser, no server. Import/export as a `.sqlite` file.

## Formulas

The workbench implements the same calculations as the server. These are the TypeScript duplicates of the PHP formulas — the approach we chose in `plans/.wip/client-ship-calculations.md`.

```typescript
// Scan calculations
scanCost(distance: number): number
scanDuration(distance: number, sensorMultA: number): number
scanRange(sensorBaseRange: number, coreOutput: number): number
scanFeasible(currentPower: number, cost: number, distance: number, range: number): boolean

// Jump calculations
jumpCoreCost(distance: number, coreMultB: number, driveMultB: number): number
jumpDuration(distance: number, driveAmplitude: number, coreOutput: number, perfRatio: number): number
jumpMaxRange(driveSustain: number, coreOutput: number, perfRatio: number): number
jumpFeasible(distance: number, maxRange: number, coreLife: number, coreCost: number): boolean

// Power calculations
perfRatio(coreOutput: number, driveConsumption: number): number
coreOutput(coreMultA: number, powerModeOutput: number): number
regenRate(coreRate: number, powerModeRegen: number): number
currentPower(powerMax: number, secondsUntilFull: number, regenRate: number): number

// Power budget
totalDraw(loadout: Loadout): number
budgetRatio(coreOutput: number, totalDraw: number): number
```

These same functions will eventually be used in the game client (`@helm/shell` or a shared `@helm/calc` package). The workbench is where we validate them first.

## UI Concepts

### Loadout Builder

Pick a hull, fill each slot from the product catalog (or hypotheticals). See the resulting ship:

```
LOADOUT: "Scout Alpha"
┌─────────────────────────────────────────────┐
│ Hull: Pioneer Frame (300 m³)                │
│                                              │
│ Core:    Epoch-R         35 m³   output: 1.1 │
│ Drive:   DR-705          45 m³   draw: 1.5   │
│ Sensor:  DSC Mk I        40 m³   draw: 0.4   │
│ Shield:  Aegis Alpha     10 m³   draw: 0.1   │
│ Nav:     Tier 3           0 m³               │
│ Equip 1: Cloak           20 m³   draw: 0.3   │
│ Equip 2: Probe Launcher  10 m³               │
│ Equip 3: (empty)                             │
│                                              │
│ FOOTPRINT:  160 / 300 m³                     │
│ CARGO:      140 m³                           │
│ POWER:      1.1 output / 2.3 draw → 48%     │
│                                              │
│ CAPABILITIES                                 │
│ Scan range:    22 ly (reduced → 10.6 ly)     │
│ Jump range:    5 ly  (reduced → 2.4 ly)      │
│ Jump speed:    2.0x  (reduced → 0.96x)       │
│ Shield cap:    50                             │
│ Shield regen:  20/hr                          │
└─────────────────────────────────────────────┘
```

The "reduced" values show the effect of power budget — when draw exceeds output, everything underperforms.

### Comparison View

Two loadouts side by side. Differences highlighted. Quick toggle to swap one component and see the delta:

```
COMPARE: Scout Alpha vs Scout Beta
                    Alpha       Beta        Delta
Scan range:         10.6 ly     14.2 ly     +34%
Jump range:          2.4 ly      4.1 ly     +71%
Jump speed:          0.96x       0.8x       -17%
Cargo:             140 m³       125 m³       -11%
Power ratio:         48%         72%
Shield cap:          50          100         +100%
```

### Stat Slider

Select a product stat and drag a slider. Watch the loadout capabilities update in real time:

- "What if DSC Mk II range was 24 ly instead of 20?" → drag → see scan range and power budget change
- "What if the Aegis drive consumption was 0.8 instead of 1.2?" → drag → see power ratio improve
- "What if we added a power draw stat to shields?" → add field → see how it changes the budget

This is the primary balance design tool. Tweak numbers, see consequences, find the sweet spot.

### Power Budget Chart

Visual breakdown of where power goes:

```
POWER BUDGET: Scout Alpha

Output: ████████████████████░░░░░░░░░░░░░░░ 1.1

Draw:   ██████████████████████████████████████████ 2.3
        ├── Drive:  ████████████████████████████ 1.5
        ├── Sensor: ██████████ 0.4
        ├── Shield: ██ 0.1
        └── Cloak:  ██████ 0.3

Deficit: ████████████████████ 1.2 → 48% performance
```

### Capability Radar

Spider chart showing a loadout's profile across dimensions:

- Scan range
- Jump range
- Jump speed
- Cargo capacity
- Shield strength
- Power headroom

Overlay two loadouts on the same radar to see their shapes.

## What This Isn't

- **Not a player tool** — This is for game design, not for players to plan builds (though a player-facing version could come later)
- **Not connected to the game** — No API calls, no live data, no WordPress
- **Not pixel-perfect** — Function over form. If it's ugly but useful, it's done.
- **Not the formula authority** — The PHP server is the authority. The workbench duplicates the formulas for design convenience. If they drift, the server wins.

## Development

```bash
# Start the workbench
bun run workbench        # → vite dev server on localhost:5174

# Build (if we ever need to)
bun run workbench:build
```

Lives in the bun workspace, gets its own scripts in the root `package.json`.

## Open Questions

- Do we need hull definitions in the workbench before hulls exist in the game? Probably yes — the whole point is to design hulls and test what they feel like.
- Should hypothetical products be exportable as JSON that matches the `data/products/` format? Would make the design→implementation pipeline smoother.
- How do we handle component wear curves in the workbench? A slider for usage count that adjusts buff/nerf values?
- Do we model equipment power draw? Currently equipment doesn't have a draw stat. The power budget concept might require adding one.
- Should the workbench track firmware versions (v1, v2) or just treat each product as a bag of stats to tweak?
