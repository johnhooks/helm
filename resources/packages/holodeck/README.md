# @helm/holodeck

Design-time simulation engine for Helm game mechanics. Where ship systems are designed and validated before PHP implementation.

## Role

The holodeck mirrors PHP's ShipLink architecture — same timestamp-based state, same system decomposition, same action lifecycle — so design decisions translate directly to implementation. Mechanics are iterated here at millisecond speed, then ported to PHP when the design is settled.

This is a design-time package. It is never imported by frontend code. When holodeck work produces a reusable function or type, it gets extracted to `@helm/formulas` (pure math) or `@helm/types` (shared interfaces). The holodeck then imports from the shared package instead of owning it.

It exists as a separate package from the workbench because it maps directly to `src/Helm/ShipLink/` in PHP. The workbench is analysis and reporting. The holodeck is the simulation. Different concerns, different change rates.

## What It Handles

**Ship state.** Timestamp-based regeneration for power and shields (`fullAt` pattern), finite core life, hull integrity, cargo, active equipment, pilot skill multipliers.

**Ship systems.** Seven system classes — power, propulsion, sensors, shields, hull, navigation, cargo — each reading from the ship's loadout and delegating math to `@helm/formulas`.

**Action lifecycle.** Validate, handle, defer, resolve. Actions take real time — scans take seconds, jumps take hours. Multi-phase actions (jump spool then cooldown) produce distinct emissions at each phase.

**Multi-ship interaction.** Ships coexist at nodes. Phaser drain, torpedo volleys with PDS interception, ECM noise injection. The engine tracks all ships and mediates cross-ship effects.

**Navigation graph.** 275 real star systems from the HYG catalog within 10 ly of Sol. Deterministic waypoint generation during scan discovery. Ships exist at nodes, distances are Euclidean 3D.

**Emissions and detection.** Actions declare emissions (type, spectral shape, power, envelope). The engine tracks emission records with start/end times and time-varying power curves. Passive detection aggregates stellar noise, ship emissions, and ECM into a noise floor, then runs the DSP pipeline to produce confidence scores and information tiers per source.

## What It Doesn't Handle

**The math.** Pure formulas live in `@helm/formulas`. The holodeck calls them — it doesn't reimplement or replace them.

**Analysis and reporting.** Running scenarios at scale, generating reports, flagging outliers, regression detection — that's `@helm/workbench`. The holodeck is one of its engines.

**Persistence or real players.** The game server is WordPress. PHP saves state, resolves actions for real players, enforces rules. The holodeck validates that those rules produce the gameplay we designed.

**Frontend rendering.** The bridge dashboard needs ship state formulas and types. Those get extracted to `@helm/formulas` and `@helm/types` when stabilized, not imported from holodeck.

## Relationship to PHP

`@helm/formulas` is the reference for the math. The holodeck is where we validate that mechanics compose correctly before committing to PHP. Both environments consume the same product catalog (`tests/_data/catalog/`) and the same test fixtures (`tests/_data/fixtures/`). Contract tests run identical inputs through both implementations and assert identical outputs. When the numbers disagree, we fix PHP to match.

## Further Reading

-   `docs/plans/workbench.md` — package architecture, stage history, design decisions
-   `docs/plans/simulation-testing.md` — how holodeck and PHP simulation work together
-   `docs/dev/simulation.md` — PHP simulation layer
-   `docs/dev/dsp.md` — detection system design philosophy
