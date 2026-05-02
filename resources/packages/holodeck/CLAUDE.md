# Holodeck

Design-time simulation engine and product catalog for Helm game mechanics. Consumed by `@helm/workbench`. Never imported by frontend code — when holodeck work produces reusable functions or types, they get extracted to `@helm/formulas` or `@helm/types`.

## Enums

Const-object + string-union pattern (matches `LinkRel` in `@helm/types`). Each mirrors a PHP backed enum in `src/Helm/ShipLink/`.

## Types

Simulation-oriented interfaces (`Loadout`, `ShipState`, `ShipAction`). These are NOT the REST API types from `@helm/types` — they represent resolved, point-in-time numeric state.

`CatalogProduct` extends `Product` with design-time fields (`draw`, `tuning`, `sensorDsp`, `driveDsp`) that live in the catalog JSON but not in the runtime Product table.

## Data

Hull and product data load from `tests/_data/catalog/` (shared with PHP). Holodeck provides typed access; the JSON is the source of truth.

-   `hulls.json` — hull definitions
-   `products/` — product catalog (core, drive, sensor, shield, nav, weapon, equipment)

## Tuning

Tuning is per-action, not ship state. Throttle (jump speed/cost) and effort (scan duration/chance) are method parameters on `PropulsionSystem` and `SensorSystem`. Shield priority is the one persistent tuning setting on the ship — it lives in `InternalShipState.shieldPriority` because it affects continuous regen.

## Pilot Skills

`PilotSkills` (from `@helm/formulas`) holds pre-computed multipliers (1.0→1.25) derived from player action counters. Lives on the WP user, survives ship loss. Stored in `InternalShipState.pilot` and exposed in `ShipState.pilot`.

Currently wired:

-   `scanning` → `SensorSystem.getScanSuccessChance()` (boosts scan success)
-   `jumping` → `NavigationSystem.getDiscoveryProbability()` (boosts discovery)

Other fields (trading, mining, salvaging, phasers, torpedoes) exist but aren't wired until those systems get formula support.

## Loadout Builder

`buildLoadout(hullSlug, componentSlugs?, equipmentSlugs?)` resolves catalog slugs into a holodeck `Loadout` with `InstalledComponent` wrappers. This is the entry point for creating ships from the product catalog.
