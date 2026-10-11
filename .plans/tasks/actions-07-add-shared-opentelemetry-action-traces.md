---
status: draft
area: dev
priority: p2
---

# Add shared OpenTelemetry traces for ship actions

## Problem

Ship actions execute across separate requests and worker runs, sometimes over
hours or days. Logs identify actions and cycles, but do not provide a shared
trace connecting initialization, later execution, retries, and final outcomes.
Understanding a slow or failed action requires manually joining those records.

Helm also needs a local environment for learning and exercising OpenTelemetry
with real asynchronous work, including correlated logs and execution timings.

## Proposed solution

Give each ship action a persistent OpenTelemetry trace context. Initialization
and subsequent execution spans share that trace ID across requests, worker
restarts, deferred checkpoints, and retries. Create a distinct span for each
execution and identify cycles or phases when applicable, including multiple
checkpoints processed during one overdue worker run. End spans when execution
finishes rather than keeping a span or process open while an action waits.

Keep propagation metadata private and separate from caller params and public
results. Store only the context needed to continue tracing, not span history or
diagnostic events. Expose the context through the diagnostic CLI resource so a
developer can locate an action's trace. A new action receives its own trace even
when it resumes earlier gameplay progress; link related actions where useful.
Initialize context safely for existing actions that have none.

Continue using the existing PSR logger and integrate Monolog with OpenTelemetry.
Logs emitted during execution should carry the active trace and span IDs, with
action ID, ship ID, action type, and cycle or phase as appropriate attributes.
Record execution duration, failures, retries, and outcomes. Keep scheduled wait
time and checkpoint lateness distinguishable from time spent executing work.
Restore tracing context after each execution so unrelated actions in the same
worker do not inherit one another's spans.

Provide an optional local OpenTelemetry Collector setup through Lando, with OTLP
export and inspectable output in the mounted, ignored logs directory. Document
how to enable it and follow an action through its spans and logs. Preserve
`HELM_LOG_LEVEL` as the logging flush threshold and verify that buffered records
retain the context from when they were emitted. Account for request shutdown so
completed spans and logs are exported without keeping workers alive indefinitely.

Validate that the selected collection and inspection setup can assemble spans
arriving hours or days apart under one trace ID. Document any storage or sampling
limits before relying on this view for long scans. Metrics and broad application
instrumentation are follow-up work.

Telemetry must not change action timing, resources, retries, or success when
disabled or when export fails. Keep tests and simulations isolated from network
export, using recording or no-op telemetry. Verify trace continuity across
separate executions, distinct span IDs for retries, context isolation between
actions, correlated log records, and behavior when the collector is unavailable.
