# ShipLink Architecture

Design document for the ship system architecture. ShipLink is the starship interface - the abstraction through which all ship interactions occur.

## Overview

```
Controller / Worker
       │
       ▼
ActionProcessor (orchestrates)
       │
       ├── ShipRepo::find(id) → ShipModel
       │
       ├── ShipFactory::build(model) → ShipLink
       │
       ├── ShipLink::process(Action) → ActionResult
       │       └── Internal systems mutate model
       │       └── Each system contributes to result
       │
       ├── ShipRepo::save(model)
       │
       └── Maybe queue follow-up action
       │
       ▼
ActionResult returned to caller
```

## Core Components

### Storage: Hybrid CPT + Custom Table

Ship data is split between two storage mechanisms:

**Ship CPT (wp_posts + meta)** - Rarely-changing data, WordPress integration
- Post title → ship name
- Post content → captain's log / description
- Post author → owner user ID
- Comments → crew notes, event log
- Meta: component configuration (core_type, drive_type, sensor_type, nav_tier)

**Ship Systems Table (helm_ship_systems)** - Frequently-changing state
- power_full_at, power_max, core_life
- node_id (current position)
- cargo
- current_action_id

**User Meta** - Player-level data
- credits (economy is per-player, not per-ship)

This split gives us WordPress admin integration (descriptions, comments, revisions) while keeping operational state in a fast, typed custom table.

### ShipModel

Combines data from both sources. Mutable for direct state changes.

```php
class ShipModel {
    // Identity (from CPT)
    public int $postId;
    public string $shipId;         // UUID
    public string $name;
    public int $ownerId;

    // Component configuration (from post meta)
    public string $coreType;       // "Epoch-R", "Epoch-S", "Epoch-E"
    public string $driveType;      // "DR-7", "DR-5", "DR-3"
    public string $sensorType;     // "SR-L", "SR-S", "SR-H"
    public int $navTier;           // 1-5

    // State (from helm_ship_systems table, mutated during processing)
    public int $powerFullAt;       // timestamp when power will be full
    public float $powerMax;        // maximum power capacity
    public float $coreLife;        // remaining light-years
    public ?int $nodeId;           // current position
    public array $cargo;
    public ?int $currentActionId;
}
```

### ShipSystemsRepository

Persistence layer for the `helm_ship_systems` table. Handles operational state.

```php
class ShipSystemsRepository {
    public function find(int $shipPostId): ?ShipSystems;
    public function findOrCreate(int $shipPostId): ShipSystems;
    public function save(ShipSystems $systems): bool;
}
```

### ShipFactory

Builds a live ShipLink from model data. Wires all system dependencies.

```php
class ShipFactory {
    public function __construct(
        private ShipSystemsRepository $systemsRepository,
        private NavigationService $navigationService,
    ) {}

    public function buildFromModel(ShipModel $model): ShipLink
    {
        // Power system first - others depend on it
        $power = new Power($model);

        // Systems that need power metrics for calculations
        $propulsion = new Propulsion($model, $power);  // PowerMetrics
        $sensors = new Sensors($model, $power);        // PowerMetrics

        // Remaining systems
        $navigation = new Navigation($model, $this->navigationService);
        $shields = new Shields($model);
        $hull = new Hull($model);

        return new Ship($model, $power, $propulsion, $sensors, ...);
    }
}
```

Component types (CoreType, DriveType, etc.) are enums with behavior. The same system classes work with any component - behavior varies based on enum values.

### ShipLink

The starship interface. From outside, you talk to ShipLink - the internal systems are implementation details.

- Receives actions
- Delegates to internal systems
- Systems mutate model directly
- Collects results from each system
- Returns aggregate ActionResult

```php
class ShipLink {
    public function __construct(
        private ShipModel $model,
        private PowerSystemInterface $power,
        private PropulsionInterface $propulsion,
        private SensorInterface $sensors,
        // ... other systems
    ) {}

    public function process(Action $action): ActionResult
    {
        $result = new ActionResult();

        // Dispatch to appropriate handler based on action type
        // Systems interact through interfaces during processing
        // Each system adds its outcome to result

        return $result;
    }

    public function getModel(): ShipModel
    {
        return $this->model;
    }
}
```

ShipLink has no knowledge of persistence. It operates on the model it was given.

### ActionProcessor

Orchestrates the full flow: load → build → process → save.

```php
class ActionProcessor {
    public function __construct(
        private ShipRepository $repo,
        private ShipFactory $factory,
    ) {}

    public function execute(int $ship_id, Action $action): ActionResult
    {
        // Load
        $model = $this->repo->find($ship_id);
        if (!$model) {
            return ActionResult::withError(
                new WP_Error('ship_not_found', 'Ship not found')
            );
        }

        // Build
        $shipLink = $this->factory->build($model);

        // Process
        $result = $shipLink->process($action);

        // Don't save if critical errors
        if ($result->hasCriticalErrors()) {
            return $result;
        }

        // Save mutated model
        $this->repo->save($shipLink->getModel());

        return $result;
    }
}
```

## System Interfaces

Each ship system has an interface. Systems receive the model and any dependencies they need.

### PowerMetrics (Read-Only)

Systems that need power data receive `PowerMetrics` - a read-only interface:

```php
interface PowerMetrics {
    public function getOutputMultiplier(): float;
    public function getRegenRate(): float;
}
```

This prevents systems from accidentally consuming power or core life. Only Ship orchestrates mutations.

### PowerSystem (Full Access)

Extends PowerMetrics with mutation methods. Only Ship holds this interface.

```php
interface PowerSystem extends PowerMetrics {
    public function getCurrentPower(): float;
    public function consume(float $amount): bool;
    public function getCoreLife(): float;
    public function consumeCoreLife(float $amount): void;
}
```

### Propulsion

Calculates range and duration based on drive specs and power output:

```php
interface Propulsion {
    public function getMaxRange(): float;      // sustain × output × perf ratio
    public function canReach(float $distance): bool;
    public function getJumpDuration(float $distance): int;
    public function getPerformanceRatio(): float;
}
```

### Sensors

Calculates scan range based on sensor specs and power output:

```php
interface Sensors {
    public function getRange(): float;         // base × output multiplier
    public function canScan(float $distance): bool;
    public function getRouteScanCost(float $distance): float;
}
```

### Dependency Injection

Systems receive PowerMetrics for calculations:

```php
class Propulsion implements PropulsionContract {
    public function __construct(
        private ShipModel $model,
        private PowerMetrics $powerMetrics,  // read-only
    ) {}

    public function getMaxRange(): float
    {
        return $this->model->driveType->sustain()
            * $this->powerMetrics->getOutputMultiplier()
            * $this->getPerformanceRatio();
    }
}
```

## Actions and Results

### Action

Actions carry intent and parameters. They have a `type` discriminator.

```php
class Action {
    public string $type;
    public array $params;

    public static function scan(int $target, int $depth = 1): self
    {
        return new self('scan_route', [
            'target' => $target,
            'depth' => $depth,
        ]);
    }

    public static function jump(int $destination): self
    {
        return new self('jump', [
            'destination' => $destination,
        ]);
    }
}
```

### ActionResult

Collects outcomes from each system involved in processing.

```php
class ActionResult {
    /** @var array<string, SystemResult|WP_Error> */
    private array $outcomes = [];

    public function add(string $system, SystemResult|WP_Error $outcome): void
    {
        $this->outcomes[$system] = $outcome;
    }

    public function hasErrors(): bool
    {
        foreach ($this->outcomes as $outcome) {
            if (is_wp_error($outcome)) {
                return true;
            }
        }
        return false;
    }

    public function hasCriticalErrors(): bool
    {
        foreach ($this->outcomes as $outcome) {
            if (is_wp_error($outcome) && $outcome->get_error_data('critical')) {
                return true;
            }
        }
        return false;
    }

    public function getErrors(): array
    {
        return array_filter($this->outcomes, 'is_wp_error');
    }

    public function get(string $system): SystemResult|WP_Error|null
    {
        return $this->outcomes[$system] ?? null;
    }

    public function toArray(): array
    {
        // Serialize for REST response
    }

    public static function withError(WP_Error $error): self
    {
        $result = new self();
        $result->add('processor', $error);
        return $result;
    }
}
```

Example result from a scan action:

```php
$result->get('power');   // PowerResult{consumed: 20, remaining: 45}
$result->get('sensors'); // SensorResult{queued: true, completes_at: 1706486400}
$result->get('nav');     // WP_Error('target_out_of_range', '...')
```

## Action Queue (Action Scheduler)

Some actions complete immediately. Others take real time and must be queued.

### Queuing an Action

```php
// In ShipLink::process() or ActionProcessor
if ($action->requiresTime()) {
    $completes_at = time() + $duration;

    as_schedule_single_action(
        $completes_at,
        'helm_complete_ship_action',
        [
            'ship_id' => $this->model->id,
            'action_id' => $action_record_id,
        ],
        'helm-ships'
    );

    return ActionResult::queued($completes_at);
}
```

### Worker Handles Completion

```php
add_action('helm_complete_ship_action', function(int $ship_id, int $action_id) {
    $action_record = get_action_record($action_id);

    $result = helm(ActionProcessor::class)->complete(
        $ship_id,
        $action_record
    );

    // Handle result - maybe notify player, queue follow-up
});
```

### Action Records

Active/pending actions are stored separately from the ship model:

```php
// Could be custom table or CPT
class ActionRecord {
    public int $id;
    public int $ship_id;
    public string $type;
    public array $params;
    public int $started_at;
    public int $completes_at;
    public string $status;  // 'pending', 'processing', 'completed', 'failed'
}
```

## Multi-Ship Scenarios

For combat, trade, or co-op, a higher-level processor orchestrates multiple ShipLinks:

```php
class TradeProcessor {
    public function execute(
        int $seller_id,
        int $buyer_id,
        TradeAction $action
    ): TradeResult {
        // Load both
        $seller_model = $this->repo->find($seller_id);
        $buyer_model = $this->repo->find($buyer_id);

        // Build both
        $seller = $this->factory->build($seller_model);
        $buyer = $this->factory->build($buyer_model);

        // Validate
        if (!$seller->canTrade($action)) {
            return TradeResult::error('seller_cannot_trade');
        }
        if (!$buyer->canAfford($action)) {
            return TradeResult::error('buyer_cannot_afford');
        }

        // Execute on both
        $seller_result = $seller->processSale($action);
        $buyer_result = $buyer->processPurchase($action);

        // Save both
        $this->repo->save($seller->getModel());
        $this->repo->save($buyer->getModel());

        return new TradeResult($seller_result, $buyer_result);
    }
}
```

Each ShipLink remains isolated. The processor coordinates.

## REST Controller Example

```php
class ShipActionsController {
    public function scan(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $ship_id = $request->get_param('ship_id');
        $user_id = get_current_user_id();

        // Verify ownership
        $ship = helm(ShipRepository::class)->find($ship_id);
        if (!$ship || $ship->owner_id !== $user_id) {
            return new WP_Error('forbidden', 'Not your ship', ['status' => 403]);
        }

        // Build action
        $action = Action::scan(
            target: $request->get_param('target'),
            depth: $request->get_param('depth') ?? 1,
        );

        // Process
        $result = helm(ActionProcessor::class)->execute($ship_id, $action);

        if ($result->hasCriticalErrors()) {
            $error = $result->getErrors()[0];
            return new WP_Error(
                $error->get_error_code(),
                $error->get_error_message(),
                ['status' => 400]
            );
        }

        return new WP_REST_Response($result->toArray(), 200);
    }
}
```

## Design Decisions

### State Lives in Model

Systems mutate `ShipModel` directly during processing. No delta tracking (yet).

If we need change history later, we can:
- Wrap model in a change-tracking proxy
- Have systems return deltas instead of mutating
- Add event sourcing

Interfaces isolate this decision.

### ShipLink Has No Persistence Knowledge

ShipLink operates on the model it receives. It doesn't know about repositories, databases, or saving. The `ActionProcessor` handles persistence.

This means:
- ShipLink is testable without database
- Factory can build ShipLink from any source
- Persistence strategy can change without affecting ShipLink

### Systems Interact Through Interfaces

When propulsion needs to check power, it calls `PowerSystemInterface::getCurrentPower()`, not `$this->model->power_full_at`.

This means:
- Systems are decoupled
- Can mock systems for testing
- Power implementation can change without affecting propulsion

### Errors as WP_Error

Using WordPress's native error type because:
- REST API handles it natively
- Familiar to WP developers
- Supports error codes, messages, and data

## Future Considerations

- **Component damage**: Systems could have degraded states affecting performance
- **Crew bonuses**: Crew abilities could modify system behavior
- **AI automation**: Standing orders could trigger actions automatically
- **Event broadcasting**: Notify other systems/players of significant events
