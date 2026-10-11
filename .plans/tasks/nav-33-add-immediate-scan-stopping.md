---
status: draft
area: navigation
priority: p2
---

# Add immediate route scan stopping

## Problem

The active scan card shows a Cancel button that does nothing. Players cannot
stop spending resources once a scan starts, even when its discoveries are
sufficient or its remaining prospects are poor. Canceling a draft only clears
local intent and does not address a running action.

## Proposed solution

Add a shared action cancellation API, proposed as
`POST /helm/v1/actions/{actionId}/cancel`. Authorize ownership through the
existing action permissions and delegate cancellation to behavior owned by the
action type. The endpoint must not impose immediate termination on every action.
The End route task uses the same entry point for deferred stopping.

Return the updated public action with enough information to distinguish a
completed cancellation from an accepted request that remains pending. Keep
internal coordination in runtime state and expose only the cancellation state
and outcome needed by clients. Use stable error codes and translated player
messages for unsupported actions or rejected requests. Repeated requests must
be safe and must not repeat costs, discoveries, or completion events. Requests
for an already finished action must not rewrite its outcome.

For route scans, stop immediately once the request is accepted. Do not wait for
the next scheduled cycle, roll another discovery, or charge another cycle.
Retain discovered nodes and edges and resources already spent. Record an
explicit player-stopped outcome, clear future processing, and release the
ship's action slot. Preserve the ability to start a new scan using existing
discoveries without silently resuming the canceled action's accumulated work.

Coordinate cancellation with the existing processing claim and transaction
rules. A worker already holding the action must not overwrite the stop or
continue charging after cancellation takes effect. Define how due checkpoints
and an in-flight worker are ordered against the request, without claiming
immediate success before the stop is effective.

Use **Stop scan** on the active card. Show a request-in-progress state, prevent
duplicate submissions, and render the stopped result when confirmed. Display
request errors without implying that scanning has stopped. Update other open
clients through the existing action and ship update mechanism. The stopped card
retains its discoveries and no longer displays an active countdown.

Cover ownership, unsupported action types, pending and running scans, repeated
requests, already finished actions, and cancellation racing a worker. Simulator
coverage must show no additional cycle costs or discoveries after stopping.
Add card tests and stories for submitting, stopped with and without discoveries,
and request failure. Do not implement mid-jump abort behavior in this task.
