# Simulation Testing

How we validate game mechanics through multi-action scenarios with time acceleration, and why the current architecture needs a simulation mode to support it.

## The Problem

The game we've designed has mechanics that only emerge through multi-action sequences playing out over time:

- A jump envelope draws power across three phases, leaving the ship in a specific power state that affects the next action
- A scan's sweep peaks roll for detection at checkpoints, with cumulative probability building across the scan duration
- Stellar effects modify formula inputs system-wide, changing how every action in that system resolves
- An interdiction interrupts a jump at a waypoint checkpoint, triggering shield drain, cargo transfer, and a recovery window
- Component drift accumulates across hundreds of actions, gradually shifting performance profiles

None of this can be validated by running a single formula in isolation. We need to play out scenarios and answer real design questions:

- Can a hauler realistically jump across an entire sector on one core?
- How hard is it really to find prey as a PVP player scanning for hours?
- How safe is a miner out in nullsec — what are the actual odds of being found?
- After an interdiction, how long is the victim actually stranded given their loadout?
- Does the piracy-vs-mining economy math actually work out the way we designed?

The simulation has to run the real game code. If we build a separate system to approximate the engine, the two will drift apart, and we'll be debugging discrepancies instead of designing gameplay.

## Two Simulation Environments

We now have two complementary environments for validating game mechanics:

### TypeScript Holodeck (design-time)

The holodeck (`@helm/holodeck`) is where we design mechanics and iterate fast. It mirrors PHP's ShipLink architecture — same timestamp-based state, same system classes, same formula delegation — but runs in milliseconds without WordPress, databases, or Docker. The holodeck is the reference implementation for the math. When it and PHP disagree, we fix PHP to match.

The holodeck already has: Clock, seeded RNG, InternalShipState, 7 system classes, Ship orchestrator with mutations and resolve(), and 117 tests proving the timestamp math works. The workbench drives it for balance analysis.

What the holodeck cannot do: run the real PHP action lifecycle. It can't prove that `ActionFactory::create()` → `ActionResolver::resolve()` produces correct results, because it doesn't run that code. It validates the math; it can't validate the plumbing.

### PHP Simulation Mode (validation-time)

The PHP simulation runs the *actual game code* — the same `ActionFactory`, `ActionResolver`, `Ship`, `Power`, `Shields` classes that production uses — but with two modifications:

1. **In-memory storage.** Repository contracts are bound to in-memory implementations instead of `$wpdb`. No database reads, no database writes. State lives in PHP arrays seeded from `tests/_data/catalog/`.

2. **Controlled time.** `Date::now()` returns simulation time, not real time. Advancing means jumping the clock to the next `deferred_until` timestamp and running the processor. No cron, no waiting.

WordPress still boots (via WP-CLI). All hooks fire. All providers register. The container wires everything normally. The only difference is *which concrete classes* are bound to the repository contracts. The game logic doesn't know it's in a simulation.

### How They Work Together

```
@helm/formulas          Pure math (shared reference)
        ↓                       ↓
@helm/holodeck          PHP ShipLink
(design-time)           (validation-time)
        ↓                       ↓
  Same fixtures ←── tests/_data/ ──→ Same fixtures
        ↓                       ↓
  Same expected values          Same expected values
```

Contract tests load the same JSON fixtures and assert the same expected values in both environments. When the numbers agree, we know the PHP implementation matches the design. When they diverge, the fixture tells us exactly which computation drifted.

## The Architecture: What Needs to Change

### Current State

The game engine's dependency chain:

```
ActionFactory → ShipFactory → ShipStateRepository → $wpdb → MySQL
                            → LoadoutFactory → InventoryRepository → $wpdb
                            → NavigationService → NodeRepository → $wpdb
ActionResolver → (same chain)
ActionProcessor → ActionRepository → $wpdb
```

Everything above the repositories is pure game logic. Everything below is WordPress storage. The repositories are the natural seam.

### The Seam: Repository Contracts

Currently, repositories are concrete classes with no interfaces. `ShipFactory` takes `ShipStateRepository` directly — there's no way to swap in an alternative without subclassing.

The fix: extract interfaces from every repository, have the concrete classes implement them, and bind via the container. Production binds the `$wpdb` implementations (no behavior change). Simulation binds in-memory implementations.

Repositories that need contracts (used by the game loop):

| Repository | Table | Game Loop Role |
|---|---|---|
| `ShipStateRepository` | `helm_ship_state` | Ship operational state (power, shields, hull, location) |
| `ActionRepository` | `helm_ship_actions` | Action queue (pending, running, fulfilled) |
| `InventoryRepository` | `helm_inventory` | Fitted components + cargo |
| `ProductRepository` | `helm_products` | Component catalog (read-only in game loop) |
| `NodeRepository` | `helm_nav_nodes` | Navigation graph nodes |
| `EdgeRepository` | `helm_nav_edges` | Navigation graph edges |

Repositories that do NOT need contracts yet (not in the game loop):

- `StarRepository`, `PlanetRepository`, `StationRepository`, `AnomalyRepository` — these are world-building CPT wrappers. The simulation doesn't need stars or planets to run a jump action.
- `RouteRepository`, `CelestialRepository`, `DiscoveryRepository` — future work.

### Time Control (`Date` — Carbon-inspired)

`Date::now()` is called ~25 times across the codebase. It's a static method that returns `new DateTimeImmutable('now', UTC)`. The simulation needs to control what "now" means.

**Already implemented.** Inspired by [Carbon's `setTestNow()`](https://carbon.nesbot.com/docs/#api-testing), `Date` now holds a static `?DateTimeImmutable $testNow`. When set, `now()` returns it instead of real time. The naming makes intent clear — these methods are obviously not for production:

```php
// Freeze time (accepts string or DateTimeImmutable, null clears)
Date::setTestNow('2025-01-15 10:00:00');

// Query
Date::hasTestNow();    // true
Date::getTestNow();    // DateTimeImmutable

// Advance the frozen clock (simulation jumps)
Date::advanceTestNow(3600);   // +1 hour, returns new time
Date::now();                  // 2025-01-15 11:00:00

// Scoped — auto-restores previous state (including null)
Date::withTestNow('2025-06-01 12:00:00', function () {
    // Date::now() returns 2025-06-01 12:00:00 in here
    $ship = ActionFactory::create($shipId, 'jump', $params);
    Date::advanceTestNow(3600);
    ActionProcessor::processReady();
});
// back to real time (or previous test time)

// Clear
Date::setTestNow(null);
```

No `Clock` interface needed. No container binding. The game code calls `Date::now()` exactly as before — it doesn't know or care whether the time is real or frozen. The simulation sets the clock before running scenarios, advances it between actions, and clears it when done.

`withTestNow()` is particularly useful for tests — it guarantees cleanup even if the callback throws, and it nests cleanly (inner `withTestNow` restores outer test time, not real time).

### Ship Identity

`ShipFactory::build(int $shipPostId)` calls `ShipPost::fromId()` which calls `get_post()`. This is a hard WordPress dependency — it reads from `wp_posts`.

`ShipPost` is thin: it provides `postId()`, `shipId()`, `name()`, `ownerId()`. The game logic only needs these four values.

The fix: extract a `ShipIdentity` interface from `ShipPost`. The simulation creates a `SimulationShipIdentity` DTO with the same four properties. `ShipFactory::buildFromParts()` already accepts `ShipPost` — widen the type hint to `ShipIdentity`.

```php
interface ShipIdentity
{
    public function postId(): int;
    public function shipId(): string;
    public function name(): string;
    public function ownerId(): int;
}
```

`ShipPost` implements `ShipIdentity`. Simulation creates plain DTOs. No `get_post()` needed.

### Transaction Handling

`ActionFactory` and `ActionResolver` use `Transaction::begin()/commit()/rollback()`. In simulation mode, transactions are unnecessary (state is in-memory) but harmless if they no-op.

The fix: `Transaction` checks whether the database is available. If repositories are in-memory, transactions become no-ops. Or: bind a `TransactionManager` contract in the container. Production uses the real one. Simulation uses a no-op.

### Origin Config

`Origin` reads from `wp_options`. The simulation needs an Origin with a known seed for deterministic generation.

The fix: bind an `MemoryOrigin` that returns a fixed `OriginConfig` with a predetermined master seed. No database needed.

### Locking

`ShipStateRepository::lockForUpdate()` uses `SELECT ... FOR UPDATE NOWAIT` to prevent concurrent action creation. `ActionRepository::claimReady()` uses `FOR UPDATE SKIP LOCKED`.

In simulation mode, there's no concurrency. In-memory repositories don't need locking. `lockForUpdate()` always succeeds. `claimReady()` just returns matching actions.

## Time Advancement

The simulation's time model is the key difference from production:

**Production:** Real time passes. Cron fires every 60 seconds. `ActionProcessor::processReady()` claims and resolves ready actions.

**Simulation:** Time is explicit. The simulation advances the clock to specific timestamps and processes actions that become ready at those timestamps.

```php
// advance(seconds) — jump forward, process any actions that matured
public function advance(int $seconds): array
{
    Date::advanceTestNow($seconds);
    return $this->processReadyActions();
}

// advanceTo(time) — set clock, process ready actions at that time
public function advanceTo(DateTimeImmutable $time): array
{
    Date::setTestNow($time);
    return $this->processReadyActions();
}

// advanceUntilIdle() — jump to next deferred_until, process, repeat
public function advanceUntilIdle(): array
{
    $allEvents = [];
    while ($next = $this->actionRepository->nextDeferredUntil()) {
        Date::setTestNow($next);
        $events = $this->processReadyActions();
        array_push($allEvents, ...$events);
    }
    return $allEvents;
}
```

The critical insight: `advanceUntilIdle()` doesn't step through time in increments. It jumps directly to the next action's `deferred_until` timestamp. A 6-hour jump that completes with no other pending actions is one clock jump and one resolver call — not 360 cron ticks.

## Data Seeding

In-memory repositories are seeded from `tests/_data/catalog/`:

| Data | Source | Repository |
|---|---|---|
| Products | `tests/_data/catalog/products/*.json` | `MemoryProductRepository` |
| Hulls | `tests/_data/catalog/hulls.json` | Used by `LoadoutFactory` |
| Nav graph | `tests/_data/catalog/graph.json` | `MemoryNodeRepository` + `MemoryEdgeRepository` |
| Ships | Created programmatically via `Simulation::createShip()` | `MemoryShipStateRepository` + `MemoryInventoryRepository` |

This is the same data the holodeck and workbench consume. One source of truth.

## SimulationProvider

A service provider that re-binds the container for simulation mode:

```php
final class SimulationProvider extends ServiceProvider
{
    public function register(): void
    {
        // Freeze time — all Date::now() calls return simulation time
        Date::setTestNow($this->startTime);

        // Repositories — in-memory, seeded from tests/_data/catalog/
        $this->container->singleton(ShipStateRepositoryContract::class, MemoryShipStateRepository::class);
        $this->container->singleton(ActionRepositoryContract::class, MemoryActionRepository::class);
        $this->container->singleton(InventoryRepositoryContract::class, MemoryInventoryRepository::class);
        $this->container->singleton(ProductRepositoryContract::class, MemoryProductRepository::class);
        $this->container->singleton(NodeRepositoryContract::class, MemoryNodeRepository::class);
        $this->container->singleton(EdgeRepositoryContract::class, MemoryEdgeRepository::class);

        // Origin — fixed seed for deterministic generation
        $this->container->singleton(Origin::class, fn () => new MemoryOrigin($seed));

        // Transaction no-op
        $this->container->singleton(TransactionManager::class, NullTransactionManager::class);

        // Seed product catalog from shared test data
        $this->seedFromCatalog();
    }
}
```

Activated via WP-CLI flag or environment variable:

```bash
wp helm sim run scenario.json     # boots with SimulationProvider
HELM_SIMULATION=1 wp helm ...     # environment variable trigger
```

WordPress boots normally. All providers register. Then `SimulationProvider` re-binds the storage contracts. Everything above the repository layer — `ShipFactory`, `ActionFactory`, `ActionResolver`, all system classes — runs unchanged.

## Contract Tests

The real payoff of having two simulation environments:

```
tests/_data/ship-state/power-from-timestamp.json
{
  "label": "power regen from half capacity",
  "input": {
    "core": { "rate": 10, "capacity": 100, "mult_a": 1.0 },
    "powerMode": "normal",
    "powerFullAt": 3600,
    "now": 0
  },
  "expected": {
    "currentPower": 90.0
  }
}
```

**Holodeck test** (vitest):
```ts
const sys = createPowerSystem({ powerFullAt: 3600 });
expect(sys.getCurrentPower(0)).toBe(fixture.expected.currentPower);
```

**PHP test** (wpunit or simulation):
```php
$power = new Power($state, $loadout);
$this->assertEquals($fixture->expected->currentPower, $power->getCurrentPower($now));
```

Same input. Same expected value. Different implementations. When they agree, we know the math is right. When they disagree, the fixture tells us exactly where the drift is.

## Implementation Path

### Phase 1: Repository Contracts

Extract interfaces from the 6 game-loop repositories. Current concrete classes implement the new interfaces. Update constructor type hints throughout (ShipFactory, ActionFactory, ActionResolver, LoadoutFactory). No behavior change — this is pure refactoring.

### Phase 2: Date Test Time + Ship Identity

**Date: done.** Carbon-inspired `setTestNow()` / `advanceTestNow()` / `withTestNow()` API added to `Date`. No Clock interface needed — static test time on the class itself. Still to do: `ShipIdentity` interface, widen `ShipPost` and `ShipFactory`.

### Phase 3: In-Memory Repositories

Build in-memory implementations of all 6 repository contracts. Seed from `tests/_data/catalog/`. Build `SimulationProvider` that re-binds the container. Build `Simulation` class with `createShip()`, `advance()`, `advanceTo()`, `advanceUntilIdle()`.

### Phase 4: Contract Test Fixtures

Create `tests/_data/ship-state/` fixtures covering timestamp computations (power regen, shield regen, combined scenarios). Run them in both holodeck (vitest) and PHP simulation (wpunit). Verify parity.

### Phase 5: WP-CLI Simulation Commands

`wp helm sim run <scenario.json>` — run a scenario file through the simulation. `wp helm sim ship --loadout=...` — create and inspect a ship in simulation mode.

### Phase 6: Action Lifecycle in Simulation

Wire `ActionFactory::create()` and `ActionResolver::resolve()` through the simulation. Run action scenarios (jump, scan) through both holodeck (Stage 3) and PHP simulation. Verify parity on action validation, duration calculation, cost computation, and state mutation.

### Future Phases (unchanged from original)

- **Engine Layer** — `ActionContext` with effect stacking, environment modifiers
- **Stellar Effects** — Per-system effects from star properties
- **Detection and Interaction** — Multi-ship emission/detection model
- **Scenario Framework** — JSON scenario definitions with assertions and verdicts

## Resolved Questions

- **State isolation.** In-memory repositories. No database, no transactions, no cleanup. Fastest option, and since the repository contracts are the seam, the game logic runs identically.

- **Deterministic randomness.** The holodeck already has a seeded RNG (`createRng(seed)`). PHP needs the same — a seeded RNG service in the container that the simulation controls. Both environments use the same seed for the same scenario.

- **Performance.** In-memory repositories + clock jumping (not stepping) means a 24-hour scenario with 10 actions is ~10 resolver calls. No database overhead, no cron polling. Should be sub-second.

- **Scenario portability.** JSON fixtures in `tests/_data/`. Both environments consume them. A scenario that passes in holodeck and PHP today becomes a regression test tomorrow.

## Scenario Examples

_(Unchanged from original — see hauler-cross-sector, pvp-detection, nullsec-miner, post-interdiction, station-siege, vulture, wolf-pack, reinforcement-timing scenarios above.)_

The scenarios are still the goal. What's changed is the implementation path: repository contracts and in-memory storage instead of transaction rollback or database prefixes, controlled clock instead of time-stepping, and contract tests bridging the holodeck and PHP to catch drift early.
