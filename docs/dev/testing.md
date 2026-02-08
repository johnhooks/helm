# Testing

Helm has three test layers, each targeting a different boundary.

| Layer | Tool | What it tests | Runs against |
|-------|------|---------------|-------------|
| PHP integration | wp-browser (Codeception) via slic | Models, repos, REST endpoints, services | Real WordPress + MariaDB in Docker |
| JS unit | Vitest | Pure logic, mocked workers, in-memory SQLite | Node / happy-dom |
| E2E | Playwright | Real worker + wa-sqlite + OPFS in a browser | Vite dev server (no WordPress) |

## Commands

```bash
# PHP
composer test              # PHPStan + PHPCS + Wpunit
composer test:unit         # Wpunit only
composer test:coverage     # Wpunit with HTML coverage

# JavaScript
bun run test               # Vitest
bun run test:watch         # Vitest watch mode
bun run test:coverage      # Vitest with coverage

# E2E
bun run test:e2e           # Playwright (all projects)
bun run test:e2e:headed    # Playwright with visible browser
bun run test:e2e:ui        # Playwright interactive UI

# Static analysis & linting
composer analyse           # PHPStan level 6
composer lint              # PHPCS (WPCS)
bun run lint:js            # ESLint
bun run lint:style         # Stylelint
bun run check-types        # tsc --noEmit
```

## PHP tests (wp-browser + slic)

PHP tests run inside Docker via [slic](https://github.com/developer-toolbelt/slic). Before running, make sure you've selected the project:

```bash
slic use helm
```

### Test isolation

wp-browser wraps each test in a database transaction that rolls back on teardown. This gives every test a clean slate without truncating tables.

**Critical rule:** create test data in `set_up()`, not `_before()`. The `_before()` hook runs *before* `start_transaction()`, so anything created there leaks across tests.

```php
// Good - isolated per test
public function set_up(): void
{
    parent::set_up();
    $this->repository = helm(NodeRepository::class);
    $this->node = $this->repository->create(1.0, 2.0, 3.0, NodeType::System);
}

// Bad - leaks across tests
public function _before(): void
{
    parent::_before();
    $this->repository = helm(NodeRepository::class);
    $this->node = $this->repository->create(1.0, 2.0, 3.0, NodeType::System); // outside transaction!
}
```

`_before()` is fine for resolving dependencies from the container (no DB writes).

### Bootstrap

`tests/Wpunit/_bootstrap.php` runs once before the suite. It ensures schema is current and cleans stale data using `DELETE` (DML) instead of `TRUNCATE` (DDL) to avoid implicit commits that break transaction isolation.

### Base classes

**`WPTestCase`** (via `Tests\Support\TestCase`) - for model, repo, and service tests:

```php
class NodeRepositoryTest extends WPTestCase
{
    private NodeRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(NodeRepository::class);
    }

    public function test_can_create_system_node(): void
    {
        $node = $this->repository->create(1.5, 2.5, 3.5, NodeType::System);

        $this->assertInstanceOf(Node::class, $node);
        $this->assertSame(NodeType::System, $node->type);
    }
}
```

**`WPRestApiTestCase`** - for REST endpoint tests. Provides `assertErrorResponse()`:

```php
class NodesControllerTest extends WPRestApiTestCase
{
    public function set_up(): void
    {
        parent::set_up();
        $this->userId = self::factory()->user->create(['role' => 'subscriber']);
        wp_set_current_user($this->userId);
    }

    public function test_returns_401_when_not_logged_in(): void
    {
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/nodes');
        $response = rest_do_request($request);

        $this->assertErrorResponse('rest_not_logged_in', $response, 401);
    }
}
```

REST tests dispatch requests in-process via `rest_do_request()` - no HTTP involved.

### Codeception helper modules

Registered in `tests/Wpunit.suite.yml`, these provide test data factories through `$this->tester`:

**`Tests\Support\Helper\Helm`** - domain factories:
- `haveOrigin()`, `haveStar()`, `haveShip()`, `haveProduct()`, etc.
- Navigation helpers: `getNodeForStar()`, `grabStar()`, `grabShip()`
- Database assertions: `seeStarInDatabase()`, `dontSeeShipInDatabase()`

**`Tests\Support\Helper\Rest`** - REST shortcuts:
- `postAction($shipPostId, $body)` - dispatch a ship action POST

### Filtering tests

```bash
slic run "Wpunit --filter NodeRepositoryTest"
slic run "Wpunit --filter test_can_create_system_node"
```

## Vitest (JavaScript unit tests)

Tests live alongside source files: `resources/packages/*/src/*.test.ts`.

### Environments

Most packages use `happy-dom` for DOM simulation. Datacore tests run in `node` environment (configured via `environmentMatchGlobs` in `vitest.config.ts`) since they use native Node APIs and in-memory SQLite.

### Patterns

**Worker mocking** (`client.test.ts`) - mock the Worker API to test the client in isolation:

```typescript
class MockWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;

    postMessage(data: unknown): void { /* queue or handle */ }
    receive(data: WorkerResponse): void {
        this.onmessage?.({ data } as MessageEvent);
    }

    static instance: MockWorker;
}

vi.stubGlobal('Worker', MockWorker);
```

**In-memory SQLite** (`db.test.ts`) - test query logic against real SQLite without OPFS:

```typescript
let database: Database;

beforeEach(async () => {
    database = await openMemoryDb();
    await exec(database, NODES_SCHEMA);
    await exec(database, STARS_SCHEMA);
});

afterEach(async () => {
    await database.sqlite3.close(database.db);
});
```

### Path aliases

All `@helm/*` imports are resolved via aliases in `vitest.config.ts`, matching the Bun workspace layout.

## Playwright (E2E tests)

E2E tests exercise the full client-side stack in a real browser: real Web Worker, real wa-sqlite, real OPFS.

### Architecture

These tests do **not** need a running WordPress instance. A minimal Vite dev server (`tests-e2e/datacore/`) serves a page that imports `createDatacore` and exposes it on `window`. Playwright drives Chrome against this page.

```
tests-e2e/
  datacore/
    index.html          # Minimal HTML shell
    entry.ts            # Exposes createDatacore on window
    vite.config.ts      # Aliases, wa-sqlite exclusion, port 5188
  datacore.spec.ts      # Test spec
```

The Vite config excludes `wa-sqlite` from dependency optimization (`optimizeDeps.exclude`) so the WASM binary loads correctly.

### Test isolation

Each test gets a completely fresh database:

1. `page.goto('/')` - kills previous workers, releases OPFS locks
2. Wipe the `helm-datacore` OPFS directory
3. `createDatacore()` - boots a new worker + SQLite instance

```typescript
test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await wipeOpfs(page);
    await bootDatacore(page);
});

test.afterEach(async ({ page }) => {
    await page.evaluate(async () => {
        if ((window as any).dc) await (window as any).dc.close();
    });
});
```

### Pattern

All browser interaction happens through `page.evaluate()`. Pass data in, get results back:

```typescript
test('insertNode round-trip', async ({ page }) => {
    const node = makeNode();

    const result = await page.evaluate(async (n) => {
        const dc = (window as any).dc;
        await dc.insertNode(n);
        return dc.getNode(n.id);
    }, node);

    expect(result).toEqual(node);
});
```

## Testing strategy

**WordPress REST APIs are tested in PHP.** Wpunit gives us transactional isolation against a real WordPress stack. This is where we verify endpoint behavior, permissions, serialization, and error codes.

**The browser never talks to WordPress during E2E tests.** Managing state between a live WP instance and Playwright would be a cleanup nightmare with no transaction rollback. Instead, E2E tests verify the client-side stack (datacore, workers, OPFS) in isolation. When we need to test components that consume REST data, we'll mock the API boundary (via `page.route()` or a service worker) using the response shapes that our Wpunit tests already verify.

This keeps each layer focused:
- PHP tests own the API contract
- E2E tests own the client-side behavior
- The API response shapes are the shared boundary between them
