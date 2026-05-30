---
status: ready
area: dev
priority: p2
---

# Add action prune command

## Problem

Ship actions are stored as both queue records and player-facing action history.
The REST API already paginates action history, but there is no WP-CLI command to
prune old completed action rows. Local development data can accumulate stale
actions, and production-like environments need an explicit maintenance command
before action history grows without bounds.

The repository already exposes `deleteOldCompleted()`, but it is not reachable
from WP-CLI. Developers currently have to run SQL by hand, which is error-prone
when ships may still reference active actions through `current_action_id`.

## Proposed solution

Add a `wp helm action prune` command. The command should prune completed actions
older than a configurable number of days, defaulting to 30 days. It should use
the existing action repository cleanup method for now and report how many rows
were deleted.

This command is a simple maintenance tool, not the final production-scale action
history strategy. Add an implementation comment near the prune path explaining
that repository deletion is acceptable for the current small table, but not the
long-term production approach. The comment should point future implementers to
`docs/plans/queue.md` and its table partitioning section, where the intended
production model uses date partitions and drops old partitions instead of
issuing large deletes.

The prune command should only delete final action states. It must not delete
pending or running actions, and it should not clear `current_action_id`. A
separate local reset command can be considered later if we want a developer-only
way to wipe all action rows and reset ship state.

## Requirements

-   Add `wp helm action prune`.
-   Support an optional `--days=<number>` argument.
-   Default `--days` to 30.
-   Reject non-positive `--days` values.
-   Prune only completed action states through `ActionRepository::deleteOldCompleted()`.
-   Report the number of deleted action rows.
-   Add a code comment that this delete-based implementation is not the
    production-scale strategy.
-   Link or refer to `docs/plans/queue.md` for the intended partition-based
    cleanup approach.
-   Tests cover the default retention window, a custom retention window,
    invalid `--days`, and preservation of pending or running actions.
