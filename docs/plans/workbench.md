# Workbench Plan

The workbench is a TypeScript playground for designing and validating Helm's game mechanics. It lets us run thousands of scenarios in seconds without WordPress, databases, or Docker — figuring out the basics before committing to PHP implementation.

This document captures what the workbench needs to become, broken into stages. Each stage is a self-contained session with its own detailed plan.

## Why TypeScript

PHP is the authority. WordPress is the game server. That isn't changing. But TypeScript gives us:

- **Iteration speed.** Change a formula, run 500 scenarios, see results in under a second. No container rebuild, no database state to manage.
- **Frontend reuse.** The LCARS dashboard needs the same mechanics to render live ship state — power curves, drive envelopes, sensor readouts, shield regen timers. Code designed in the holodeck carries directly into the bridge application.
- **Agent accessibility.** An AI agent can run the workbench, read the output, and reason about game balance without needing a running WordPress instance.

The relationship between TypeScript and PHP:

- **PHP is the authority.** The game server saves state, resolves actions, enforces rules for real players. When a player jumps, PHP decides what happens. That isn't changing.
- **`@helm/formulas` is the reference for the math.** The pure computations — jump duration, scan cost, detection probability, strain curves — are defined and validated in TypeScript first. PHP reimplements these formulas. When the numbers disagree, we fix PHP to match. The math is designed here, not reverse-engineered from PHP.
- **The workbench figures out the basics first.** We validate that game mechanics produce the gameplay we designed *before* committing to the PHP implementation. The PHP engine has already evolved significantly — some of that evolution happened without workbench validation, and we've had to course-correct. The workbench is where we get the design right. PHP is where we make it real.
- **The double-work is intentional.** Designing in TS then implementing in PHP is "design it, then build it." The design phase is fast and cheap. The implementation phase is deliberate and permanent. This is better than experimenting directly in PHP where experiments become committed code that spiders through the application.

## Package Architecture

```
resources/packages/
├── types/           @helm/types      — Shared domain types (used by frontend, holodeck, workbench)
├── formulas/        @helm/formulas   — Pure math, reference implementation
├── holodeck/        @helm/holodeck   — Ship simulation engine (design-time only)
└── workbench/       @helm/workbench  — Analysis + reporting (consumes holodeck)

tests/
└── _data/                            — Shared test fixtures (JSON, consumed by vitest + wpunit)
```

### @helm/types — The Shared Vocabulary

Types that both the frontend and other packages need. This package already exists with `ShipState`, `Product`, `SystemComponent`, `ShipLoadout`, `NavNode`, system stats interfaces, and frontend data plumbing (`Registry`, `DispatchFunction`, REST types).

`@helm/types` stays focused on what it has today. New game mechanics types (ActionType, PowerMode, ShipFittingSlot, etc.) do **not** land here upfront — they incubate in the holodeck where they can evolve freely without prematurely committing the shared vocabulary. When a type stabilizes in the holodeck and the frontend or PHP implementation actually needs it, it gets backported to `@helm/types`.

### @helm/formulas — The Reference Math

Pure computation functions. No state, no side effects. Already exists and is solid. The holodeck calls these — it doesn't replace them or duplicate them.

### @helm/holodeck — The Simulation Engine

A TypeScript implementation of ShipLink's concepts. Not a port of the PHP code — a reimplementation of the same rules so we can run gameplay sequences at speed and validate mechanics before PHP implementation.

The holodeck imports from `@helm/types` and `@helm/formulas`, then defines its own types for game mechanics that don't exist yet in the shared vocabulary — `ActionType`, `ActionStatus`, `PowerMode`, `ShipFittingSlot`, action param/result interfaces, and anything else the simulation needs. It re-exports these so the workbench (and eventually other consumers) can import them from `@helm/holodeck`. When a type stabilizes and is needed by the frontend or PHP, it gets backported to `@helm/types` and the holodeck switches to importing it instead of owning it.

The holodeck is a design-time package — it is never imported by frontend code. When holodeck work reveals a function or type that the frontend needs, that code gets extracted into `@helm/formulas` (pure math) or `@helm/types` (shared interfaces). The holodeck then imports from the shared package instead of owning it. The holodeck is where we figure out the right shape; the shared packages are where reusable pieces land.

The holodeck is a separate package from the workbench because:
- It maps directly to `src/Helm/ShipLink/` in PHP. Separate package = easier to compare.
- The workbench is analysis and reporting. The holodeck is the simulation. Different concerns, different change rates.

### @helm/workbench — Analysis and Reporting

The workbench is the analysis brain. It knows what questions to ask, runs the numbers, interprets the results, and produces verdicts. The holodeck is one of its inputs — the workbench drives the holodeck, not the other way around.

Two modes of analysis:

1. **Static analysis** (formulas only) — Loadout capability snapshots, component matrices, balance outlier detection. Calls `@helm/formulas` directly. No simulation needed. This is the workbench's strongest piece today.

2. **Dynamic analysis** (holodeck-powered) — Gameplay sequences, combat matchups, mining throughput, action lifecycle validation. Feeds scenario JSON into the holodeck engine, collects results, and interprets them at scale. "Run 200 combat matchups and tell me which weapon is broken."

Both modes produce the same kind of output: structured data with verdicts, outlier flags, and regression detection. The workbench is the reporter and the analyzer; the holodeck is just one of its engines.

### tests/_data/ — Shared Game Data and Test Fixtures

The canonical source for all pre-implementation game data. This is not just test fixtures — it's the shared data layer that the holodeck, workbench, and PHP tests all consume. No package owns this data; it lives outside the package tree so every consumer has equal access.

Two kinds of data live here:

**Catalog data** — The game's product definitions, hull definitions, and navigation graph as JSON. Products and hulls currently live in the workbench (`workbench/data/products/`, `workbench/src/data/hulls.ts`) and move here. The navigation graph is exported from the local development environment (lando), which has the seeded star catalog and generated node data:

```bash
# Requires a running lando instance with seeded data (see docs/dev/getting-started.md)
lando wp helm export graph --node=1 --radius=10 > tests/_data/catalog/graph.json
```

The celestial data is static (real HYG star catalog) and the graph changes slowly through gameplay exploration. Re-export when the graph has meaningfully changed. The export includes nodes (3D coordinates, type), star metadata for system nodes (spectral class, luminosity, temperature — needed for noise floor calculations), and edges (connections with distances and traversal counts). When PHP seeders are built, they read from the same catalog files — one source of truth, no drift.

**Test fixtures** — Input/expected pairs for contract tests, following the Codeception convention already established in the project. Both vitest (for holodeck/formulas) and wpunit (for PHP ShipLink) load the same fixtures.

```
tests/_data/
├── catalog/
│   ├── hulls.json
│   ├── graph.json
│   └── products/
│       ├── core.json
│       ├── drive.json
│       ├── sensor.json
│       ├── shield.json
│       ├── nav.json
│       └── equipment.json
├── formulas/
│   ├── jump-duration.json
│   ├── scan-cost-with-strain.json
│   └── detection-probability.json
├── ship-state/
│   ├── power-from-timestamp.json
│   └── shield-regen-to-full.json
└── actions/
    ├── jump-validates-power.json
    └── scan-route-lifecycle.json
```

Catalog files are the game data itself — hull stats, product specs, component properties. Test fixtures are `{ input, expected }` pairs. The TS test and PHP test both load a fixture, run their implementation, and assert the same expected values. When the numbers disagree, you know exactly where the drift is.

## Keeping PHP and TypeScript Aligned

### Contract Tests, Not Implementation Tests

The shared fixtures test *behavior*: "Given a ship with this state and this loadout, `getCurrentPower()` at this timestamp returns this value." Both implementations can be structured however they want internally. The contract is the input/output pair.

### Formula Parity Is the Foundation

`@helm/formulas` has thorough tests. The PHP formula implementations need a matching test suite that runs the same inputs and asserts matching outputs. If the formulas agree, higher-level discrepancies are in the composition layer, not the math.

### Naming Alignment

Not identical class structures, but matching names on the contracts. If PHP has `PowerSystem::getCurrentPower()`, holodeck has `PowerSystem.getCurrentPower()`. If PHP has `ActionType::Jump`, types has `ActionType.Jump`. Reading one should let you find the corresponding concept in the other.

### Types Flow: Holodeck → @helm/types → PHP

New game mechanics types incubate in the holodeck where they can evolve without friction. When a type stabilizes — the shape is settled and the frontend or PHP implementation needs it — it gets backported to `@helm/types`. That promotion is the signal that PHP needs to match. The holodeck then switches from owning the type to importing it from `@helm/types`.

This means `@helm/types` only grows when types are ready for real implementation. The holodeck is free to experiment without polluting the shared vocabulary with unstable interfaces.

## What We Have Today

The workbench currently has three loosely connected layers:

1. **Static reports** (`computeShipReport`) — Compute a loadout's capabilities as a snapshot. No time, no state, no interaction. This is the strongest piece.

2. **Formula analysis** (analyse, dsp, detection commands) — Large batteries that exercise formulas across parameter spaces. Good for regression testing the math, but output is raw JSON that requires heavy post-processing to interpret.

3. **Discrete-event sim** (`src/sim/engine.ts`) — A toy simulator that steps through scripted actions. No timestamp-based state, no action validation, no real duration modeling, non-deterministic RNG, no spatial awareness. It's a prototype that answered early questions but can't validate real gameplay.

### The Gaps

- **No ship state model.** The game needs timestamp-based state computation — `power_full_at` and `shields_full_at` are timestamps, not current values. Power is computed on demand from "when will it be full?" and the regen rate. The workbench stores `power: number` as a flat float. This means we can't validate the timing mechanics that define Helm's gameplay.

- **No action lifecycle.** The game needs validate → handle → defer → resolve. The workbench sim just executes actions instantly at scripted timestamps. No validation ("do you have enough power?"), no duration ("this jump takes 3 hours"), no deferral, no conflicts ("you're already jumping").

- **No PowerMode.** The game needs Efficiency/Normal/Overdrive modes that change output multipliers and decay rates. Efficiency mode's zero-decay is a core gameplay mechanic (safe harbor). The workbench doesn't model this, so we can't validate power mode tradeoffs.

- **No spatial model.** Ships have `position: number` — a scalar. No nodes, no edges, no distance between ships. Detection assumes proximity. Escape has no meaning.

- **No determinism.** Torpedo hits and scan success use `Math.random()`. Scenarios aren't reproducible. This contradicts the "same seed = same content" design principle.

- **No shared vocabulary.** The PHP engine has ActionType (12 types), ActionStatus (5 states), PowerMode (3 modes), ShipFittingSlot (8 slots) as enums. The workbench has its own ad-hoc types that don't match. When we add a new action type in the workbench, there's no mechanism to ensure PHP stays aligned.

- **Analysis output is unusable.** The `analyse` command produces ~84,000 lines of raw JSON. An agent can't read it without writing custom jq pipelines. There's no summary, no verdicts, no flagging of problems.

## Stages

### Stage 1: Data Foundation

**What:** Establish shared game data and test fixtures. Audit existing data for PHP alignment.

**Why:** Everything else depends on having correct, shared data. The product and hull definitions currently live inside the workbench where only it can access them. Moving them to `tests/_data/catalog/` makes them available to the holodeck, workbench, and PHP tests from a single source. Formula fixtures establish the contract testing pattern between TS and PHP.

**Scope:**
- Move product JSON from `workbench/data/products/` to `tests/_data/catalog/products/`
- Move hull definitions from `workbench/src/data/hulls.ts` to `tests/_data/catalog/hulls.json`
- Update workbench loaders to read from `tests/_data/catalog/` instead of local `data/`
- ~~`wp helm export graph` WP-CLI command~~ **Done.** See `src/Helm/CLI/ExportCommand.php`. Export a 20 ly sphere from lando and commit it:
  ```bash
  lando wp helm export graph --node=1 --radius=10 > tests/_data/catalog/graph.json
  ```
- Product stat grid documentation (which mult_* means what per component type)
- Hull definitions alignment check
- Audit catalog data against PHP seeder data
- Create `tests/_data/formulas/` structure with initial formula fixtures
- First PHP test suite that runs formula fixtures against PHP implementations

### Stage 2: Holodeck — Ship State and Systems

**What:** Create `@helm/holodeck` package. Implement ship state with timestamp-based computation and seven system classes.

**Why:** This is the core of the holodeck's value. Without timestamp-based state, we can't validate the timing mechanics that define Helm's gameplay. Jump spool takes 4 minutes. Shield regen fills at 10/hr. Power reaches full at a specific timestamp. These interactions are where bugs live, and we currently can't test them.

**Scope:**
- New `@helm/holodeck` package, imports `@helm/types` and `@helm/formulas`, loads catalog from `tests/_data/catalog/`
- Define holodeck-owned types: ActionType, ActionStatus, PowerMode, ShipFittingSlot enums; action param/result interfaces
- Ship class as the state orchestrator (only mutator, systems are read-only)
- PowerSystem with `full_at` timestamp computation, PowerMode multipliers, capacitor, regen rate, core life tracking
- Propulsion with jump duration, core cost, performance ratio, comfort range
- Sensors with scan range, cost, duration, success chance
- Shields with `full_at` timestamp computation, capacity (hull-multiplied), regen rate, damage absorption
- Hull with integrity, damage, destruction detection
- Navigation with position (node ID), discovery probability
- Cargo as a simple inventory (slug → quantity)
- Clock abstraction for time control (advance, advanceTo, now)
- Deterministic seeded RNG
- Shared fixtures in `tests/_data/ship-state/` covering timestamp computations
- Extract any pure functions useful to the frontend into `@helm/types` or `@helm/formulas`

### Stage 2.5: Workbench — Holodeck CLI Integration

**What:** Wire the holodeck into the workbench CLI so we can see holodeck results without writing ad-hoc scripts.

**Why:** The holodeck engine works (698 tests prove it) but has no CLI — it's only visible through the test runner. We need a feedback loop before building the action lifecycle. Without it, Stages 3 and 4 would be developed blind. The workbench is the operator; the holodeck is the engine. This stage connects them.

**Scope:**
- **Loadout adapter** — Bridge workbench's product catalog (`WorkbenchProduct`) to the holodeck's `Loadout` type. The workbench already loads all products from JSON with `getProduct(slug)`. The adapter takes product slugs + hull slug and produces a holodeck `Loadout` (hull + `InstalledComponent` wrappers). Lives in the workbench, not the holodeck.
- **`bun run wb ship`** — Resolve a holodeck Ship from the product catalog and dump the full state snapshot. Flags: `--hull=pioneer`, `--core=epoch_s`, `--drive=dr_505`, `--mode=overdrive`, `--power-at=3600`, `--shields-at=7200`. Shows: resolved power/shield/hull, system capabilities (scan range, jump comfort, regen rates), and power mode effects. JSON output like all other workbench commands.
- **`bun run wb timeline`** — Run a simple sequence of mutations (consume power, take damage, advance time) and show the ship state at each step. Takes inline flags or a JSON file. This is not the action lifecycle (Stage 3) — it's direct Ship mutations with clock advances, enough to see regen curves and damage interactions.
- **Hull × loadout sweep** — Extend the existing `matrix` command (or add a flag) to produce holodeck-resolved snapshots instead of static formula reports. Same matrix logic, but the numbers come from the holodeck Ship rather than raw formula calls.

**Not in scope:**
- Action lifecycle (Stage 3)
- Scenario JSON format (Stage 5)
- Replacing the existing sim engine (that happens incrementally as the holodeck gains capabilities)

### Stage 3: Holodeck — Action Lifecycle

**What:** Implement the validate → handle → defer → resolve action pipeline.

**Why:** Actions are how gameplay happens. The three-phase lifecycle (validate preconditions, handle costs/duration, resolve effects) is where game rules live. The holodeck needs this to answer questions like "what happens when a Specter tries to jump with 5% power?" or "can you scan while a jump is spooling?"

**Scope:**
- Action model using ActionType/ActionStatus from `@helm/holodeck`
- ActionFactory that validates and handles
- Validators for implemented action types (Jump, ScanRoute at minimum)
- Handlers that compute duration and seed result data
- Resolvers that mutate ship state on completion
- One-action-at-a-time enforcement (current_action_id)
- Time advancement that resolves deferred actions in order
- Action queue inspection (what's pending, what's running, what completed)
- Shared fixtures in `tests/_data/actions/` covering action lifecycles
- Action preview function (given ship state + proposed action, return projected state) — extractable to frontend for draft action UX

### Stage 3.5: Workbench — Action CLI Integration

**What:** Wire the holodeck's action lifecycle into workbench CLI commands.

**Why:** Same rationale as Stage 2.5 — the action pipeline needs a feedback loop before building multi-ship in Stage 4. "What happens when a Pioneer tries to jump 15 ly in efficiency mode?" should be answerable with a CLI command, not just a unit test.

**Scope:**
- **`bun run wb action`** — Submit an action to a holodeck Ship and show the result. `--hull=pioneer --action=jump --distance=10` → validates, shows duration/costs, resolves, shows final state. Covers the full validate → handle → resolve pipeline in one command.
- **`bun run wb scenario <file.json>`** — Run a sequence of actions from a JSON file through the holodeck. This replaces/evolves the existing `simulate` command to use the holodeck engine instead of the workbench's toy sim. Actions are validated and resolved through the action lifecycle, not just applied as raw mutations.
- **Action comparison** — "What's the difference between jumping 10 ly in normal vs efficiency mode?" Side-by-side output showing costs, duration, and projected state for each.
- **Migrate existing sim tests** — Move tests from `src/sim/engine.test.ts` to use the holodeck-backed scenario runner where applicable. Tests that cover action lifecycle behaviors (jump costs power, scan has success chance, phaser drains shields) should validate against the holodeck, not the toy sim.

**Not in scope:**
- Multi-ship (Stage 4)
- Full analysis framework rebuild (Stage 5)

### Stage 4: Holodeck — Multi-Ship and Environment

**What:** Add spatial awareness, multi-ship systems, and environmental context.

**Why:** Helm's most interesting mechanics are emergent from multi-ship interaction. Detection, combat, interdiction, and the economy all depend on ships coexisting in systems and affecting each other. The holodeck can't validate any of these without a spatial model.

**Scope:**
- Load navigation graph from `tests/_data/catalog/graph.json` (exported from live game via `wp helm export graph`)
- System/node model (ships exist at nodes, nodes have 3D coordinates and star metadata)
- Stellar environment from real star data (spectral class → noise floor, belt density, traffic)
- Multi-ship awareness (which ships share a node)
- Emission tracking (actions produce emissions, engine tracks them)
- Detection integration (passive detection between ships at the same node)
- Drive envelope integration (spool/sustain/cooldown phases produce emissions over time)
- Environmental modifiers from real stellar data that affect formula inputs

### Stage 5: Analysis Framework

**What:** Rebuild the workbench analysis layer to consume the holodeck engine instead of raw formulas.

**Why:** The current analysis commands produce raw data that requires manual interpretation. The new analysis layer should run scenarios through the holodeck, compare results against design goals, and produce structured verdicts. "Is the game balanced?" should be answerable by running one command and reading the output.

**Scope:**
- Scenario definition format (ships, loadouts, action sequences, assertions)
- Scenario runner that feeds scenarios through the holodeck
- Verdict logic (PASS/WARN/FAIL against named design goals)
- Matrix runner (hull × component × tuning sweeps through the engine, not just static reports)
- Baseline save/load for regression detection
- Diff engine for comparing two analysis runs
- Pre-built scenario library covering the design questions from simulation-testing.md
- Static report (`computeShipReport`) preserved as a convenience for quick loadout checks

### Stage 6: Report Generation

**What:** Build the report layer that turns analysis data into readable markdown documents.

**Why:** The workbench's output needs to be useful without post-processing. A generated report should tell you the state of game balance, what changed since last run, and what needs attention. It should be readable by both humans reviewing game design and agents doing balance work.

**Scope:**
- Report generator that reads analysis results and writes markdown files
- Summary report (top-level findings, flags, key metrics)
- Per-category deep-dive reports (combat balance, detection/stealth, economy, progression)
- Regression report (what changed since the last baseline)
- Reports written to `reports/` directory, gitignored or committed as design artifacts
- CLI command: `bun run wb report` generates the full report suite

## Migration

The existing workbench code doesn't get thrown away — it gets reorganized:

- **`@helm/formulas`** — Stays as-is. The holodeck calls formulas, it doesn't replace them.
- **`@helm/types`** — Stays as-is. New game mechanics types incubate in the holodeck. Types get backported to `@helm/types` when they stabilize and the frontend or PHP needs them.
- **`computeShipReport()`** — Stays in the workbench as a convenience function for quick static analysis.
- **Product/hull data** — Moves from `workbench/data/` to `tests/_data/catalog/` in Stage 1. Workbench loaders repoint to the shared location. Holodeck and PHP tests consume the same files.
- **DSP analysis commands** — Migrate into the analysis framework as scenario categories (Stage 5). The formula-level DSP analysis is still valuable.
- **Sim engine** — Incrementally replaced by the holodeck. Stage 2.5 adds holodeck-backed CLI commands alongside the existing sim. Stage 3.5 migrates the scenario runner to use the holodeck's action lifecycle. The old sim engine stays until the holodeck can handle everything it does.
- **CLI commands** — Collapse from 12 commands to a focused set.

## What Carries to Frontend

The LCARS bridge dashboard needs to show live ship state:

- Power capacitor gauge (filling toward `full_at`)
- Shield strength gauge (same `full_at` pattern)
- Drive envelope visualization (which phase, current power draw)
- Sensor scan progress and detection confidence
- Jump progress with ETA
- Core life remaining with projected jumps-until-death
- Draft action preview (show the projected ship state before committing an action)
- Power mode effects (show how switching modes changes all the numbers)

The frontend never imports from `@helm/holodeck`. When holodeck work produces a function or type the frontend needs, it gets extracted into `@helm/formulas` (pure computation like `getCurrentPower(fullAt, max, regenRate, now)`) or `@helm/types` (shared interfaces). Both the holodeck and the frontend then import from the shared package. The holodeck is where we design and validate; the shared packages are what ships to production.

## Decisions

Resolved questions captured here for context.

- **Where's the line between workbench and game server?** The workbench owns static loadout analysis — sweep the component matrix, flag outliers, validate balance. The holodeck owns gameplay simulation — timestamp-based state, action lifecycles, multi-ship interaction. PHP owns persistence, real-time operations, and is the authority for game state. When the workbench or holodeck reveals a formula needs tuning, we update `@helm/formulas` first, then update PHP to match.
- **Type extraction cadence.** Types incubate in the holodeck and get backported to `@helm/types` when the shape is settled and the frontend or PHP implementation needs them. The holodeck re-exports its own types so the workbench can import them immediately.
- **Game data ownership.** Product catalog and hull definitions live in `tests/_data/catalog/` as the single source of truth. The workbench, holodeck, and PHP tests all read from there.
- **Cargo and economy.** The holodeck models cargo (slug → quantity) and mining operations — enough to answer "how long to fill a hold with different loadouts?" Full trade/manufacturing is out of scope; the holodeck validates extraction and capacity, not the economy.
- **Navigation graph.** Exported from the running game instance via `wp helm export graph`. 10 ly radius around Sol (~275 systems, 132K). The celestial data is static (real HYG star catalog) and the graph doesn't change much because exploration is slow and game-engine-driven. The export produces nodes (3D coordinates in light-years, star metadata for noise floors), edges (connections with distances), and stellar environment data. This lands in `tests/_data/catalog/graph.json` alongside products and hulls. Ships are at nodes (`node_id`). Detection and combat are system-scoped (same node = can interact). Jump costs depend on edge distance. Long-distance navigation tests should start from the edge of the sphere and traverse across, giving ~20 ly of travel distance from a 10 ly radius. No procedural generation in the holodeck — real game world data.
- **Scenario authoring.** JSON files. They enable interop between JS holodeck tests and PHP implementation tests — same scenario files, both sides validate their implementation produces matching results. This is more valuable than authoring convenience.
