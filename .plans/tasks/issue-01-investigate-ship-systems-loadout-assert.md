---
status: draft
area: ui
priority: p2
---

# Investigate ship systems loadout assert

## Problem

The bridge can throw `helm.ships.loadout_failed` from `ShipSystemsCard` when `getSystemStats()` calls the ship loadout selector. The wrapped cause is `helm.ships.missing_system`, which means the ships store had a systems array that did not include one of the required fitted slots: `core`, `drive`, `sensor`, `shield`, or `nav`.

This has been observed after ship systems were initially loaded, so the issue may not be a simple initial load failure. `RECEIVE_SHIP_STATE` should only replace the operational ship state and should not clear `systems.systems`. The systems slice is only replaced by `RECEIVE_SYSTEMS` from ship embeds or `FETCH_SYSTEMS_FINISHED` from the systems resolver. One of those paths may be replacing a complete loadout with an incomplete systems array, or the local ship/loadout data may already be incomplete.

A component-level error fallback can keep the bridge from crashing, but it does not solve the data integrity or store synchronization problem.

## Proposed solution

Investigate which store action causes the systems slice to become incomplete. Add temporary or structured debug logging around `RECEIVE_SYSTEMS` and `FETCH_SYSTEMS_FINISHED` that records the ship id, action type, and received system slots. Compare those logs with the `/helm/v1/ships/{id}?_embed[]=helm:systems` and `/helm/v1/ships/{id}/systems?_embed[]=helm:product` responses.

The outcome should identify whether the bug is incomplete local loadout data, an incomplete REST response, an embed/preload issue, or a frontend store replacement issue. Once the cause is known, fix it at the source so `getSystemStats()` only throws for genuinely invalid ship data.

Initial diagnostic logging has been added at the loadout assertion point. When required slots are missing, the client logs `ships.loadout.missing_system` with the missing slots, received slots, and received system ids. Use that log output to narrow the source before choosing a fix.

Keep any permanent UI fallback as a safety net only. Do not treat the fallback as the primary fix.
