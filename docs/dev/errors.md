# Error Handling

Helm's error system spans PHP and TypeScript with a shared contract: every error carries a **code** for programmatic matching and a **message** for human display. The format flows unchanged from server to client — PHP throws a `HelmException`, the REST boundary serializes it as a `WP_Error`, WordPress sends JSON, and the client reconstructs it as a `HelmError`. At every layer, the code is stable and the message is translatable.

## Key Files

| File | What it is |
|------|------------|
| `src/Helm/Core/ErrorCode.php` | Server error code enum — codes, HTTP statuses, `WP_Error` factory |
| `src/Helm/Exceptions/HelmException.php` | Base PHP exception — wraps `ErrorCode`, chains via `$previous`, converts to `WP_Error` |
| `src/Helm/ShipLink/ActionException.php` | Thin subclass for action failures — enables domain-specific catch blocks |
| `resources/packages/errors/src/helm-error.ts` | Client error class — `from()`, `safe()`, `safeFrom()`, `asyncFrom()` |
| `resources/packages/errors/src/error-code.ts` | Client-originated error codes (datacore, ships, actions, cache) |
| `resources/packages/errors/src/server-error-code.ts` | Mirror of PHP codes for client-side matching |
| `resources/packages/errors/src/assert.ts` | Type-narrowing assertion — throws unsafe `HelmError` on failure |
| `resources/packages/errors/src/format-error.ts` | Extracts safe display strings, drops unsafe content |
| `resources/packages/shell/src/components/helm-error-fallback.tsx` | ErrorBoundary fallback components (page, card, compact) |

## Error Codes

All codes use dot notation: `helm.{domain}.{error_name}`. The `helm.` prefix scopes away from WordPress core codes like `rest_forbidden`.

On the server, `ErrorCode` is a backed enum. Each case maps to an HTTP status via `httpStatus()` and can produce a `WP_Error` via `error(__('message', 'helm'))`. On the client, `ErrorCode` holds codes that originate in JavaScript (datacore faults, store failures). `ServerErrorCode` mirrors the PHP enum for matching against API responses — you never construct a `HelmError` with a `ServerErrorCode`.

## Server Side (PHP)

### HelmException and chaining

Domain code throws `HelmException` (or a subclass like `ActionException`) with an `ErrorCode` and a translatable message. PHP's native `$previous` parameter chains inner causes:

```php
throw new ActionException(
    ErrorCode::ActionFailed,
    __('Jump failed', 'helm'),
    $innerException
);
```

`toWpError()` walks the `$previous` chain and calls `WP_Error::add()` for each `HelmException`, preserving the full error tree in the serialized response.

### REST boundary

REST controllers are the catch boundary. They convert exceptions to `WP_Error` responses with HTTP status codes. WordPress serializes the result as JSON with the shape `{ code, message, data, additional_errors }`. This JSON shape is the contract between server and client.

## Client Side (TypeScript)

### HelmError

`HelmError` extends `Error` with a deliberate layout:

- **`message`** holds the error **code** (e.g., `helm.navigation.no_route`). This appears in stack traces and `toThrow()` matchers — greppable and locale-independent.
- **`detail`** holds the translatable, player-facing string. Never match on it.
- **`isSafe`** marks whether `detail` is safe to render in the UI. Defaults to `false`.
- **`data`** preserves the WP_Error data bag (HTTP status, params).
- **`causes`** holds nested errors from `additional_errors` (horizontal chain). `Error.cause` holds the wrapped original (vertical chain).

### Safe vs unsafe

This is the core design decision. Not every error message should reach the player — a raw SQLite error or a JS stack trace leaks internals. `isSafe` is the gate:

- **Unsafe by default**: `new HelmError(...)`, `HelmError.from(nativeError)`, and `assert()` all produce unsafe errors. Their details are developer diagnostics.
- **Explicitly safe**: `HelmError.safe()`, `HelmError.safeFrom()`, and `HelmError.from(wpRestResponse)` produce safe errors. Server errors are safe because PHP already provides translatable messages. Client code opts in via `safe()`.

`formatError()` enforces this at render time — it replaces unsafe details with a generic fallback and only surfaces safe messages from the cause chain.

### Converting errors

| Method | When to use | Safety |
|--------|-------------|--------|
| `from(error)` | Catch boundary — normalize any thrown value to `HelmError` | WP REST responses become safe; everything else stays unsafe |
| `asyncFrom(error)` | Catch boundary where `apiFetch` may throw a raw `Response` | Parses Response body, then delegates to `from()` |
| `safe(code, detail, cause?)` | Catch boundary — wrap a technical error with a translatable message | Always safe |
| `safeFrom(error, code, detail)` | ErrorBoundary fallbacks — ensure safety without clobbering already-safe errors | Pass-through if safe, wrap if not |
| `assert(value, code?, msg?)` | Type narrowing — validate data a parent guarantees exists | Always unsafe — developer diagnostic |

### Typical store pattern

Store resolvers and actions catch errors and wrap them with `safe()` before dispatching failure actions:

```typescript
} catch (error) {
    dispatch({
        type: 'FETCH_ACTIONS_FAILED',
        queryId,
        error: HelmError.safe(
            ErrorCode.ActionsInvalidResponse,
            __('Ship link failed to retrieve the ship log', 'helm'),
            await HelmError.asyncFrom(error),
        ),
    });
}
```

### ErrorBoundary fallbacks

React ErrorBoundary fallbacks are the last line of defense. They use `safeFrom()` to guarantee a safe message reaches the player, while preserving more specific messages from deeper in the stack when they exist:

```typescript
export function HelmErrorPageFallback({ error }: { error: unknown }) {
    const safeError = HelmError.safeFrom(
        error, ErrorCode.Unknown,
        __('Bridge failed to render — loss of ship link signal', 'helm'),
    );
    const { detail, causes } = formatError(safeError);
    return <ErrorPage code={safeError.message} detail={detail} causes={causes} />;
}
```

If the caught error was already safe (e.g., "Ship link connection lost — ship state unavailable" from a store), `safeFrom` passes it through. If it was an unsafe assert failure, `safeFrom` wraps it with the fallback message.

## The Full Flow

```
PHP domain → HelmException (ErrorCode + $previous chain)
    ↓
REST controller → toWpError() + HTTP status
    ↓
WordPress → JSON { code, message, data, additional_errors }
    ↓
Client catch → HelmError.from() or asyncFrom()  [safe — server messages are translatable]
    ↓
Store catch → HelmError.safe(code, detail, cause)  [wraps with translatable message]
    ↓
Reducer → stores HelmError in state
    ↓
UI render → formatError()  [filters unsafe, extracts safe detail + causes]
    ↓
ErrorBoundary → safeFrom()  [last resort — guarantees safe message]
```

Client-originated errors (assert failures, datacore faults) skip the server steps but produce the same `HelmError` shape.

## Writing Safe Error Messages

Safe messages are player-facing. They appear in the game UI and should read like ship computer output — terse, diagnostic, in-world.

**Format**: `{system} {failed verb} — {consequence or context}`

```
Ship link failed to retrieve the ship log
Ship link connection lost — ship state unavailable
Bridge failed to render — loss of ship link signal
Ship log entry unreadable — renderer fault
```

**Naming conventions** (not exhaustive — invent new system names as the game grows):
- `ship link` — the connection between the UI and ship state (lowercase unless starting a sentence)
- `bridge` — the main game screen
- `ship log` — the action feed
- `datacore` — the local database

**Do**: name the subsystem, describe the failure from the player's perspective, use em-dashes for consequence, wrap in `__('...', 'helm')`.

**Don't**: use camelCase identifiers, say "error" or "something went wrong", include technical context, punctuate with periods.

## Adding New Codes

All codes use the format `helm.{domain}.{error_name}`. The enums are the source of truth:

- **Server**: `src/Helm/Core/ErrorCode.php` — add the case, add the HTTP status mapping in `httpStatus()`, then mirror in `resources/packages/errors/src/server-error-code.ts`
- **Client**: `resources/packages/errors/src/error-code.ts`
