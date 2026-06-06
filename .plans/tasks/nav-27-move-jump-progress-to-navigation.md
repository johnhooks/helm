---
status: draft
area: navigation
priority: p1
depends_on:
    - actions-03-standardize-multiphase-processing
---

# Move jump progress to navigation

## Problem

The jump resolver owns too much navigation behavior. It validates route edges, infers the current leg from action result shape, chooses the next node, mutates position, records phases, and schedules the next leg. That makes route jumping hard to reason about and duplicates responsibilities that belong to the ship navigation system.

## Proposed solution

Move route jump planning and progress decisions behind the ship navigation system. The resolver should become a thin action lifecycle adapter that asks navigation what jump phase is due, applies the resulting ship state and phase result, and records whether the route is complete or waiting for another phase.

Navigation should own route leg identity, current route position, next node selection, and phase result shape. Propulsion and power should continue to provide duration and core cost inputs.
