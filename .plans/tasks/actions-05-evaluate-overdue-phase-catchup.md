---
status: draft
area: dev
priority: p2
---

# Evaluate overdue phase catchup

## Problem

The near-term route jump timing fix may keep one phase per processor claim and anchor each next `deferred_until` to the planned timeline. That avoids stretching action duration, but it does not immediately catch up multiple overdue phases in one processor pass.

This may be acceptable if the processor runs often. It may feel wrong if a player returns after a long delay and watches an already-overdue route advance one leg at a time.

## Proposed solution

Evaluate whether overdue multiphase actions should drain multiple due phases in one processing pass, or whether one phase per claim is the right tradeoff for now.

Keep this decision separate from the timing fix. The timing fix should preserve planned due times either way. This task should decide whether the remaining catchup lag is acceptable, and what processor, lock, and transaction ownership changes would be required if it is not.
