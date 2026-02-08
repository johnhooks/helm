# Error Handling

Helm's error system spans PHP and TypeScript with a shared contract: every error has a **code** for programmatic matching and a **message** for human display. The format flows unchanged from server to client.

A key design choice: error messages are user-facing and translatable. They change with locale and are never safe for programmatic matching. Error codes are constants — stable, locale-independent identifiers that code can `switch` on. Both sides enforce this separation.

## Error Code Format

All error codes use dot notation:

```
helm.{domain}.{error_name}
```

- **Domain**: lowercase — `navigation`, `ship`, `datacore`, etc.
- **Error name**: `snake_case` — `not_found`, `invalid_node`, etc.

The `helm.` prefix scopes codes to the plugin and away from WordPress core errors like `rest_forbidden`.

## Server Errors (PHP)

### ErrorCode Enum

`Helm\Core\ErrorCode` defines all server-side error codes as a backed enum:

```php
use Helm\Core\ErrorCode;

ErrorCode::NavigationNoRoute->code();       // 'helm.navigation.no_route'
ErrorCode::NavigationNoRoute->httpStatus(); // 422
```

The enum maps each code to an HTTP status and provides helpers to create `WP_Error` instances and match against them:

```php
// Create a WP_Error with a translatable message
ErrorCode::NavigationNoRoute->error(__('No known route to target', 'helm'));

// With additional data
ErrorCode::NavigationInsufficientFuel->error(__('Insufficient fuel', 'helm'), [
    'required'  => $fuelCost,
    'available' => $ship->fuel,
]);

// Match
if (ErrorCode::NavigationNoRoute->matches($error)) { ... }
```

### i18n

All error messages are user-facing and must be wrapped in `__('message', 'helm')` for translation. Error codes are never translated — they are constants used for programmatic matching. This is why the code and message are always separate parameters:

```php
// Code is a constant, message is translatable
ErrorCode::ShipNotFound->error(__('Ship not found.', 'helm'));

throw new HelmException(
    ErrorCode::NavigationNoRoute,        // constant — safe to match on
    __('No known route to target', 'helm'), // translatable — for display only
);
```

### HelmException

`HelmException` wraps `ErrorCode` in a throwable. This lets domain code throw errors that carry structured codes while still supporting PHP's native exception chaining:

```php
throw new HelmException(
    ErrorCode::ActionFailed,
    __('Jump failed', 'helm'),
    $previous // another Throwable — forms the chain
);
```

Specialized subclasses like `ActionException` extend `HelmException` for domain-specific catch blocks without adding new behavior.

### Error Chaining

The preferred pattern is **chained errors** — an outer error wrapping an inner cause:

```php
try {
    $this->navigator->computeRoute($ship, $target);
} catch (HelmException $e) {
    throw new ActionException(
        ErrorCode::ActionFailed,
        __('Jump failed', 'helm'),
        $e // NavigationNoRoute becomes the cause
    );
}
```

`HelmException::toWpError()` walks the `$previous` chain and calls `WP_Error::add()` for each `HelmException` it finds, preserving the full error tree:

```php
public function toWpError(): \WP_Error
{
    $error = $this->errorCode->error($this->getMessage());

    $previous = $this->getPrevious();
    while ($previous !== null) {
        if ($previous instanceof HelmException) {
            $error->add($previous->errorCode->code(), $previous->getMessage());
        }
        $previous = $previous->getPrevious();
    }

    return $error;
}
```

### REST Boundary

REST controllers catch exceptions at the boundary and convert them to `WP_Error` responses:

```php
try {
    $action = $this->actionFactory->create($shipPostId, $type, $params);
} catch (ActionException $e) {
    $error = $e->toWpError();
    $error->add_data(['status' => $e->errorCode->httpStatus()]);

    return $error;
}
```

WordPress serializes the `WP_Error` as JSON:

```json
{
    "code": "helm.action.failed",
    "message": "Jump failed",
    "data": { "status": 422 },
    "additional_errors": [
        {
            "code": "helm.navigation.no_route",
            "message": "No known route to target",
            "data": {}
        }
    ]
}
```

This JSON shape is the contract between server and client.

## Client Errors (TypeScript)

### HelmError

`HelmError` (`@helm/errors`) is the client-side counterpart. It extends `Error` with the same structure:

```typescript
class HelmError extends Error {
    readonly message: string;                // Error code — 'helm.action.failed'
    readonly detail: string;                 // Human message — 'Jump failed'
    readonly isSafe: boolean;                // Whether detail is safe to display in the UI
    readonly data: Record<string, unknown>;  // Full WP_Error data bag
    readonly causes: readonly HelmError[];   // Nested errors from additional_errors
}
```

`HelmError` puts the error **code** in `message` and the human-facing text in `detail`. This is intentional:

- **`message`** is what appears in stack traces, `error.toString()`, and test matchers like `toThrow()`. Making it the code means stack traces show `HelmError: helm.navigation.no_route` — immediately greppable and locale-independent.
- **`detail`** holds the translatable, user-facing string. It changes with locale and should never be used for programmatic matching. It is the string you show in the UI.

The same separation exists on the server (`ErrorCode` vs `__('message', 'helm')`), just expressed differently since PHP exceptions don't have a `detail` property.

### `isSafe` — user-facing vs technical errors

Not every error detail is safe to show to users. A raw SQLite error message or a JS stack trace is technical — displaying it in the UI leaks internals and confuses players.

`isSafe` marks whether `detail` contains a translatable, user-facing string. It defaults to `false` — safe display is an intentional choice, not something you get by accident:

- **`false`** (default) — `new HelmError(...)` and `HelmError.from(nativeError)`. The detail may contain technical messages from native errors, third-party libraries, or the runtime.
- **`true`** — explicitly opted in via `HelmError.safe(...)` or `HelmError.from(wpRestResponse)`. Server errors are safe because PHP already provides translatable messages. `safe()` is the factory for creating user-facing errors in client code.

UI code checks `isSafe` before rendering:

```typescript
if (error.isSafe) {
    showToast(error.detail);
} else {
    showToast(__('Something went wrong. Please try again.', 'helm'));
}
```

### `HelmError.safe()` — creating user-facing errors

`HelmError.safe()` is the primary way to create errors with translatable, user-facing messages. It sets `isSafe: true` and optionally wraps a technical error as a cause for debugging:

```typescript
// User-facing error with no cause
throw HelmError.safe(
    ErrorCode.DatacoreUnsupported,
    __('Your browser does not support this feature.', 'helm'),
);

// Wrapping a technical error at a catch boundary
try {
    await datacore.query(sql);
} catch (e) {
    throw HelmError.safe(
        ErrorCode.DatacoreWorkerError,
        __('A database error occurred.', 'helm'),
        e, // original error preserved in causes[0]
    );
}
```

The original error is converted via `from()` and stored in `causes`, keeping the technical detail available for logging without exposing it to users.

### ErrorCode Enum (Client)

`ErrorCode` defines codes that originate in client-side JavaScript — errors the server never produces:

```typescript
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';

throw new HelmError(
    ErrorCode.DatacoreUnsupported,
    __('Datacore requires Web Workers, which is not available in this browser.', 'helm'),
);
```

As on the server, the code is a constant and the detail is translatable. Client error messages should use `@wordpress/i18n` for translation.

| Code | Description |
|------|-------------|
| `unknown` | Fallback for unrecognized errors |
| `helm.datacore.unsupported` | Browser lacks required APIs (Web Workers, OPFS) |
| `helm.datacore.worker_error` | SQLite worker crashed or returned an error |
| `helm.datacore.unexpected_response` | Worker returned an unexpected message type |

New client codes are added here as the UI grows.

### ServerErrorCode Enum

`ServerErrorCode` mirrors the PHP `ErrorCode` enum. It exists solely for **matching** against errors received from the server — you never construct a `HelmError` with a `ServerErrorCode`:

```typescript
import { ServerErrorCode, HelmError } from '@helm/errors';

const error = HelmError.from(apiResponse);

if (error.message === ServerErrorCode.NavigationNoRoute) {
    showRouteNotFoundUI();
}
```

### Converting Server Errors

`HelmError.from()` converts the WP REST error JSON shape into a `HelmError`, recursively converting `additional_errors` into nested `causes`:

```typescript
const error = HelmError.from(response);

error.message;            // 'helm.action.failed'
error.detail;             // 'Jump failed'
error.status;             // 422
error.causes[0].message;  // 'helm.navigation.no_route'
error.causes[0].detail;   // 'No known route to target'
```

`from()` also handles plain `Error` objects, strings, and unknown values by wrapping them as `unknown` code errors. This makes it safe to call at any catch boundary.

### Type Guard

`HelmError.is()` narrows the type without catching:

```typescript
if (HelmError.is(error)) {
    console.log(error.detail);
}
```

## The Full Flow

```
PHP domain code throws HelmException (with ErrorCode + $previous chain)
    ↓
REST controller catches, calls toWpError(), attaches HTTP status
    ↓
WordPress serializes WP_Error → JSON { code, message, data, additional_errors }
    ↓
Client receives JSON, calls HelmError.from()
    ↓
HelmError with .message = code, .detail = message, .causes = additional_errors
    ↓
UI matches against ServerErrorCode enum to decide what to display
```

Client-originated errors skip the first three steps but produce the same `HelmError` shape, using `ErrorCode` instead of `ServerErrorCode`.

## Adding New Codes

### Server-side (PHP)

1. Add the enum case to `src/Helm/Core/ErrorCode.php`
2. Add the HTTP status mapping in `httpStatus()`
3. Mirror the code in `resources/packages/errors/src/server-error-code.ts`

### Client-side (TypeScript)

1. Add the enum case to `resources/packages/errors/src/error-code.ts`

In both cases, use the format `helm.{domain}.{error_name}`.

## Server Error Reference

### Action (`helm.action.*`)

| Code | Enum Case | HTTP | Description |
|------|-----------|------|-------------|
| `helm.action.not_found` | `ActionNotFound` | 404 | Action does not exist |
| `helm.action.not_ready` | `ActionNotReady` | 400 | Action is not ready to resolve |
| `helm.action.claim_failed` | `ActionClaimFailed` | 400 | Failed to claim action for processing |
| `helm.action.in_progress` | `ActionInProgress` | 409 | Ship already has an action in progress |
| `helm.action.no_handler` | `ActionNoHandler` | 400 | No handler registered for action type |
| `helm.action.no_resolver` | `ActionNoResolver` | 400 | No resolver registered for action type |
| `helm.action.insert_failed` | `ActionInsertFailed` | 500 | Database insert failed |
| `helm.action.failed` | `ActionFailed` | 400 | Action failed during resolution |
| `helm.action.cancelled` | `ActionCancelled` | 400 | Action was cancelled |

### Navigation (`helm.navigation.*`)

| Code | Enum Case | HTTP | Description |
|------|-----------|------|-------------|
| `helm.navigation.invalid_node` | `NavigationInvalidNode` | 422 | Ship is not at a valid node |
| `helm.navigation.invalid_target` | `NavigationInvalidTarget` | 422 | Target node does not exist |
| `helm.navigation.missing_target` | `NavigationMissingTarget` | 422 | No target specified |
| `helm.navigation.no_route` | `NavigationNoRoute` | 422 | No known route to target |
| `helm.navigation.route_lost` | `NavigationRouteLost` | 422 | Route invalidated during travel |
| `helm.navigation.already_at_target` | `NavigationAlreadyAtTarget` | 422 | Already at the target node |
| `helm.navigation.beyond_range` | `NavigationBeyondRange` | 422 | Target beyond drive range |
| `helm.navigation.insufficient_fuel` | `NavigationInsufficientFuel` | 422 | Not enough fuel |
| `helm.navigation.scan_failed` | `NavigationScanFailed` | 422 | Scan failed to discover route |

### Ship (`helm.ship.*`)

| Code | Enum Case | HTTP | Description |
|------|-----------|------|-------------|
| `helm.ship.not_found` | `ShipNotFound` | 404 | Ship does not exist |
| `helm.ship.no_position` | `ShipNoPosition` | 422 | Ship has no known position |
| `helm.ship.invalid_state` | `ShipInvalidState` | 422 | Ship state invalid for operation |
| `helm.ship.insufficient_core` | `ShipInsufficientCore` | 422 | Insufficient core energy |
| `helm.ship.systems_not_found` | `ShipSystemsNotFound` | 404 | Ship systems data not found |

### Other Domains

| Code | Enum Case | HTTP | Description |
|------|-----------|------|-------------|
| `helm.product.not_found` | `ProductNotFound` | 404 | Product does not exist |
| `helm.star.not_found` | `StarNotFound` | 404 | Star does not exist |
| `helm.node.not_found` | `NodeNotFound` | 404 | Node does not exist |
| `helm.station.not_found` | `StationNotFound` | 404 | Station does not exist |
| `helm.anomaly.not_found` | `AnomalyNotFound` | 404 | Anomaly does not exist |
| `helm.origin.not_initialized` | `OriginNotInitialized` | 400 | Origin not initialized |
| `helm.origin.already_initialized` | `OriginAlreadyInitialized` | 400 | Origin already initialized |
