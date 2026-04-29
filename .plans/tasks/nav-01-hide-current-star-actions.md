---
status: done
area: navigation
priority: p1
---

# Suppress Navigation Actions on the Current Star's Context Menu

## Description

The star context menu currently offers **Scan Route** and **Jump** on every
star the player selects — including the star the ship is already at.
Neither action makes sense from the player's current location: scanning a
route from yourself to yourself is nonsensical, and the server jump
validator explicitly rejects a jump whose target equals the ship's current
node.

This is a pure UX bug today, not a correctness bug, because the server
would ultimately refuse the action. But the client does not stop the
player from drafting the invalid scan or jump, so the UI reads as "this
is a valid thing to do" right up until submit fails. That is exactly the
kind of false affordance the context menu should never present.

This task must land before the jump trigger is wired up (nav-02) and
before the visual indicators are added (nav-03, nav-04). Fixing it first
means the subsequent tasks can assume a clean contract: scan and jump
only appear when they mean something.

## Plan

The star context menu receives the selected star and already has enough
information, via its parent (the bridge route), to know the player's
current node. The menu's action list should be built so that the
navigation actions — Scan Route and Jump — are omitted entirely when the
selected star is the current node.

The preferred shape is for the bridge route to decide which actions
belong on the menu and pass only those in, rather than the menu component
learning about the concept of "current star." This keeps the menu
presentational and lets future actions (e.g. dock, disembark, scan local
system) be added per-star-type without the menu growing special cases.

If the result is an empty action list, the menu should still render the
star's name and spectral class header — the info panel remains useful
even when there is nothing to do. An empty-action menu must not render a
confusing empty action region or a lone divider.

## Requirements

- When the selected star is the player's current node, the context menu
  must not show a **Scan Route** action.
- When the selected star is the player's current node, the context menu
  must not show a **Jump** action.
- The star's name and subtitle (spectral class) must still appear so the
  menu continues to function as an info readout for the current star.
- The menu's rendering must not show empty action slots, stray dividers,
  or visual artifacts when the action list is empty.
- The change must not introduce any regression when the selected star is
  any other star — all current scan behavior stays intact there.
- No server or contract changes.
