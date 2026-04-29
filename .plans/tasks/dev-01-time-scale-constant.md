---
status: ready
area: dev
priority: p2
---

# Add a time-scale constant for manual testing

## Problem

Exercising the game end to end is currently impractical. A scan takes hours,
a jump takes days, and every ship state read derives from elapsed real-world
time. Manually running a scan, discovering a route, drafting a jump, and
landing at the destination costs a full day of calendar time, which is far
too long for routine development and playtesting. The slow-game loop is a
design pillar in production but a friction wall in local development.

## Proposed solution

Introduce a single `HELM_TIME_SCALE` constant set in `wp-config.php` that
compresses generated future timestamps by its factor. A value of 1 leaves the
game at production pace. A value of 1000 turns an hours-long scan into a
seconds-long wall-clock wait. The constant is read once at boot and has no
effect when undefined or set to 1.

The important distinction is game time versus wall time. Game durations,
costs, efficiencies, distances, and displayed action durations remain in game
seconds. Helm only scales the wall-clock timestamps it creates for future
completion or recovery points.

That means `Date::now()`, SQL `NOW()`, WordPress cron, Action Scheduler, and
WordPress Heartbeat all continue to operate on normal wall-clock time. In dev
mode, a normal Heartbeat poll simply observes more game progress than it would
at production pace.

Constraints:

- Configuration lives only in `wp-config.php`. No admin UI, no Origin
  setting, no per-user override. A prod environment that never defines the
  constant simply runs at production pace.
- Scaling applies uniformly across the codebase. Individual actions,
  systems, or tick loops do not get to opt out.
- Non-time game math is untouched. Costs, efficiencies, distances, skill
  values, and anything else that is not a duration or a rate reads the
  same at every scale.
- The WPUnit and Vitest suites continue to run at real-time math by
  default, so the constant cannot skew test behavior.

## Implementation details

Add a small time-scale helper in PHP, likely `Helm\Lib\TimeScale`, instead of
spreading constant reads throughout the codebase. The helper should normalize
the configured factor and expose operations for converting game seconds into
wall-clock seconds:

```php
TimeScale::factor(): int;
TimeScale::isEnabled(): bool;
TimeScale::toWallSeconds(int $gameSeconds): int;
TimeScale::addScaledSeconds(DateTimeImmutable $now, int $gameSeconds): DateTimeImmutable;
```

Invalid values, undefined values, and values less than or equal to 1 all behave
as factor 1. Scaled durations are rounded up and clamped to a minimum of one
wall-clock second so a non-zero duration never resolves at the exact creation
instant.

Action handlers keep calculating and storing game durations exactly as they do
today. Only the generated `deferred_until` timestamp is scaled:

```php
$durationSeconds = $ship->propulsion()->getJumpDuration($distance);
$action->result['duration'] = $durationSeconds;
$action->deferred_until = TimeScale::addScaledSeconds(Date::now(), $durationSeconds);
```

The same pattern applies to timestamp-based regeneration. Power and shields
continue to expose the same current-value APIs, but when a new `power_full_at`
or `shields_full_at` value is calculated from a game duration, the future
timestamp is scaled before it is stored.

Do not make `Date::now()` return accelerated time. Keeping "now" as wall time
avoids conflicts with SQL readiness queries, Action Scheduler, REST timestamps,
Heartbeat cursors, and WordPress internals.

Do not linearly scale the recurring action-processor interval. Keep the
existing recurring sweep as a fallback. To avoid waiting up to the normal sweep
interval after a scaled action becomes ready, action creation should also
schedule a one-off Action Scheduler job for the action's `deferred_until`
timestamp using the existing processor hook. The processor still claims ready
actions in batches, so duplicate due jobs remain harmless.

The client Heartbeat interval stays unchanged. Accelerated actions may appear
in chunkier wall-clock updates during development, but polling frequency should
not scale with `HELM_TIME_SCALE`.

## Requirements

- `HELM_TIME_SCALE` is read from `wp-config.php`; when undefined, invalid, or
  less than or equal to 1, Helm behaves exactly as it does today.
- A valid scale factor greater than 1 converts generated future timestamps from
  game seconds to wall-clock seconds using `ceil(game_seconds / factor)`, with
  a minimum of one wall-clock second for any non-zero duration.
- `Date::now()`, SQL `NOW()`, Action Scheduler, WordPress cron, and WordPress
  Heartbeat remain wall-clock based.
- Scan and jump action results continue to store their `duration` fields in
  unscaled game seconds.
- Scan and jump action `deferred_until` timestamps are scaled wall-clock
  timestamps.
- Power and shield recovery timestamps are scaled wall-clock timestamps when
  new `power_full_at` or `shields_full_at` values are calculated.
- Non-time gameplay values are not scaled. This includes costs, distances,
  efficiency, skill, power capacity, shield capacity, resource quantities, and
  core life consumption.
- WordPress Heartbeat cadence is unchanged by `HELM_TIME_SCALE`.
- The recurring action-processor cadence is not linearly scaled by
  `HELM_TIME_SCALE`; due-time one-off processor jobs may be scheduled for new
  actions, with the recurring sweep retained as a fallback.
- WPUnit tests cover time-scale normalization, scaled-second conversion,
  minimum-duration clamping, scan and jump `deferred_until` scaling, and power
  and shield recovery timestamp scaling.
- Existing tests run at factor 1 unless they explicitly define or exercise
  `HELM_TIME_SCALE`.
