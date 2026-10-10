---
status: draft
area: ui
priority: p2
---

# Show layered scan progress

## Problem

A route scan can run through repeated cycles before discovering a connection.
Players need to distinguish the time remaining in the current attempt from the
benefit of continuing the scan. A single timer does not communicate accumulated
progress or explain how ship capability affects the number of cycles required.

## Proposed solution

Show two overlapping progress bars in the active scan display. One layer shows
elapsed time within the current cycle and resets when the next cycle begins.
The other shows the persistent scan measure supplied by the backend, allowing
players to see what carries forward between attempts. Make the layers visually
distinct and provide text labels so their meaning does not depend on color.

Show the current cycle number and completed cycle count. Derive cycle timing
from server timestamps and reconcile the display with authoritative action
updates after reconnects, reloads, or overdue checkpoint processing. A timer
reaching its end must not imply that discovery has succeeded before the server
reports the outcome.

The backend model is still being developed. One candidate makes each cycle an
attempt to gain useful scan progress. Successful cycles add progress according
to ship capability, while unsuccessful cycles add little or none. Accumulated
progress eventually reveals the next connection. An alternative uses an
increasing discovery probability across attempts. Capture the layered display
concept without choosing either probability formula in this UI task.

Label the persistent layer according to the final backend contract. If it shows
accumulated progress, identify which connection that progress applies to. If it
shows probability, label it as the chance of success on the next attempt and
never present it as a percentage of the route already discovered. Reflect
ship-dependent gains or probabilities using server-provided values rather than
reimplementing the scan model in the frontend.

Explain unsuccessful cycles without presenting them as a failed action. Preserve
progress between cycles according to backend rules, and show a clear transition
when a waypoint is discovered and work starts on the next connection. Distinguish
completed, partial, and failed scans. Do not imply a guaranteed completion time
or expose private rolls, random thresholds, or internal cycle logs.

## Backend prerequisites

Settle the scan progress model before marking this task ready. Provide a public
action progress contract with cycle timing, cycle counts, and the persistent
measure and its meaning. Define how progress changes after an unsuccessful
cycle, a waypoint discovery, or a change in ship capability. Backend mechanics
and their balancing remain separate work.

## Verification

Cover the layered display with representative states for the first cycle,
repeated attempts, unsuccessful cycles, waypoint transitions, and final outcomes.
Verify that reloads and delayed updates preserve server-reported progress and
that labels remain understandable with reduced motion and without color cues.

## Related work

- [Add multiphase route scan](nav-21-add-multiphase-route-scan.md) defines the scan
  action lifecycle and private runtime state.
- [Show active scan lines](nav-16-show-active-scan-line.md) covers the starfield
  visualization of an active scan.
