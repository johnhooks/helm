---
status: draft
area: navigation
priority: p1
---

# Base jump progress on start time

## Problem

Route jumps schedule each next leg from the time the previous leg is processed. If cron or Action Scheduler runs late, elapsed travel time is lost and the whole route takes longer than intended.

The current fix should not require draining multiple jump phases in one processor pass. A single claim may continue to resolve one route leg. The important timing bug is that the next leg's `deferred_until` is based on processing time instead of the route's planned timeline.

## Proposed solution

Keep route jump processing to one phase per claim for now. When a leg resolves, calculate the next leg's `deferred_until` from the scheduled completion time of the leg that just resolved, plus the next leg duration. Do not calculate it from `Date::now()`.

If processing runs late, the next `deferred_until` may already be in the past. That is acceptable. The normal ready-action claim path should pick up the next phase on a later processor pass without stretching the total route duration.

This task intentionally does not add drain-until-stable processing or move lifecycle ownership into the processor. Those are separate architecture questions.
