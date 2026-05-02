---
status: draft
area: dev
priority: p1
---

# Address security audit findings

## Problem

The security review identified several findings that still point at live PHP code, but those findings were sitting in a root-level artifact instead of the normal task board. The actionable work needs to be captured here so the artifact can be removed without losing the follow-up items.

The highest risk items are gameplay integrity and hardening problems rather than traditional web vulnerabilities. Examples include non-atomic discovery recording, REST callbacks with stale-read gaps, unbounded or weakly bounded request data, resolver fallbacks to user-controlled action params, and cleanup paths that can leave ships stuck on terminal actions.

## Proposed solution

Validate each finding against the current code and either fix it or explicitly close it as stale. Prioritize issues that can corrupt game state, grant duplicate rewards, expose undiscovered navigation data, or leave ships unable to act.

The first implementation pass should either address the compact hardening items directly or split accepted findings into focused follow-up tasks by area, such as discovery, REST, navigation, action resolution, and seed handling.

## Findings to follow up

### Discovery integrity

- `src/Helm/Discovery/DiscoveryService.php` checks whether a star has already been discovered before saving the new discovery. That first-discovery check and write are not atomic, so simultaneous arrivals can both be marked first. Fix with a transactional lock, a uniqueness constraint for first discovery, or an equivalent atomic write path.
- `src/Helm/Discovery/DiscoveryService.php` does not guard against the same ship recording the same star more than once. Add a ship/star uniqueness guard or a database constraint so repeated visits do not inflate discovery counts or known-space thresholds.

### REST and request validation

- `src/Helm/Rest/ShipActionsController.php::showById()` can still receive `null` from the repository if an action is deleted after the permission check. Match the sibling `show()` behavior and return a 404 instead of letting serialization throw.
- `src/Helm/Rest/ShipController.php::patch()` reads raw JSON body data with `get_json_params()`. Read registered fields through `get_param()` so REST schema validation remains the source of truth for patchable fields.
- `src/Helm/Rest/ShipActionsController.php` accepts arbitrary action `params` as an object. Add sanitization and shape limits so unexpected keys, large payloads, or deeply nested JSON cannot be persisted and rebroadcast.
- `src/Helm/Rest/NodesController.php` exposes all navigation nodes and coordinates to any authenticated user. Filter results to the requesting player's discovered graph, or explicitly restrict the endpoint if it is only meant for admin or development use.
- `src/Helm/Rest/NodesController.php` allows `per_page` up to 500. Lower the maximum, especially when embedded star data is requested, so one authenticated request cannot trigger an unnecessarily large query.

### Action resolution

- `src/Helm/ShipLink/Actions/Jump/Resolver.php` and `src/Helm/ShipLink/Actions/ScanRoute/Resolver.php` fall back to action params or current ship state when committed result keys are missing. Treat missing result keys as corruption and fail the action instead of deriving behavior from untrusted or time-shifted state.
- `src/Helm/ShipLink/ActionResolver.php` clears `current_action_id` after rollback on resolution failure. Make this cleanup observable and recoverable so a failed update cannot leave a ship permanently blocked by a terminal action.
- `src/Helm/ShipLink/WpdbShipStateRepository.php::lockForUpdate()` detects lock failures by searching for the word `lock` in the database error. Replace this with robust error handling that catches any failed lock query or uses database error codes.

### Navigation safety

- `src/Helm/Navigation/NavComputer.php::discoverPath()` can create waypoint nodes and edges in a loop without a hard hop limit. Add a safety cap to bound database writes even when bonus-hop rolls continue succeeding.
- `src/Helm/Navigation/NavigationService.php::scan()` builds `ScanInput` directly and bypasses the clamping behavior in `ScanInput::withStats()`. Use the clamping constructor path or move clamping into the raw constructor.
- `src/Helm/Navigation/NodeRepository.php`, `src/Helm/Navigation/EdgeRepository.php`, `src/Helm/Celestials/CelestialRepository.php`, and `src/Helm/ShipLink/WpdbShipStateRepository.php` use check-then-insert patterns that can race. Use transactions, insert-ignore/upsert behavior, or caught uniqueness violations that return the existing row.

### Heartbeat and broadcast history

- `src/Helm/ShipLink/ActionHeartbeat.php` accepts arbitrary datetime strings for `since`. Validate a strict timestamp format and handle parse failures so relative strings or malformed input cannot expand history reads or disrupt heartbeat responses.

### Seed handling

- `src/Helm/Origin/Origin.php` stores the master seed in plaintext WordPress options. Decide whether this is acceptable for the game threat model. If not, store it outside the database or encrypt it using server-local material.
- `src/Helm/CLI/StarCommand.php`, `src/Helm/CLI/OriginCommand.php`, and `src/Helm/Origin/SeededRandom.php` expose seed or RNG state through CLI output or public methods. Remove seed output that enables system previewing, stop printing master seed fragments, and restrict RNG state access if it is not required outside internals.

### View hardening

- `src/Helm/View/ViewRenderer.php` uses `extract($args)` before including view files. Use `EXTR_SKIP` to prevent future args from overwriting local variables such as the resolved file path.
- `src/Helm/View/ViewRenderer.php::getPath()` resolves view names but does not verify the resolved path stays inside the configured views directory. Add a containment check before including a file.
