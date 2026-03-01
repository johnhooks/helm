# Holodeck

Design-time simulation engine for Helm game mechanics. Consumed by `@helm/workbench`. Never imported by frontend code — when holodeck work produces reusable functions or types, they get extracted to `@helm/formulas` or `@helm/types`.

## Enums

Const-object + string-union pattern (matches `LinkRel` in `@helm/types`). Each mirrors a PHP backed enum in `src/Helm/ShipLink/`.

## Types

Simulation-oriented interfaces (`SimLoadout`, `SimShipState`, `SimAction`). These are NOT the REST API types from `@helm/types` — they represent resolved, point-in-time numeric state.

## Data

Hull data loads from `tests/_data/catalog/hulls.json` (shared with PHP). Holodeck provides typed access; the JSON is the source of truth.
