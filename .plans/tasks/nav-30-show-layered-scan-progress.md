---
status: draft
area: ui
priority: p2
depends_on:
    - nav-31-add-accumulated-route-scan-work
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

Use current discovery chance for the persistent layer, driven by accumulated
scan work. Label it as the chance of discovery on the next cycle, not as the
percentage of a route already discovered. Show how it builds toward the current
ceiling and drops when a discovery starts work on the next connection with a
lower ceiling. Read probability from the backend rather than calculating it in
the frontend.

Show the next cycle's resource cost alongside its discovery chance, with clear
resource names and units. Let players see when continued scanning has low odds
but still consumes core or power. Keep those values consistent with the scan
profile and current backend state. Do not imply that an unsuccessful cycle is
free or that continued scanning guarantees a discovery.

Explain unsuccessful cycles without presenting them as a failed action. Preserve
progress between cycles according to backend rules, and show a clear transition
when a waypoint is discovered and work starts on the next connection. Distinguish
completed, partial, and failed scans. Do not imply a guaranteed completion time
or expose private rolls, random thresholds, or internal cycle logs.

Offer a collapsed-by-default "Show scan history" graph alongside the compact
layered display. Plot discovery chance over completed cycles, mark discoveries,
and show the build-up and subsequent drops. Offer cumulative resource expenditure
as an overlay with a separate labeled scale and explicit resource units. Keep
resources with different units distinguishable. Use recorded public history,
not reconstructed private rolls. Clearly label any optional future projection
as an estimate. Keep history available after the scan ends and provide an
accessible text or table alternative.

Show that scans stop automatically when the next connection's attainable chance
is too low or the resource budget would be exceeded. Explain the server-reported
stop reason, preserve the discovered route in partial results, and distinguish
an automatic stop from failure or successful arrival. A low current chance just
after a discovery must not be presented as an automatic-stop trigger. Include the
stop point and reason in the history view.

## Backend prerequisites

Complete the accumulated-work backend task before implementing this display.
Provide a public action progress contract with cycle timing, cycle counts,
current discovery probability, next-cycle costs by resource, bounded public
history, and final stop reasons. Define how progress changes after an unsuccessful
cycle, a waypoint discovery, or a change in ship capability. Backend mechanics
and their balancing remain separate work.

## Verification

Cover the layered display with representative states for the first cycle,
repeated attempts, unsuccessful cycles, waypoint transitions, low-odds plateaus,
changing cycle costs, automatic stops, and final outcomes. Cover graph expansion,
discovery markers, expenditure scales, empty history, and retained partial routes.
Check that actual history and estimated projections remain clearly distinct.
Verify that reloads and delayed updates preserve server-reported progress and
that labels remain understandable with reduced motion and without color cues.

## Related work

- [Add accumulated work to route scans](nav-31-add-accumulated-route-scan-work.md)
  defines the backend model and simulator comparisons.

- [Add multiphase route scan](nav-21-add-multiphase-route-scan.md) defines the scan
  action lifecycle and private runtime state.
- [Show active scan lines](nav-16-show-active-scan-line.md) covers the starfield
  visualization of an active scan.
