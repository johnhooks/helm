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

Pure computation functions. No state, no side effects. Already exists and is solid. The holodeck calls these — it doesn't replace them or duplicate them. Also owns the experience curve (`buffFactor`, `skillMultiplier`) and the `PilotSkills` type — pre-computed multipliers derived from player action counters that flow through scan and navigation formulas.

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

### What's Been Built (Stages 1–4)

- **Shared catalog data.** Products and hulls moved from workbench to `tests/_data/catalog/`. Holodeck, workbench, and PHP tests all consume the same JSON.
- **Holodeck engine.** `@helm/holodeck` with Clock, seeded RNG, `InternalShipState`, 7 system classes (Power, Propulsion, Sensors, Shields, Hull, Navigation, Cargo), Ship orchestrator with mutations and `resolve()`. Timestamp-based state (`powerFullAt`/`shieldsFullAt`), PowerMode multipliers, deterministic RNG.
- **Pilot skills.** Experience curve (`buffFactor`/`skillMultiplier`) in `@helm/formulas`, `PilotSkills` type with 7 skill categories. Wired through holodeck: `pilot.scanning` boosts scan success chance, `pilot.jumping` boosts discovery probability. Workbench CLI exposes `--pilot-scanning`, `--pilot-jumping` flags.
- **Date test time.** Carbon-inspired `Date::setTestNow()`/`advanceTestNow()`/`withTestNow()` on the PHP Date class for simulation time control.
- **Action lifecycle.** Validate → handle → defer → resolve pipeline. Jump, ScanRoute, FirePhaser, and FireTorpedo handlers. Engine class owns the lifecycle across ships; Ship is the state + mutation layer. Action preview via ship cloning. Handler registry for extensibility.
- **Action CLI.** `bun run wb action` for single action submission, `bun run wb scenario` for JSON scenario sequences. Old `src/sim/` engine removed. `compare` and `matrix` commands for side-by-side analysis and component sweeps.
- **Navigation graph.** `createNavGraph()` loads 275 real systems from `graph.json` (3D coordinates, star metadata, edges with distances). Ships exist at nodes, distance is Euclidean 3D.
- **Multi-ship engine.** `registerShip()`, `getShipsAtNode()`, cross-ship combat (phaser drain, torpedo hit/intercept, PDS, ECM effectiveness reduction).
- **Emissions pipeline.** Actions declare `EmissionDeclaration[]`, engine tracks `EmissionRecord[]` with time-varying `DriveEnvelope` power curves. Equipment emissions (ECM, shield regen) computed from live ship state. `computeEMSnapshot()` aggregates all emissions at a node with stellar baseline and noise floor.
- **Passive detection.** Ships with sensor affinity auto-scan at configurable intervals. `queryPassiveDetection()` produces confidence scores and information tiers (anomaly → class → type → analysis). Self-emissions excluded from detections but contribute to noise floor. `advanceUntilIdle()` interleaves passive scans between action deferrals so mid-flight emissions are detectable.
- **Drive envelope.** Multi-phase jump: spool at origin → cooldown at destination. Each phase produces distinct emissions with time-varying power curves. DSC sensors detect continuous emissions (drive envelopes), ACU sensors detect pulse emissions (weapons fire, scan pings).
- **Verdict system.** `dsp-progress` command with 40+ gameplay checks producing PASS/WARN/FAIL verdicts across submarine warfare, miner safety, sensor tiers, drive envelopes, and multi-ship detection scenarios.
- **Scenario library.** 13 scenario files covering exploration, combat, passive detection, drive envelope detection, ECM impact, fleet engagement, and PDS defense.
- **Baseline persistence.** `bun run wb baseline save/show/diff` with per-command save, show, and diff. Baselines stored as JSON in `data/baselines/`, committed to git. Diff engine with per-command differs: verdict regression detection (dsp-progress), numeric deltas (analyse), composite key matching (balance, detection), outlier tracking (balance).

### Remaining Gaps

- **Report generation.** No markdown report generator. Analysis output is structured JSON consumed by agents or piped through jq. Human-readable reports are Stage 6.

## Stages

### Stage 1: Data Foundation ✓

**Status:** Complete. `4d77228`, `ed6fa0b`, `4e23c1b`

- Product JSON moved to `tests/_data/catalog/products/`
- Hull definitions in `tests/_data/catalog/hulls.json`
- Workbench and holodeck both load from shared catalog
- `wp helm export graph` command built (`src/Helm/CLI/ExportCommand.php`)
- Product stat grid documented in `docs/catalog.md`
- Formula fixtures established in `tests/_data/formulas/`

**Still open:** First PHP test suite running formula fixtures against PHP implementations, catalog audit against PHP seeder data.

### Stage 2: Holodeck — Ship State and Systems ✓

**Status:** Complete. `1d18ac4`, `00042c6`

- `@helm/holodeck` package with Clock, seeded RNG, `InternalShipState`, 7 system classes, Ship orchestrator
- Timestamp-based state (`powerFullAt`/`shieldsFullAt`), PowerMode multipliers (efficiency/normal/overdrive)
- All systems delegate to `@helm/formulas` — no reimplemented math
- Pilot skills (`buffFactor`/`skillMultiplier` in formulas, `PilotSkills` type, wired into Sensors and Navigation)
- Product catalog and loadout builder in holodeck (`buildLoadout()` resolves slugs to typed `Loadout`)
- 117 holodeck tests, 698 total JS tests passing

### Stage 2.5: Workbench — Holodeck CLI Integration ✓

**Status:** Complete. `4e23c1b`, `00042c6`

- **Loadout builder** — `buildLoadout(hullSlug, componentSlugs?, equipmentSlugs?)` in holodeck resolves catalog slugs to typed `Loadout` with `InstalledComponent` wrappers
- **`bun run wb ship`** — Resolve a holodeck Ship and dump full state snapshot. Flags: `--hull`, `--core`, `--drive`, `--mode`, `--power-at`, `--shields-at`, `--pilot-scanning`, `--pilot-jumping`
- **`bun run wb timeline`** — Run mutation sequences (consume power, take damage, advance time) and show state at each step
- All existing workbench commands (`analyse`, `balance`, `matrix`, `compare`, `report`) updated to use holodeck catalog

### Stage 3: Holodeck — Action Lifecycle ✓

**Status:** Complete. Action handlers, registry, and Engine extracted.

**What:** Implement the validate → handle → defer → resolve action pipeline, with clean separation between Ship (state + mutations) and Engine (action lifecycle).

**Why:** Actions are how gameplay happens. The three-phase lifecycle (validate preconditions, handle costs/duration, resolve effects) is where game rules live. The holodeck needs this to answer questions like "what happens when a Specter tries to jump with 5% power?" or "can you scan while a jump is spooling?"

**Architecture:** Mirrors PHP's separation of concerns:

| Holodeck | PHP Equivalent | Responsibility |
|---|---|---|
| `Engine.submitAction()` | `ActionFactory::create()` | Validate, handle, create action record |
| `Engine.advance()` | `ActionProcessor::processReadyActions()` | Advance clock, resolve ready actions across all ships |
| `handler.resolve()` (via Engine) | `ActionResolver::resolve()` | Execute mutations on ship state |
| `Engine.previewAction()` | (no PHP equiv — dry run) | Clone ship, simulate, return projected state |
| `Ship` | `ShipLink` / `Simulation` | State container + mutation methods |
| `registry` | DI container + `ActionType::getHandlerClass()` | Handler lookup by type |

Ship owns state and mutations (`resolve()`, `consumePower()`, `moveToNode()`, etc.) plus `createClone()` for preview support. Engine owns the action lifecycle (`submitAction`, `advance`, `advanceUntilIdle`, `previewAction`, `getCurrentAction`, `getActions`). This enables multi-ship orchestration in Stage 4 — Engine has cross-ship visibility and a central timeline.

**Delivered:**
- Action model (ActionType, ActionStatus, Action, ActionIntent, ActionOutcome, ActionPreview)
- Handler interface with validate/handle/resolve phases
- Handler registry (registerHandler/getHandler)
- Jump and ScanRoute handlers with full validation
- Engine class owning the action lifecycle across ships
- One-action-at-a-time enforcement per ship
- Time advancement that resolves deferred actions
- Action preview via ship cloning (doesn't mutate real state or consume real RNG)
- Action history inspection (getCurrentAction, getActions with optional ship filter)

### Stage 3.5: Workbench — Action CLI Integration ✓

**Status:** Complete.

- **`bun run wb action`** — Single action submission with preview, before/after state, and result. Supports all tuning flags (throttle, effort, pilot skills).
- **`bun run wb scenario <file.json>`** — JSON scenario runner through the holodeck engine. Multi-ship support with sequential action execution. Generates timeline with state snapshots at each step. Handles passive scans triggered during action resolution.
- **Action comparison** — `bun run wb compare` for side-by-side loadout comparison. `bun run wb matrix --vary=core,drive` for Cartesian product sweeps.
- **Old sim engine removed** — `src/sim/` deleted. All simulation runs through holodeck's action lifecycle.

### Stage 4: Holodeck — Multi-Ship and Environment ✓

**Status:** Complete.

- **Navigation graph.** `createNavGraph(masterSeed)` loads from `tests/_data/catalog/graph.json` — 275 systems within 10 ly of Sol with 3D coordinates, star metadata (spectral class, luminosity, temperature), edges with distances. `getNode()`, `getNeighbors()`, `distanceBetween()`, `addEdge()`, `incrementTraversal()`.
- **System/node model.** Ships exist at nodes (`nodeId`). `getShipsAtNode()` for co-location queries. Detection and combat are node-scoped.
- **Stellar environment.** Spectral class → `stellarNoise()` → noise floor baseline. Belt masking modeled in detection analysis.
- **Multi-ship awareness.** Engine registry (`registerShip`), auto-registration on `submitAction`. Cross-ship combat: phaser drain, torpedo hit/miss/intercept, PDS defense, ECM effectiveness reduction.
- **Emission tracking.** Actions declare `EmissionDeclaration[]` in `ActionIntent`/`ActionOutcome`. Engine tracks `EmissionRecord[]` with start/end times, time-varying `DriveEnvelope` power curves. `getActiveEmissions(nodeId, atTime)`. Equipment emissions (ECM, shield regen) computed from live ship state via `computeEquipmentEmissions()`.
- **Detection integration.** `queryPassiveDetection(shipId, integrationSeconds)` → EM snapshot → confidence → information tier. `processPassiveScans()` batch-processes all ships ready to scan. `advanceUntilIdle()` interleaves passive scans between action deferrals for mid-flight detection.
- **Drive envelope.** Multi-phase jump: spool at origin (front-loaded power curve) → cooldown at destination (decaying curve). `emissionPowerAtTime()` applies envelope to get instantaneous power. DSC sensors excel at detecting continuous emissions (drive envelopes), ACU sensors excel at pulse emissions (weapons, scans).
- **Environmental modifiers.** Noise floor from `noiseFloor(stellarBaseline, shipEmissions, jitter, ecmNoise, saturation)`. ECM raises noise floor for all ships at the node. Self-interference: own emissions raise noise floor but are excluded from detections.

### Stage 5: Analysis Framework ✓

**Status:** Complete. Delivered across Stages 3.5–4 and `c31e9c4`.

- **Scenario format + runner** (Stage 3.5): `ScenarioFile` JSON format, `bun run wb scenario` runs multi-ship action sequences through the holodeck engine
- **Verdict system** (Stage 4): `dsp-progress` with 67 gameplay checks (PASS/WARN/FAIL/INFO) across 11 sections
- **Pre-built scenario library** (Stage 4): 13 scenario files covering exploration, combat, passive detection, ECM, fleet engagement
- **Baseline persistence** (`c31e9c4`): `bun run wb baseline save/show/diff` with per-command save, show, diff. JSON baselines in `data/baselines/`, committed to git
- **Diff engine** (`c31e9c4`): Per-command differs with verdict regression detection (dsp-progress), numeric leaf comparison (analyse), composite key matching (balance, detection), outlier tracking (balance). 23 unit tests
- **Static report preserved**: `computeShipReport` used by `analyse`, `balance`, `matrix` for formula-level sweeps. Matrix commands consume holodeck data structures (shared catalog, hull/product types) but compute statically — the engine is for behavioral validation (scenarios), not numeric sweeps

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
- **Sim engine** — Removed. Fully replaced by the holodeck engine in Stage 3.5.
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
- Pilot skill progression (show current multipliers and progress toward next plateau)

The frontend never imports from `@helm/holodeck`. When holodeck work produces a function or type the frontend needs, it gets extracted into `@helm/formulas` (pure computation like `getCurrentPower(fullAt, max, regenRate, now)`) or `@helm/types` (shared interfaces). Both the holodeck and the frontend then import from the shared package. The holodeck is where we design and validate; the shared packages are what ships to production.

## Decisions

Resolved questions captured here for context.

- **Where's the line between workbench and game server?** The workbench owns static loadout analysis — sweep the component matrix, flag outliers, validate balance. The holodeck owns gameplay simulation — timestamp-based state, action lifecycles, multi-ship interaction. PHP owns persistence, real-time operations, and is the authority for game state. When the workbench or holodeck reveals a formula needs tuning, we update `@helm/formulas` first, then update PHP to match.
- **Type extraction cadence.** Types incubate in the holodeck and get backported to `@helm/types` when the shape is settled and the frontend or PHP implementation needs them. The holodeck re-exports its own types so the workbench can import them immediately.
- **Game data ownership.** Product catalog and hull definitions live in `tests/_data/catalog/` as the single source of truth. The workbench, holodeck, and PHP tests all read from there.
- **Cargo and economy.** The holodeck models cargo (slug → quantity) and mining operations — enough to answer "how long to fill a hold with different loadouts?" Full trade/manufacturing is out of scope; the holodeck validates extraction and capacity, not the economy.
- **Navigation graph.** Exported from the running game instance via `wp helm export graph`. 10 ly radius around Sol (~275 systems, 132K). The celestial data is static (real HYG star catalog) and the graph doesn't change much because exploration is slow and game-engine-driven. The export produces nodes (3D coordinates in light-years, star metadata for noise floors), edges (connections with distances), and stellar environment data. This lands in `tests/_data/catalog/graph.json` alongside products and hulls. Ships are at nodes (`node_id`). Detection and combat are system-scoped (same node = can interact). Jump costs depend on edge distance. Long-distance navigation tests should start from the edge of the sphere and traverse across, giving ~20 ly of travel distance from a 10 ly radius. No procedural generation in the holodeck — real game world data.
- **Scenario authoring.** JSON files. They enable interop between JS holodeck tests and PHP implementation tests — same scenario files, both sides validate their implementation produces matching results. This is more valuable than authoring convenience.
