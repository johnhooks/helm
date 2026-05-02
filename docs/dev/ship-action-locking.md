# Ship Action Locking

How ships prevent conflicting operations through explicit locks.

## Problem

Determining "can this ship do X right now?" requires scanning the `ship_actions` table for pending records. That's expensive and racy under concurrent requests. Locks should be cheap to check and atomic with the actions that create them.

## Design

Locks live in their own table, separate from ship state and ship actions.

```
ship_locks:
  id
  ship_id
  lock_type        // what this lock prevents
  lock_until       // expiry timestamp (release valve)
  action_id        // what created this lock (nullable — system locks have no parent)
  created_at
```

A ship can hold multiple locks simultaneously. Each lock gates a different capability.

### Lock Types

| Type           | Blocks                                       | Created by                  |
| -------------- | -------------------------------------------- | --------------------------- |
| `action_slot`  | Submitting new actions                       | Action handler on submit    |
| `passive_scan` | Passive scan batch processing                | Passive scan tick           |
| `global`       | Everything — actions, scans, incoming damage | Jump transit, system events |

New lock types can be added without schema changes. Future candidates: `weapons` (shared lock for phaser/torpedo), `fleet` (formation lock), action-type-specific locks for grouped abilities.

### Checking Locks

"Can I submit an action?" → `WHERE ship_id = ? AND lock_type IN ('action_slot', 'global') AND lock_until > NOW()`

"Should batch tick process this ship?" → `WHERE ship_id = ? AND lock_type IN ('passive_scan', 'global') AND lock_until > NOW()`

Single indexed query. No action table scan.

### Lifecycle

**Acquire:** The action handler creates the lock atomically with the action insert. Same transaction.

```
BEGIN
  INSERT ship_action (status: pending, deferred_until: ...)
  INSERT ship_lock (lock_type: action_slot, lock_until: deferred_until, action_id: ...)
COMMIT
```

**Release:** The resolver deletes the lock atomically with the action's terminal status transition. Same transaction.

```
BEGIN
  UPDATE ship_action SET status = 'fulfilled'
  DELETE ship_lock WHERE action_id = ? AND lock_type = 'action_slot'
COMMIT
```

For multi-phase actions, the resolve updates the lock's `lock_until` to the next phase's `deferred_until` rather than deleting it.

```
BEGIN
  UPDATE ship_action SET status = 'pending', deferred_until = <next phase>
  UPDATE ship_lock SET lock_until = <next phase> WHERE action_id = ?
COMMIT
```

**Expiry (release valve):** `lock_until` ensures locks can't strand a ship permanently. If a resolver crashes or a job fails, the lock expires naturally. Any check that reads an expired lock treats it as absent. A background sweep can clean up expired rows, but correctness doesn't depend on it.

### System Locks

Some locks aren't tied to an action:

-   **Global lock during jump transit:** Ship is between nodes. Nothing processes. Created by the jump resolver when the ship moves, expires when cooldown completes.
-   **Passive scan lock:** Prevents the batch tick from double-processing a ship mid-computation. Short-lived (seconds). Created and released by the tick itself.

These have `action_id = NULL`. They follow the same expiry rules.

## Passive Scan Scheduling

Passive scan timing lives on ship state, not the lock table:

```
ship state:
  passive_scan_interval: 300       // tunable frequency (seconds)
  passive_scan_last_at: 1709344200 // last completed scan timestamp
```

A single batch job runs on a fixed cadence (e.g. every 60s). It queries all ships where `NOW() - passive_scan_last_at >= passive_scan_interval` and no `passive_scan` or `global` lock exists. Processes them in batch. Updates `passive_scan_last_at`. Creates `passive_scan` ship_action records for any detections.

The batch tick acquires a short `passive_scan` lock per ship during processing to prevent overlapping ticks on the same ship.

## Relationship to Ship Actions

Locks and actions are related but independent:

-   **Actions** record what happened. History, results, timeline.
-   **Locks** record what's blocked right now. Operational state, cheap to query.

You don't derive locks from actions. You don't derive history from locks. Each serves its purpose. The `action_id` foreign key is for traceability, not for lock resolution.
