# ShipLink Architecture

Design document for the ship system architecture. ShipLink is the starship interface - the abstraction through which all ship interactions occur.

## Overview

```
Controller / Worker
       │
       ▼
ActionProcessor (orchestrates)
       │
       ├── ShipFactory::build(postId) → ShipLink
       │       └── Loads ShipPost (identity) + ShipSystems (state)
       │       └── Builds and wires all System classes
       │
       ├── ShipLink::process(Action) → ActionResult
       │       └── Systems provide read-only queries and calculations
       │       └── Ship mutates ShipSystems directly
       │       └── Each system contributes to result
       │
       ├── ShipSystemsRepository::save(systems)
       │
       └── Maybe queue follow-up action
       │
       ▼
ActionResult returned to caller
```

## Core Components

### Storage: Hybrid CPT + Custom Table

Ship data is split between two storage mechanisms:

**Ship CPT (wp_posts + meta)** - Identity and WordPress integration

-   Post title → ship name
-   Post content → captain's log / description
-   Post author → owner user ID
-   Comments → crew notes, event log
-   Meta: ship UUID

**Ship Systems Table (helm_ship_systems)** - All mutable state

-   Component configuration (core_type, drive_type, sensor_type, etc.)
-   power_full_at, power_max, core_life
-   shields_full_at, shields_max
-   hull_integrity, hull_max
-   node_id (current position)
-   cargo
-   current_action_id

**User Meta** - Player-level data

-   credits (economy is per-player, not per-ship)

This split gives us WordPress admin integration while keeping operational state in a fast, typed custom table with dirty tracking.

### ShipPost

Immutable identity wrapper for the WordPress CPT:

```php
readonly class ShipPost {
    public function postId(): int;
    public function shipId(): string;  // UUID
    public function name(): string;
    public function ownerId(): int;

    public static function fromId(int $postId): ?self;
}
```

### ShipSystems

Pure data model for operational state. Extends `Database\Model` for dirty tracking. Contains NO domain logic - all behavior lives in System classes.

```php
class ShipSystems extends Model {
    // Configuration (from enums)
    public CoreType $coreType;
    public DriveType $driveType;
    public SensorType $sensorType;
    public ShieldType $shieldType;
    public NavTier $navTier;

    // State (mutated by Ship during processing)
    public PowerMode $powerMode;
    public ?DateTimeImmutable $powerFullAt;
    public float $powerMax;
    public ?DateTimeImmutable $shieldsFullAt;
    public float $shieldsMax;
    public float $coreLife;
    public float $hullIntegrity;
    public float $hullMax;
    public ?int $nodeId;
    public array $cargo;
    public ?int $currentActionId;

    // Dirty tracking inherited from Model
    public function isDirty(): bool;
    public function getDirty(): array;
    public function syncOriginal(): void;
}
```

### ShipSystemsRepository

Persistence layer using dirty tracking for efficient partial updates.

```php
class ShipSystemsRepository {
    public function find(int $shipPostId): ?ShipSystems;
    public function findOrCreate(int $shipPostId): ShipSystems;
    public function save(ShipSystems $systems): bool;  // Uses getDirtyRow()
    public function update(ShipSystems $systems): bool;
}
```

### ShipFactory

Builds a live ShipLink from post ID. Loads data and wires all system dependencies.

```php
class ShipFactory {
    public function __construct(
        private ShipSystemsRepository $systemsRepository,
        private NavigationService $navigationService,
    ) {}

    public function build(int $shipPostId): ShipLink
    {
        $shipPost = ShipPost::fromId($shipPostId);
        $systems = $this->systemsRepository->findOrCreate($shipPostId);

        return $this->buildFromParts($shipPost, $systems);
    }

    public function buildFromParts(ShipPost $post, ShipSystems $systems): ShipLink
    {
        // Power system first - others depend on it for power calculations
        $power = new Power($systems);

        // Systems that need power metrics for calculations
        $propulsion = new Propulsion($systems, $power);
        $sensors = new Sensors($systems, $power);

        // Remaining systems
        $navigation = new Navigation($systems, $this->navigationService);
        $shields = new Shields($systems);
        $hull = new Hull($systems);
        $cargo = new Cargo($systems);

        return new Ship(
            post: $post,
            systems: $systems,
            powerSystem: $power,
            propulsionSystem: $propulsion,
            sensorSystem: $sensors,
            navigationSystem: $navigation,
            shieldSystem: $shields,
            hullSystem: $hull,
            cargoSystem: $cargo,
        );
    }
}
```

Component types (CoreType, DriveType, etc.) are enums with behavior. The same System classes work with any component - behavior varies based on enum values.

### ShipLink

The starship interface. From outside, you talk to ShipLink - the internal systems are implementation details.

-   Receives actions
-   Gathers data from systems (read-only queries and calculations)
-   Ship mutates ShipSystems directly based on system calculations
-   Collects results from each system
-   Returns aggregate ActionResult

```php
interface ShipLink {
    // Identity (from ShipPost)
    public function getId(): int;
    public function getName(): string;
    public function getOwnerId(): int;

    // Raw data access
    public function getRecord(): ShipSystems;

    // Action processing
    public function process(Action $action): ActionResult;
    public function canProcess(Action $action): bool;

    // System accessors
    public function power(): PowerSystem;
    public function propulsion(): Propulsion;
    public function sensors(): Sensors;
    public function navigation(): Navigation;
    public function shields(): Shields;
    public function hull(): Hull;
    public function cargo(): Cargo;
}
```

ShipLink has no knowledge of persistence. It operates on the data it was given.

### ActionProcessor

Orchestrates the full flow: load → build → process → save.

```php
class ActionProcessor {
    public function __construct(
        private ShipFactory $factory,
        private ShipSystemsRepository $systemsRepo,
    ) {}

    public function execute(int $shipPostId, Action $action): ActionResult
    {
        // Build (loads data internally)
        $ship = $this->factory->build($shipPostId);

        // Process (Ship mutates ShipSystems based on system calculations)
        $result = $ship->process($action);

        // Don't save if critical errors
        if ($result->hasCriticalErrors()) {
            return $result;
        }

        // Save mutated state (only dirty fields updated)
        $this->systemsRepo->save($ship->getRecord());

        return $result;
    }
}
```

## System Architecture

### Systems = Read-Only Query Objects

Systems are **read-only** - they query state and calculate values but **never mutate**.
Ship is the **single mutator** of ShipSystems.

```
┌────────────────────────────────────────┐
│ ShipSystems (Pure Data Model)          │
│ - Properties only                      │
│ - Dirty tracking                       │
│ - No domain methods                    │
└────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────┐
│ Systems (Read-Only)                    │
│ - Query: getCurrentPower(), isDepleted()│
│ - Calculate: calculateIntegrityAfter() │
│ - NO mutation methods                  │
└────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────┐
│ Ship (Single Mutator)                  │
│ - Gathers data from Systems            │
│ - Validates and decides                │
│ - Mutates ShipSystems directly         │
└────────────────────────────────────────┘
```

### System Implementation Example

Systems only read from ShipSystems and provide calculations:

```php
final class Hull implements HullContract {
    public function __construct(private ShipSystems $systems) {}

    // Read-only query
    public function getIntegrity(): float {
        return $this->systems->hullIntegrity;
    }

    public function isDestroyed(): bool {
        return $this->systems->hullIntegrity <= 0.0;
    }

    // Calculation - returns what the new value would be
    public function calculateIntegrityAfterRepair(float $amount): float {
        return min($this->systems->hullMax, $this->systems->hullIntegrity + $amount);
    }
}
```

### Ship as Orchestrator

Ship gathers from systems, validates, and mutates:

```php
final class Ship {
    private function processRepair(Action $action): ActionResult {
        $amount = $action->params['amount'];

        // System calculates the result
        $newIntegrity = $this->hullSystem->calculateIntegrityAfterRepair($amount);

        // Ship mutates directly
        $this->systems->hullIntegrity = $newIntegrity;

        return $result;
    }
}
```

### Cross-System Dependencies

Systems that need data from other systems receive the system interface:

```php
final class Propulsion implements PropulsionContract {
    public function __construct(
        private ShipSystems $systems,
        private PowerSystem $power,  // For getOutputMultiplier()
    ) {}

    public function getMaxRange(): float {
        return $this->systems->driveType->sustain()
            * $this->power->getOutputMultiplier()
            * $this->getPerformanceRatio();
    }
}
```

Since systems are read-only, there's no risk of Propulsion accidentally mutating power state.

## Actions and Results

### Action

Actions carry intent and parameters:

```php
class Action {
    public ActionType $type;
    public array $params;

    public static function jump(int $targetNodeId): self {
        return new self(ActionType::Jump, ['target_node_id' => $targetNodeId]);
    }
}
```

### ActionResult

Collects outcomes from each system involved in processing:

```php
class ActionResult {
    /** @var array<string, SystemResult|WP_Error> */
    private array $outcomes = [];

    public function add(string $system, SystemResult|WP_Error $outcome): self;
    public function hasErrors(): bool;
    public function hasCriticalErrors(): bool;
    public function get(string $system): SystemResult|WP_Error|null;
}
```

## Design Principles

### ShipSystems = Pure Data

ShipSystems contains NO domain logic. All behavior lives in System classes:

-   Easier to test systems in isolation
-   Clear separation of concerns
-   Adding a column = change model, changing behavior = change system

### Systems Own Their Domain

Each System is responsible for:

-   Reading its relevant properties from ShipSystems
-   Computing derived values (current power from timestamps, etc.)
-   Providing `calculate*` methods that return what mutations would produce
-   Providing state checks (isDestroyed, isDepleted, etc.)

Ship uses system calculations to decide what to mutate.

### ShipLink Has No Persistence Knowledge

ShipLink operates on the data it receives. It doesn't know about repositories or databases. The caller handles persistence:

-   ShipLink is testable without database
-   Factory can build ShipLink from any source
-   Persistence strategy can change without affecting ShipLink

### Dirty Tracking for Efficiency

ShipSystems extends `Database\Model` with dirty tracking:

```php
$systems->hullIntegrity = 50.0;
if ($systems->isDirty()) {
    $repo->update($systems);  // Only updates hull_integrity column
}
```

### Errors as WP_Error

Using WordPress's native error type because:

-   REST API handles it natively
-   Familiar to WP developers
-   Supports error codes, messages, and data

## Future Considerations

-   **Component damage**: Systems could have degraded states affecting performance
-   **Crew bonuses**: Crew abilities could modify system behavior
-   **AI automation**: Standing orders could trigger actions automatically
-   **Event broadcasting**: Notify other systems/players of significant events
