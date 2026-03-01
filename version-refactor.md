# Task: Remove pre-authored version progressions from the workbench

## Context

The workbench (`resources/workbench/`) is a CLI tool for validating gameplay formulas against product data. It currently has every product pre-authored at versions 1, 2, and 3 — for example, `DR-505 v1`, `DR-505 v2`, `DR-505 v3` in `resources/workbench/data/products/drive.json`. This was based on a "version grammar" design where versions were predictable firmware upgrades with formulaic stat nudges.

That design has been scrapped. See `docs/ships.md` "Versions (Manufacturing Runs)" and `docs/plans/product-roadmap.md` "Versions as Balance Patches" for the current design.

## What versions mean now

A version is a **manufacturing run**. Products ship as v1. A v2 only exists if gameplay data reveals a balance problem — the manufacturer retools the production line. The old version stops manufacturing but every unit already in the game persists (can be used, repaired, bought, sold, salvaged). This creates economic scarcity: nerfed v1 units become collectibles, buffed v1 units become cheap beaters.

There is no predictable v1→v2→v3 progression. No version grammar. Most products may never need a v2. The delta between versions is whatever balance requires, not a formulaic nudge.

## What to do

1. **Strip all v2 and v3 entries from the product data files.** Each product should exist once, at version 1. Files:
   - `resources/workbench/data/products/core.json`
   - `resources/workbench/data/products/drive.json`
   - `resources/workbench/data/products/sensor.json`
   - `resources/workbench/data/products/shield.json`

2. **Remove version-related helpers from `resources/workbench/src/data/products.ts`.** Functions like `getProductVersions()`, `getLatestProduct()`, and any version-filtering logic in `getProductsByType()` and `getProduct()`. Products are now looked up by slug alone — no version parameter needed.

3. **Remove the `catalog` CLI command** (`resources/workbench/src/cli/catalog.ts` and its registration in `cli.ts`). It existed to visualize version grammar progressions, which no longer exist.

4. **Remove version-related analysis scenarios.** The `analyse` command (`resources/workbench/src/cli/analyse.ts`) has a "Version Progression" category that sweeps products across versions. Remove that category. Other categories that reference `version` in their product lookups should be simplified to just use the slug.

5. **Update `resources/workbench/src/types.ts`** if it has version-specific type definitions.

6. **Keep the `version` field on the product type and in the JSON schema.** It should still exist — it's just always `1` for now. The field is part of the product identity. When we actually decide a product needs a balance patch, we'll author a v2 for that specific product at that time.

7. **Update tests** (`resources/workbench/src/report.test.ts`) to remove any version-specific assertions.

## What NOT to do

- Don't remove the `version` field from the `Product` type or the JSON data. Every product still has `"version": 1`.
- Don't touch `resources/packages/formulas/` — the formulas package has no version logic, it just takes raw stats.
- Don't change the formulas types (`resources/packages/formulas/src/types.ts`) — these are the canonical game math spec and are version-agnostic.
- Don't update any docs — that's already done.

## Why

The pre-authored v2/v3 data was speculative balancing — guessing at what future patches might look like before anyone has played the game. The real balance changes will come from gameplay data, and they'll be targeted (one product at a time, whatever the fix requires), not systematic (every product gets three versions with formulaic nudges). The workbench should reflect the actual product landscape, not a hypothetical future one.
