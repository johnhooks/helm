---
status: draft
area: ui
priority: p2
---

# Decide fate of unused ui exports

## Problem

Roughly a third of the `@helm/ui` public API has no consumers anywhere in the repo. As of this writing, the following exports are unused outside the package itself:

- The indicator family: `ArcIndicator`, `BarIndicator`, `OrbIndicator`, `StackIndicator`, `WarpIndicator`. Five of the six indicators are unused; only `MatrixIndicator` has a consumer.
- `LcarsFrame` and `LcarsHeaderChip`
- `ButtonPanel`
- `Placeholder`
- `SelectControl`
- `PlanetGlyph` and `StarGlyph` (used internally by `SystemMap`, but exported as public API with no external consumers)

This matters for a few reasons beyond tidiness:

- `SelectControl` is the sole reason the package has a runtime dependency at all. `react-select` is the only entry in `dependencies`, and nothing imports the component. Every consumer of `@helm/ui` carries that dependency for a component nobody renders.
- The public API no longer reflects reality. A future implementer scanning `index.ts` cannot tell which components are proven and maintained versus speculative. The indicator family in particular looks like a designed system (six variants, consistent naming, full stories) but only one variant has ever been exercised in the app.
- Unused exports still cost maintenance. Token changes, style refactors, and the testing work in ui-01 all have to account for components that may never ship.

The complication is that these are probably not all dead code. The indicators and `LcarsFrame` look staged for future bridge work, and the glyphs are load-bearing inside `SystemMap`. This is not a straightforward deletion task; each export needs a judgment call about whether it is waiting for a feature, should be internal-only, or should go.

## Proposed solution

Go through the unused exports and decide, per component, whether to wire it into planned work, demote it to package-internal, or remove it. `SelectControl` is the priority because removing or replacing it drops `react-select` and leaves the package dependency-free. Glyphs likely become internal to `SystemMap` rather than public API. The indicator family needs input on whether bridge plans actually call for them.
