---
status: active
area: navigation
priority: p2
---

# Add accumulated work to route scans

## Problem

Multiphase route scans have scheduled checkpoints, but direct connections bypass
success rolls and are discovered at the first checkpoint. The first-hop input
also guarantees success. The action lifecycle supports repeated attempts without
a discovery model that makes sustained scanning necessary.

Route exploration should usually take hours, approaching a day for long,
difficult scans with reference equipment. Completion times should vary without
routinely spreading across many additional hours. Ship equipment must preserve
the distinction between long-range route exploration and detailed system
surveying. Generic capability factors from the initial experiments do not yet
represent those equipment choices.

## Proposed solution

Implement accumulated scan work in the existing multiphase route action. Each
cycle attempts useful progress. Successful cycles add work based on ship
capability and unsuccessful cycles preserve accumulated work. Work raises the
chance of discovering the next connection toward an equipment- and
corridor-dependent ceiling, rather than guaranteeing discovery at a threshold.
After each discovery, reset connection work and lower the probability ceiling
for subsequent discoveries in the same scan. Direct corridors must pass through
this process too. Keep corridor topology deterministic and discovery timing
variable. Use the existing injectable random source for repeatable scenarios.

Keep work gained, useful-work success probability, discovery probability,
cycle duration, and resource cost distinct. Specify the order of work gains and
discovery rolls so the public probability describes the actual next attempt.
Use distance and corridor difficulty to determine work,
with documented contributions from sensors and navigation computers. Preserve
DSC's long-range exploration role, VRS's balanced role, and ACU's fast, detailed
system-survey role. Do not reuse survey-speed multipliers as route-speed bonuses
without explicitly evaluating their effect on these roles. Use actual catalog
products and ship systems rather than a single generic equipment multiplier.

Make cycle duration configurable through a ship-derived scan profile. Equipment
modifiers or a player-selected intensity at action creation should be possible
without redesigning the action. The player-facing intensity control can follow
later. Faster settings must consume more resources per unit of completed work,
not merely consume the same total amount sooner. Define which profile values
are captured at initiation and which respond to live ship changes, while
preserving correct checkpoint timing.

Settle the resource contract before selecting prices. Account for existing
regenerating ship power and the documented scan-wait-jump rhythm. If the first
implementation uses core consumption, document that interim choice and test
resource exhaustion explicitly. Charge unsuccessful attempts consistently with
the chosen model. A new capacitor system is outside this task.

Preserve accumulated work across checkpoints and reloads. A failed discovery
attempt must not erase work. Replace the existing random continuation stop with
continued attempts at diminishing discovery odds within a default automatic
stopping policy. After each discovery, evaluate the next connection's maximum
attainable discovery chance. Stop before another cycle if that ceiling falls
below a configurable usefulness threshold. Do not stop merely because current
chance is low immediately after work resets. Evaluate the initial connection
and relevant equipment changes consistently with this policy.

Add a default resource budget as a second stopping condition. Check the next
cycle's cost before charging or scheduling it, and stop before exceeding the
budget. Keep actual resource exhaustion and hard safety limits distinct from
policy stops. Determine default thresholds and budgets through simulation;
player-selected persistence policies can follow later.

When stopping short of the destination, finish as partial if any connections
were discovered and preserve their route. Define an explicit no-discovery final
outcome when nothing was found. Expose a stable stop reason with a translated
message, distinguishing low attainable chance, budget reached, resource
exhaustion, and safety limits. Successful arrival remains a completed scan.

Define depth reset rules so traveling along the discovered route and scanning
from a closer position restores useful prospects, without allowing a restart
at the same location to trivially bypass diminishing returns.

Compare connection-level work with total scan effort so waypoint segmentation
does not accidentally make equivalent journeys substantially cheaper. Update
the current 50-cycle ceiling to accommodate long scans.

Expose a public progress contract for cycle timing, current cycle number,
completed cycle count, accumulated work toward the current connection, current
discovery probability, and resource cost of the next cycle. Represent probability
as a value from zero to one and identify the attempt it describes. If work gains
occur before the discovery roll, expose the effective next-cycle chance including
that uncertainty rather than presenting one conditional chance as guaranteed.
Represent cost by resource with explicit units, such as core life or ship power,
so a future capacitor cost can be added without changing its meaning. Reflect
live modifiers or captured scan settings according to the adopted profile rules.
Chance and cost must use the same calculations as the resolver, update after
completed cycles and discoveries, and remain available through REST and abilities
without advancing the action or charging resources. Distinguish progress and
probability from completion of the entire route. Keep actual random rolls, future
topology, and internal cycle history private. Handle actions created with the
previous runtime-state format explicitly.

Provide a bounded public history for the optional scan graph. Record completed
cycle timestamps or indices, the discovery chance used for that attempt,
discovery markers, and actual cumulative expenditure by resource. Keep this
projection separate from private cycle logs and random rolls. Preserve it across
reloads and after termination, including the final stop reason. Keep completed
history distinct from the current next-attempt probability; any future
projections must be explicitly identified as estimates.

## Simulation and balancing

Run the production work model through the existing in-memory simulation and real
action processor. Share the model with the live resolver rather than maintaining
a separate approximation. Advance simulated time between checkpoints instead of
waiting for wall-clock time.

Provide a reproducible configuration matrix covering DSC, VRS, and ACU sensors,
multiple nav tiers and core or power configurations, short and long distances,
easy and difficult corridors, direct connections, and generated waypoint routes.
Include targets outside each loadout's effective range as rejected cases. Compare
multiple cycle durations and scan intensities, including low-resource scenarios.
Include deep discovery chains, low-probability plateaus, and scans resumed from
closer positions. Compare automatic-stop thresholds and budgets across these
configurations. Report stop reasons, useful discoveries, and resources spent
before stopping so the policy does not cut off viable scans too early. Quantify the wider timing spread introduced by discovery rolls
rather than assuming the initial guaranteed-threshold results still apply.

Run multiple random seeds for each configuration. Report cycle counts, elapsed
time, work and probability progression, cycle costs, completion or partial rates, and
resource exhaustion. Include medians, p10/p90, and p99 rather than only averages.
Provide machine-readable results and selected per-cycle traces for comparison.
Verify checkpoint-by-checkpoint processing and overdue catch-up agree under
identical equipment and random inputs.

Use the initial experiments as evidence, not fixed balance requirements. Their
75% successful-work model produced a narrow but visible spread, approximately
4.3 to 5.3 hours for the middle 80% of Lacaille-distance runs and 21.9 to 23.9 hours
for a difficult 6.5 ly fixture. Those figures used hypothetical capability and
cost inputs. Recalibrate against real equipment and explicitly state which
reference loadout should meet the hours-to-day target. Economy settings and
weaker equipment may take longer; report that tradeoff rather than hiding it.

## Verification and documentation

Cover unsuccessful cycles, progress persistence, direct and waypoint discoveries,
ship modifiers, configurable timing, resource charging and exhaustion, persisted
runtime state, repeatable seeds, and private-state exclusion from public output.
Verify that inspection does not advance the action and that reprocessing does
not double-charge resources or award duplicate progress. Verify chance builds
with work, its ceiling decreases with discovery depth, and public chance and
cycle costs agree with the next attempted cycle under the same state. Cover
ceiling-based stops after discoveries, low starting odds that must not trigger
a stop, exact budget boundaries, no-discovery termination, and retained partial
routes. Verify no extra cycle is charged after stopping, public history excludes
private data, and reloads or catch-up do not duplicate history entries.

Reconcile sensor, navigation, and system-scanning documentation with the adopted
model. Resolve the conflicting sensor ranges and describe the separate effects
of range, survey resolution, route work, navigation skill, and efficiency. Keep
system-survey implementation and the layered progress UI as follow-up work.

## Related work

- [Add multiphase route scan](nav-21-add-multiphase-route-scan.md) supplies the
  existing lifecycle and private state.
- [Show layered scan progress](nav-30-show-layered-scan-progress.md) consumes the
  public progress contract.
- Initial exploration lives in `experiments/scan-models/`, with assumptions and
  findings in `findings.txt`. Its costs and fixture topology are experimental.
