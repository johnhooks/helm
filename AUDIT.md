# Security Audit

**Date:** 2026-02-25
**Scope:** Full plugin — PHP (src/), JS/TS (resources/packages/), views, REST API, admin, CLI
**Branch:** `astrometric` (cd58263)

## Summary

The plugin has a strong web security posture. SQL injection, XSS, CSRF, IDOR, and authentication are all handled correctly — no vulnerabilities were found in any traditional web security category. The findings below are game logic race conditions, defensive gaps, and hardening opportunities.

## Critical

### 1. Race condition on first discovery (TOCTOU)

**File:** `src/Helm/Discovery/DiscoveryService.php:34-45`

The `isDiscovered()` check and the `save()` are not atomic. If two ships arrive at an undiscovered star simultaneously, both see `isFirst = true` and both are recorded as the first discoverer.

```php
$isFirst = ! $this->isDiscovered($starId);  // CHECK
// ...gap...
return $this->repository->save($discovery);  // WRITE
```

If first discovery confers gameplay rewards (credits, naming rights, leaderboard placement), this is exploitable by coordinating two ships.

**Fix:** Wrap in a transaction with `SELECT ... FOR UPDATE` on the star_id, or add a unique partial index on `(star_id)` where `is_first = 1` and handle the constraint violation.

## Medium

### 2. Missing null guard in `showById()`

**File:** `src/Helm/Rest/ShipActionsController.php:279-284`

The `actionPermissions` callback checks for null at line 166, so `showById()` only runs when the action was previously found. However, there is a TOCTOU gap: if the action is deleted between the permission check and the callback, `find()` returns null and `serializeAction(Action $action)` throws a `TypeError` (strict_types), resulting in a 500 error.

```php
public function showById(WP_REST_Request $request): WP_REST_Response
{
    $action = $this->actionRepository->find((int) $request->get_param('actionId'));
    // $action could be null here — serializeAction() will TypeError
    return new WP_REST_Response($this->serializeAction($action));
}
```

The sibling method `show()` at line 255 handles this correctly. `showById()` should match that pattern:

```php
if ($action === null) {
    return new WP_Error('helm.action.not_found', __('Action not found.', 'helm'), ['status' => 404]);
}
```

### 3. PATCH bypasses registered arg validation

**File:** `src/Helm/Rest/ShipController.php:142`

The `patch()` method reads body data via `$request->get_json_params()` instead of `$request->get_param('power_mode')`. This bypasses the registered `enum` constraint at line 62. The `PowerMode::fromSlug()` check at line 176 provides secondary validation so the bypass is not directly exploitable, but this is fragile: future patchable fields with `validate_callback` would also be bypassed.

```php
$body = $request->get_json_params(); // bypasses schema validation
```

**Fix:** Read individual params via `$request->get_param()` which runs through the registered schema pipeline.

### 4. Resolver fallback to untrusted params

**Files:** `src/Helm/ShipLink/Actions/Jump/Resolver.php:22-24`, `src/Helm/ShipLink/Actions/ScanRoute/Resolver.php:30-34`

Both resolvers fall back to `$action->params` (user input) or live ship state when `$action->result` keys are missing. The `result` values are calculated by the Handler at creation time and represent the validated, committed values. If they are absent (corruption, manual DB edit), the fallback could produce incorrect game behavior — e.g., `core_cost` defaults to `0.0` (free jump), or the scan runs with current ship stats instead of creation-time stats.

```php
$targetNodeId = $result['to_node_id'] ?? $action->get('target_node_id');
$coreCost = $result['core_cost'] ?? 0.0;
```

**Fix:** Throw an `ActionException` if required result keys are missing. The handler already calculated these values; their absence indicates corruption.

### 5. Permanent ship block on cleanup failure

**File:** `src/Helm/ShipLink/ActionResolver.php:107-116`

If action resolution fails and `Transaction::rollback()` runs, the catch block calls `$this->fail()` and `$this->stateRepository->updateCurrentAction($action->ship_post_id, null)` outside the transaction. If the `updateCurrentAction()` call fails silently, the ship retains a `current_action_id` pointing to a failed action, permanently blocking new actions.

```php
} catch (\Throwable $e) {
    Transaction::rollback();
    $error = new ActionException(...);
    $this->fail($actionId, $error);
    $this->stateRepository->updateCurrentAction($action->ship_post_id, null);
    // ^ if this fails, ship is stuck forever
    throw $error;
}
```

**Fix:** Check the return value of `updateCurrentAction()` and retry, or add a CLI/admin command to unstick ships. Consider also having `ActionFactory::create()` clear stale `current_action_id` references to terminal-status actions.

### 6. No hop limit in `discoverPath()`

**File:** `src/Helm/Navigation/NavComputer.php:118-148`

The `while` loop creates database rows per hop (nodes and edges) with no maximum iteration count. For very distant targets where `rollBonusHop()` keeps succeeding, this could generate unbounded database writes within a single request.

```php
while ($currentNode->id !== $targetNode->id) {
    // ... creates waypoint node + edge per iteration
    $hopIndex++;
    if (!$this->rollBonusHop($input, $hopIndex)) {
        return ScanResult::success($discoveredNodes, $discoveredEdges, complete: false);
    }
}
```

The exponential decay (`0.85^hopIndex`) makes long runs unlikely but not impossible. A safety valve prevents worst-case behavior.

**Fix:** Add a maximum hop count (e.g., `if ($hopIndex >= 20) break;`).

### 7. No sanitize_callback on action `params`

**File:** `src/Helm/Rest/ShipActionsController.php:79-83`

The `params` argument on `POST /ships/{id}/actions` accepts an arbitrary JSON object with no size, depth, or key validation at the REST layer:

```php
'params' => [
    'required' => false,
    'type'     => 'object',
    'default'  => [],
],
```

Action validators check for expected keys (`target_node_id`, etc.), but unexpected keys pass through to the database and are echoed in REST responses and heartbeat broadcasts. A client could store arbitrarily large or deeply nested JSON.

**Fix:** Add a `sanitize_callback` that strips unknown keys per action type and caps size. Define per-action-type JSON schemas with `additionalProperties: false`.

## Low

### 8. Heartbeat `since` accepts arbitrary datetime strings

**File:** `src/Helm/ShipLink/ActionHeartbeat.php:46-47`

The `since` parameter from the heartbeat payload is passed directly to `Date::fromString()` which calls `new DateTimeImmutable()`. PHP's constructor accepts relative expressions like `"-10 years"`, allowing a client to retrieve the entire action broadcast history. If a malformed string is passed, the constructor throws an exception that could disrupt the heartbeat response for all plugins.

```php
$since = Date::fromString($sinceString); // no format validation, no try-catch
```

**Fix:** Validate against a strict ISO 8601 format and wrap in try-catch with fallback.

### 9. Nodes endpoint exposes entire navigation graph

**File:** `src/Helm/Rest/NodesController.php:109-120`

Any authenticated user can browse all navigation nodes and their 3D coordinates regardless of discovery status. A player could scrape the entire graph and calculate optimal routes offline, bypassing scan/discovery gameplay.

**Fix:** Filter to only return nodes the requesting player has discovered, or restrict to admin use.

### 10. Duplicate discovery records per ship

**File:** `src/Helm/Discovery/DiscoveryService.php:32-45`

The `record()` method does not call `hasShipDiscovered()` before inserting. The same ship visiting the same star creates duplicate records, inflating `getDiscoveryCount()` and potentially `isKnownSpace()` thresholds. (Separate from the `isFirst` TOCTOU in #1 — this is a missing uniqueness guard.)

**Fix:** Add a `hasShipDiscovered()` guard before insertion, or add a unique constraint on `(ship_id, star_id)`.

### 11. Unclamped scan values via raw constructor

**File:** `src/Helm/Navigation/NavigationService.php:89-95`

`NavigationService::scan()` uses the raw `ScanInput` constructor instead of `ScanInput::withStats()`, bypassing value clamping. If `skill` or `efficiency` ever exceed 1.0 (stacking bonuses, corrupted product data), scan probability math could behave unexpectedly.

**Fix:** Use `ScanInput::withStats()` or add clamping to the constructor.

### 12. `lockForUpdate` error detection is fragile

**File:** `src/Helm/ShipLink/ShipStateRepository.php:292`

Lock failure detection relies on `str_contains($error, 'lock')` in the MySQL error message. This is locale-dependent and version-dependent. Non-lock errors (e.g., table not found) would pass through silently.

```php
if ($error !== '' && str_contains($error, 'lock')) {
```

**Fix:** Check `$wpdb->last_error !== ''` as a blanket failure, or use MySQL error codes (1205, 3572).

### 13. Master seed stored in plaintext in `wp_options`

**File:** `src/Helm/Origin/Origin.php:117`

The master seed — the root secret for all procedural generation — is stored unencrypted in `wp_options`. Any WordPress user or plugin with database read access can retrieve it with `get_option('helm_origin')`, compromising all deterministic generation (resource locations, system contents, etc.).

**Fix:** Encrypt at rest using `wp_salt()`, or store as a server environment variable outside the DB.

### 14. Seed/state leaks in CLI output

**Files:** `src/Helm/CLI/StarCommand.php:237`, `src/Helm/CLI/OriginCommand.php:69`, `src/Helm/Origin/SeededRandom.php:122`

- `wp helm star generate --dry-run` outputs the per-system seed, allowing preview of any star system's contents.
- `wp helm origin init` prints the first 16 hex characters of the master seed to the terminal.
- `SeededRandom::getState()` is public and returns the full internal RNG state.

**Fix:** Remove seed from dry-run output. Stop printing any portion of the master seed on init. Restrict `getState()` visibility or mark `@internal`.

### 15. Race conditions in check-then-insert patterns

**Files:** `src/Helm/Navigation/NodeRepository.php:248`, `src/Helm/Navigation/EdgeRepository.php:145`, `src/Helm/Celestials/CelestialRepository.php:99`, `src/Helm/ShipLink/ShipStateRepository.php:65`

Four repositories use a check-then-insert pattern without wrapping in a transaction. UNIQUE constraints prevent duplicate data, but the insert failure path is not handled gracefully — could produce PHP errors on concurrent requests.

**Fix:** Wrap in transactions, use `INSERT ... ON DUPLICATE KEY UPDATE` / `INSERT IGNORE`, or catch the constraint violation and return the existing row.

## Hardening Recommendations

These are not exploitable in the current codebase but would improve defense-in-depth.

### 16. Use `EXTR_SKIP` in ViewRenderer

**File:** `src/Helm/View/ViewRenderer.php:55`

`extract($args)` runs before `include $file` on line 57. If a caller ever passed an `$args` array with a `file` key, it would overwrite the resolved include path. All current callers are safe (hardcoded arg keys like `star`, `planets`, `nodeId`), but `EXTR_SKIP` prevents the class of bug entirely:

```php
extract($args, EXTR_SKIP);
```

### 17. Add directory containment check in ViewRenderer

**File:** `src/Helm/View/ViewRenderer.php:75-87`

`getPath()` resolves the view path with `realpath()` but does not verify the result is within `$this->directory`. A name like `../../wp-config` would resolve outside the views directory. All current callers use hardcoded names, so this is not exploitable today. A containment check would make the class safe regardless of how it is called:

```php
if (!str_starts_with($path, realpath($this->directory) . '/')) {
    throw new ViewNotFoundException('View path outside views directory.');
}
```

### 18. Lower `per_page` maximum on nodes endpoint

**File:** `src/Helm/Rest/NodesController.php:63`

Maximum is 500. With `_embed=helm:stars`, a single request can trigger a heavy query loading 500 nodes plus their stars. Reducing to 100 would match WordPress conventions and limit resource consumption by authenticated users.

## Areas Reviewed — No Issues Found

| Area | Notes |
|------|-------|
| SQL injection | All queries use `$wpdb->prepare()` with placeholders |
| XSS (PHP) | All admin view output escaped with `esc_html()`, `esc_url()`, `esc_attr()` |
| XSS (JS) | No `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, or `document.write()` |
| IDOR | Ship/action endpoints verify `$ship->ownerId() === get_current_user_id()` |
| Authentication | All player endpoints require `is_user_logged_in()`; settings page requires `manage_options` |
| CSRF (admin) | `handleGeneratePlanets` uses `wp_verify_nonce()` + `current_user_can()` |
| CSRF (REST) | Frontend uses `@wordpress/api-fetch` which handles nonce middleware automatically |
| Open redirects | Uses `wp_safe_redirect()`, not `wp_redirect()` |
| Deserialization | No `unserialize()` on user input; uses `json_decode()` with `JSON_THROW_ON_ERROR` |
| Command injection | No `exec()`, `system()`, `shell_exec()`, `eval()`, or `passthru()` |
| File uploads | No upload handling exists |
| Debug leaks | No `var_dump()`/`print_r()` in production code; debug flag gated by `WP_DEBUG` |
| Direct file access | `helm.php` has `defined('ABSPATH')` guard |
| DI container | Singletons hold game state only, no credentials |
| Action Scheduler | Jobs use group `'helm'` for isolation; users cannot trigger arbitrary jobs |
| Action type dispatch | `ActionType` backed enum with hardcoded class mapping prevents arbitrary class instantiation |
| localStorage | No sensitive data in browser storage; state is in client-side SQLite (OPFS) and Redux |
| postMessage | Dedicated Worker only — implicit 1:1 relationship, same-origin enforced by browser |
| Products endpoint | `__return_true` permission is intentional — read-only game catalog, no sensitive data |
| Transaction handling | `Transaction` class handles savepoint nesting, rollback on exceptions, and `@@in_transaction` detection correctly |
| Seed generation | Master seed uses `random_bytes(32)` — cryptographically secure |
