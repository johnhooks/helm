# Simulation

The simulation layer runs the full PHP game loop without a database. Ships, actions, state, navigation — all backed by in-memory arrays. Tests run in milliseconds. CLI commands let you inspect ships and run scenarios from the terminal.

## Why

The game engine is built on WordPress: `wp_posts` for ships, `wp_options` for state, custom tables for actions, inventory, navigation. Every query goes through `$wpdb`. That's fine in production but painful for testing and design iteration:

- **Speed.** Database tests take seconds. In-memory tests take milliseconds.
- **Isolation.** No transaction rollback edge cases, no stale object cache, no leaked state between tests.
- **CLI access.** Inspect a ship's system readings or run a multi-step scenario without standing up a WordPress instance.
- **Parity testing.** Run the same fixture data through PHP and TypeScript to verify both implementations agree.

The simulation doesn't mock the game logic. It replaces the storage layer and runs the real `ActionFactory`, `ActionResolver`, `ActionProcessor`, `ShipFactory`, and all ship systems exactly as production does.

## Architecture

```
Production path:
  ShipFactory → WpdbShipStateRepository → $wpdb → MySQL
  ActionProcessor → WpdbActionRepository → $wpdb → MySQL

Simulation path:
  ShipFactory → MemoryShipStateRepository → array
  ActionProcessor → MemoryActionRepository → array
```

Six repository contracts define the storage boundary:

| Contract | Production | Simulation |
|----------|-----------|------------|
| `ShipStateRepository` | `WpdbShipStateRepository` | `MemoryShipStateRepository` |
| `ActionRepository` | `WpdbActionRepository` | `MemoryActionRepository` |
| `InventoryRepository` | `WpdbInventoryRepository` | `MemoryInventoryRepository` |
| `ProductRepository` | `WpdbProductRepository` | `MemoryProductRepository` |
| `NodeRepository` | `WpdbNodeRepository` | `MemoryNodeRepository` |
| `EdgeRepository` | `WpdbEdgeRepository` | `MemoryEdgeRepository` |

Plus `LoadoutFactory` (contract) with `WpdbLoadoutFactory` (production) and `MemoryLoadoutFactory` (simulation).

The `ShipIdentity` interface decouples ship identity from `wp_posts`. Production uses `ShipPost` (backed by `get_post()`). Simulation uses `MemoryShipIdentity` (a plain DTO). `ShipFactory` accepts either through `setIdentityResolver()`.

### Simulation\Provider

`Simulation\Provider` re-binds the container. Register it after the normal providers:

```php
$provider = new \Helm\Simulation\Provider(helm()->getContainer());
$provider->register();  // Rebinds all 6 repos + LoadoutFactory + dependent singletons
$provider->boot();      // Seeds products from catalog JSON into in-memory store
```

It also re-registers dependent singletons (`ShipFactory`, `ActionFactory`, `ActionResolver`, `ActionProcessor`, `NavComputer`, `NavigationService`) so they pick up the new bindings instead of cached `Wpdb*` instances.

### Simulation class

The `Simulation` class is the scenario driver. It manages ship creation, action dispatch, and time advancement:

```php
$sim = helm(Simulation::class);

// Create ships
$ship = $sim->createShip('Pioneer', ownerId: 1);         // At node 1
$ship = $sim->createShipAtNode('Explorer', 1, nodeId: 2); // At node 2

// Dispatch actions
$action = $sim->dispatch($ship->getId(), ActionType::ScanRoute, [
    'target_node_id' => 2,
]);

// Advance time
$result = $sim->advance(3600);           // Advance 1 hour, process ready actions
$result = $sim->processReady();          // Process without advancing
$result = $sim->advanceUntilIdle();      // Jump clock until all actions resolve

// Inspect
$ship = $sim->getShip($shipPostId);      // Rebuild ship from current state
$action = $sim->findAction($actionId);   // Look up an action

// Navigation
$sim->seedGraph('tests/_data/catalog/graph.json');  // Load star catalog
```

`advanceUntilIdle()` is the workhorse for scenarios. It finds the next `deferred_until` timestamp among pending actions, jumps the clock to it, processes, and repeats until nothing is pending. A multi-step scan-and-jump resolves in one call.

## CLI Commands

### `wp helm sim ship`

Inspect a simulated ship's system readings. Creates a ship with the default loadout and dumps power, shields, propulsion, sensors, hull, and position.

```bash
wp helm sim ship
wp helm sim ship --format=json
```

Table output:

```
═══════════════════════════════════════
  SIMULATED SHIP: Pioneer
═══════════════════════════════════════

▸ POWER
  Current Power   100.0 / 100.0
  Regen Rate      10.0 /hr
  Output Mult     1.00
  Core Life       750

▸ SHIELDS
  Strength        100.0 / 100.0
  Regen Rate      10.0 /hr

▸ PROPULSION
  Perf Ratio      1.00
  Comfort Range   7.0 ly
  Jump (5 ly)     18000s (5.0h)  cost: 5.0 core

▸ SENSORS
  Range           5.0 ly
  Scan (3 ly)     90s (0.0h)  cost: 6.0 power

▸ HULL
  Integrity       100 / 100

▸ POSITION
  Node            1
```

JSON output returns the same data as a structured object, useful for piping into `jq` or comparing outputs.

### `wp helm sim run`

Run a scenario file through the real PHP game code. Reads the same JSON format as the TS workbench `scenario` command. Each action is dispatched, time advances until it resolves, and a state snapshot is captured.

```bash
wp helm sim run resources/packages/workbench/data/scenarios/scan-and-jump.json
wp helm sim run resources/packages/workbench/data/scenarios/jump-chain.json --format=json
```

Table output shows a timeline: initial state, then each action with its result and all ship states:

```
═══════════════════════════════════════════════════════════════
  SCENARIO: Scan and Jump
═══════════════════════════════════════════════════════════════

  Ship at Sol scans toward Proxima Centauri, then jumps along
  the discovered edge.

▸ t=0s (0.0h) — INITIAL STATE
  explorer      power: 100/100  shield: 100/100  hull: 100/100  core: 750  node: 1

▸ t=90s (0.0h) — scan_route → explorer
  Result: success, edges: 1
  explorer      power: 94/100  shield: 100/100  hull: 100/100  core: 750  node: 1

▸ t=5490s (1.5h) — jump → explorer
  Result: success, dist: 1.30 ly
  explorer      power: 89/100  shield: 100/100  hull: 100/100  core: 749  node: 2
```

The JSON output includes the full timeline array with all ship snapshots at each step, suitable for automated comparison.

### Scenario JSON format

Scenarios define ships and a sequence of actions:

```json
{
  "name": "Scan and Jump",
  "description": "Ship at Sol scans toward Proxima Centauri, then jumps.",
  "masterSeed": "helm",
  "ships": {
    "explorer": {
      "hull": "pioneer",
      "core": "epoch_s",
      "drive": "dr_505",
      "sensor": "vrs_mk1",
      "shield": "aegis_delta",
      "nav": "nav_tier_3",
      "node": 1
    }
  },
  "actions": [
    { "ship": "explorer", "type": "scan_route", "params": { "target_node_id": 2 } },
    { "ship": "explorer", "type": "jump", "params": { "target_node_id": 2 } }
  ]
}
```

The PHP `sim run` command currently supports `scan_route` and `jump` action types. The TS workbench supports the same format with additional action types for combat scenarios.

Ships are created at the specified `node` (default 1). The navigation graph is loaded from `tests/_data/catalog/graph.json` (275 systems within 10 ly of Sol).

## Testing

### SimulationTest

End-to-end tests that prove the game loop works without database I/O. Located at `tests/Wpunit/Simulation/SimulationTest.php`.

```bash
slic run "Wpunit --filter SimulationTest"
```

Covers: ship creation, default loadout, starting position, power state, ship rebuild, scan route dispatch and resolution, time advancement, `advanceUntilIdle`, multi-step scan-then-jump, graph seeding.

Each test boots `Simulation\Provider`, freezes time, seeds a minimal 2-node graph, and runs through the `Simulation` class. No database writes, no WordPress posts.

### ContractTest

Data-driven tests that verify PHP ship systems produce correct values from shared JSON fixtures. Located at `tests/Wpunit/Simulation/ContractTest.php`.

```bash
slic run "Wpunit --filter ContractTest"
```

Fixtures live in `tests/_data/fixtures/ship-state/`:

| File | Cases | Systems tested |
|------|-------|---------------|
| `power.json` | 6 | `getCurrentPower`, `getRegenRate`, `getOutputMultiplier` |
| `shields.json` | 4 | `getCurrentStrength`, `getRegenRate` |
| `propulsion.json` | 4 | `getJumpDuration`, `calculateCoreCost`, `getPerformanceRatio`, `getMaxRange` |
| `sensors.json` | 4 | `getRange`, `getRouteScanDuration`, `getRouteScanCost` |
| `combined.json` | 2 | Cross-system snapshots |

Each fixture specifies a `state` (partial ShipState), `loadout` (product slugs), `now` (unix timestamp), and `expected` values. PHP tests use `assertEqualsWithDelta($expected, $actual, 0.01)`.

### Cross-platform parity

The same fixture files drive TypeScript tests in `resources/packages/holodeck/src/systems/contract.test.ts`. Fixtures with `"skip_ts": true` test PHP-only features (power modes). When both suites pass against the same fixtures, the math is verified across both implementations.

```bash
# PHP
slic run "Wpunit --filter ContractTest"

# TypeScript
bun run test -- --filter contract
```

## File reference

### Simulation runtime

| File | Role |
|------|------|
| `src/Helm/Simulation/Provider.php` | Rebinds container for simulation mode |
| `src/Helm/Simulation/Simulation.php` | Scenario driver (create ships, dispatch, advance) |
| `src/Helm/Simulation/MemoryShipIdentity.php` | Ship identity DTO (replaces `ShipPost`) |
| `src/Helm/Simulation/MemoryShipStateRepository.php` | In-memory ship state |
| `src/Helm/Simulation/MemoryActionRepository.php` | In-memory actions with `claimReady()` |
| `src/Helm/Simulation/MemoryInventoryRepository.php` | In-memory inventory |
| `src/Helm/Simulation/MemoryProductRepository.php` | In-memory product catalog |
| `src/Helm/Simulation/MemoryNodeRepository.php` | In-memory navigation nodes |
| `src/Helm/Simulation/MemoryEdgeRepository.php` | In-memory navigation edges |
| `src/Helm/Simulation/MemoryLoadoutFactory.php` | Builds loadouts from in-memory repos |

### Contracts

| File | Role |
|------|------|
| `src/Helm/ShipLink/Contracts/ShipStateRepository.php` | Ship state storage interface |
| `src/Helm/ShipLink/Contracts/ActionRepository.php` | Action storage interface |
| `src/Helm/ShipLink/Contracts/LoadoutFactory.php` | Loadout building interface |
| `src/Helm/Inventory/Contracts/InventoryRepository.php` | Inventory storage interface |
| `src/Helm/Products/Contracts/ProductRepository.php` | Product catalog interface |
| `src/Helm/Navigation/Contracts/NodeRepository.php` | Navigation node interface |
| `src/Helm/Navigation/Contracts/EdgeRepository.php` | Navigation edge interface |
| `src/Helm/Ships/ShipIdentity.php` | Ship identity interface |

### CLI

| File | Role |
|------|------|
| `src/Helm/CLI/SimCommand.php` | `wp helm sim ship` and `wp helm sim run` |

### Tests

| File | Role |
|------|------|
| `tests/Wpunit/Simulation/SimulationTest.php` | End-to-end simulation tests |
| `tests/Wpunit/Simulation/ContractTest.php` | Fixture-driven parity tests |
| `tests/Support/Helper/FixtureLoader.php` | JSON fixture loading utility |
| `tests/Support/Helper/SystemBuilder.php` | Builds system objects from fixture data |
| `tests/_data/fixtures/ship-state/*.json` | Shared cross-platform fixtures |

### Scenarios

Scenario files live in `resources/packages/workbench/data/scenarios/`. Both the PHP `wp helm sim run` and TS `bun run wb scenario` commands consume the same format.

## Stub convention

In-memory repositories implement every method on their contract. Methods the simulation doesn't exercise throw `BadMethodCallException`:

```php
throw new \BadMethodCallException('MemoryActionRepository::deleteOldCompleted() is not implemented.');
```

If the simulation hits one, it means a code path needs wiring — loud and specific rather than a subtle wrong-answer bug. As scenarios expand to cover more game mechanics, the stubs get replaced with real implementations.
