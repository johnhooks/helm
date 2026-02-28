# Workbench Issues

## Hull stats are decorative

`powerMax` and `shieldsMax` on `Hull` aren't used anywhere. The formulas compute `perfRatio` purely from `coreOutput / drive.mult_b`. There's no constraint from the hull itself. This is the biggest gap — the central relationship (hull constraints forcing component tradeoffs) isn't wired up.

## Hardcoded scan constant

`ship.ts:42` has `const powerCostPerLy = 2.0` instead of importing `BASE_SCAN_POWER_PER_LY` from `scan.ts`. If the constant changes, this goes stale.

## Formatter duplication

`num()` and `pct()` are defined identically in both `ship-report.tsx` and `comparison-view.tsx`. Should be a shared util.

## Comparison labels aren't descriptive

`app.tsx:39` uses `hull.label / core.label` which can be identical for both columns when only a drive or sensor differs.

## No footprint overflow indication

If component footprints exceed `hull.internalSpace`, cargo silently goes negative. No visual indication that the loadout is invalid.

## Hull slots are all identical

All four hulls have the same `['core', 'drive', 'sensor', 'shield', 'nav']` array. The slot layout was supposed to be the differentiator (scout gets cloak, surveyor gets dual sensor, combat gets dual shields). The `slots` field exists but isn't used by the builder or validated.
