# Route scan work

Route scans use accumulated work. The waypoint generator is unchanged.

`ScanRoute\Rules` defines work, probability, cycle costs, and stopping conditions.
`RuntimeState` holds captured operating values and changing execution state.
`Params` holds scan intent and origin context. `Handler` initializes runtime state,
and `Resolver` applies resource and discovery changes, records
progress, and schedules the next checkpoint. Other
actions can use their own namespaced `Rules` class when cycle or phase logic
warrants extraction; they do not need to share the route scan formulas.

Fixed operating values are typed properties on `RuntimeState`: cycle seconds, core cost
and budget, work gain, navigation skill, sensor range and quality, initial distance,
minimum discovery ceiling, and maximum cycles. Initialization calculates these
from the ship and rules; callers cannot supply them through params. Resumed actions
capture new operating values while retaining accumulated work and discoveries.

## Work and probability

Equipment performance is captured at launch. A cycle first rolls for useful work,
then independently rolls for discovery using the resulting accumulated work.
Neither missed work nor missed discovery erases previous work.

- Work gained is navigation skill divided by 0.6.
- Useful-work probability is capped at 95% and equals
  `0.65 + 0.2 * (1 - remaining_distance / sensor_range) + 0.1 * sensor_accuracy`.
  The distance ratio is clamped to at most one.
- Required work is `12 + 7.5 * connection_distance * sqrt(initial_distance) *
  (1 + 0.4 * corridor_difficulty)`. Each connection pays a setup cost; the original
  distance scale persists across waypoints rather than granting a convex distance
  discount for subdividing the route.
- The probability ceiling is
  `min(0.9, (0.55 + 0.3 * skill) * (1 - 0.2 * difficulty)) * 0.65^depth`.
- Discovery chance is `ceiling * min(1, (work / required_work)^12)`.

The steep ramp limits early lucky discoveries and keeps timing variation modest.
Reaching required work reaches the ceiling, not guaranteed discovery. Discovery
resets work and increments depth. Direct connections use the same work process.
All coefficients are initial balance values, not physical constants.

## Timing and costs

Normal cycle duration is `ceil(300 * 0.7 / nav_efficiency)` seconds. Economy uses
twice that underlying duration and fast uses half, rounded once to full seconds.
Cycle timestamps are anchored to launch, so delayed processing does not stretch
the schedule. Captured operating values are immutable during an action, while actual core
availability remains live. Future equipment changes take effect on the next scan.

Core cost is one per attempted economy or normal cycle, two per fast cycle.
Economy currently saves core per hour but not per unit of completed work. Fast
scanning costs twice as much per attempt, even when the attempt makes no progress.
This core-only pricing is interim. Regenerating ship power exists but is not
charged by this route action, and no capacitor has been introduced.

At launch a scan reserves a spending limit, not inventory, of the smaller of 400
core or 60% of available core. It checks the next charge against that budget and
actual resources. A 720-cycle safety limit bounds processing.

The action stops automatically when the next connection's ceiling is below 12%,
not when its initial chance is low. It also stops before a charge would exceed
its budget or available core. Discovered routes are retained as partial results.
A stopped action with no discoveries is fulfilled with an empty route and an
explicit stop reason; it must not be interpreted as reaching the destination.

Restarting the same ship/origin/target retains depth, source, and work from the
latest action, and starts a fresh per-action spending budget. Traveling
to a different origin starts a fresh search. Retention currently depends on action
history; deleting old action records also removes this resume memory. Player
intensity controls are not yet added to the UI or live scan ability. The backend
accepts `intensity` as economy, normal, or fast at action creation.

## Public progress

The action resource calculates `result.progress` when read; it is not persisted.
It includes completed cycles, cycle duration, discovery depth,
accumulated work, next-cycle discovery chance, maximum chance, next-cycle cost,
spend, budget, and stop reason/message. Resource amounts are keyed by `core_life`.
The action's `deferred_until` gives the next checkpoint timestamp.

The advertised next-cycle chance marginalizes over the useful-work roll. It is
not the conditional probability assuming work succeeds, and is not route percent
complete. Completed actions have null next-cycle chance and zero next-cycle cost.

Stop outcomes are stored in `result.stop_reason`. The resource presents them
under `result.progress`; `runtime_state` contains operating values and execution bookkeeping.
Per-cycle diagnostics are logged, not stored in either action field. Public
results retain discovered routes and connection phases, not unsuccessful attempts.
Reading an action does not process cycles or charge resources.

## Diagnostic logging

Services use `Psr\Log\LoggerInterface`, backed by Monolog. Its
`PsrLogMessageProcessor` interpolates message placeholders while retaining
structured context. JSON logs format each context field on its own line.
Context contains action and ship IDs plus the values relevant to that event.
Cycle diagnostics retain work, discovery chance, discoveries, and cumulative
cost; full parameter dumps and raw random rolls are omitted.
Queue creation and final outcomes are logged at info, cycles and scheduling at
debug, scan stops at warning, and unexpected processing exceptions at error with
stack traces. Resolver diagnostics describe attempted work inside a transaction;
`action.finished` records an outcome after resolution returns successfully.

Local logs go to `tmp/logs/helm-YYYY-MM-DD.log`, also mounted at `/var/log/helm`
in Lando. Each event is one JSON line, including its context and exception details.
Rotation retains seven daily files. Configuration:

- `HELM_LOG_DIR`: output directory; local defaults to `tmp/logs`, otherwise stderr.
- `HELM_LOG_LEVEL`: level that flushes the buffer; defaults to `warning`.
  Lando sets `debug` to write all records immediately.
- `HELM_LOG_BUFFER_SIZE`: retained records before activation; defaults to 200,
  bounded to 1–10,000. Oldest records are dropped when full.

The fingers-crossed handler buffers lower-level records until a trigger arrives,
then writes the retained context and subsequent records. Set `HELM_LOG_LEVEL=debug`
to write all records immediately. Untriggered records are dropped
at request/process end. The buffer does not span WordPress requests, so a failure
in a later cron run cannot recover prior cycles; use immediate debug logging when
investigating a scan over time. Simulation recording remains separate and immediate.

Expected rejection catches log concise reasons; unexpected failures include an
exception and stack trace. API, action execution, batch generation, and CLI catches
are covered. Transaction/view cleanup rethrows and optional DI fallback catches
are left to their callers rather than logging another copy there.
Logging output failures do not fail game execution. Logs are diagnostic output,
never action input or public API data.

## Simulation

`ScanRunner` creates a detached container with memory repositories, seeded random
rolls, a non-persisted Origin, and a no-op event dispatcher. It restores the clock
on success or failure and runs the production action factory and processor.
WordPress transaction wrappers may execute, but no game rows or options are written.

Run a configuration matrix with:

```sh
lando wp eval-file bin/simulate-route-scans.php
```

The `helm/simulate-scan` ability exposes the same runner through REST and MCP to
local administrators. It accepts catalog sensor/core slugs, nav tier, core life,
power mode, distance, intensity, seed, and 1 to 30 trials. Each trial is bounded
by the normal scan policies. It returns per-trial outcomes, duration percentiles,
and the first trial's diagnostic trace in `history`. The trace is collected
from an in-memory logger; it is never persisted in action records. Other trials
use a null logger. Percentiles include partial and stopped outcomes;
inspect completion counts when comparing builds. Out-of-range attempts are
reported as rejected, not as failed discoveries.

One seed fixes a generated corridor, while trial index changes discovery rolls.
Use several seeds to compare corridor topology as well as random timing. The
simulation uses catalog definitions and does not accept live ship IDs. Its
explicit core-life fixture can differ from a product's starting life.
