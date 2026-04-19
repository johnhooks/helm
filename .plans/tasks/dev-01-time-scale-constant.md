---
status: draft
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
compresses the simulation's time axis by its factor. A value of 1 leaves
the game at production pace. A value of 1000 turns an hours-long scan into a
seconds-long one. The constant is read once at boot and has no effect when
undefined or set to 1.

Everything derived from time scales together so the simulation stays
internally consistent at accelerated rates:

- All ship action durations, scan and jump today and any future action
  handler, resolve in proportionally less real time.
- All timestamp-based ship state accumulates proportionally faster. This
  includes core recovery, power regen, and any cooldown whose progress is
  a function of elapsed time.
- Background processing cadence that drives action resolution runs at a
  matching higher frequency, so a scaled-down scan does not sit completed
  waiting for the next tick.
- The WordPress Heartbeat interval on the client polls at a matching faster
  cadence, so accelerated actions surface in the UI without artificial
  delay.

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
