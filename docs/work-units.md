# Work Units

How ships perform actions. Origin processes everything.

## Overview

Work units are the fundamental unit of activity in Helm. Every action a ship takes - traveling, scanning, mining - is a work unit that takes real time to complete.

There are no ticks. No polling. Just scheduled work that completes when it's ready.

```
Ship sends command to Origin
    │
    ▼
Origin creates work unit
    │
    ▼
Origin schedules completion (Action Scheduler)
    │
    ▼
Player goes about their life
    │
    ▼
Hours later: scheduled action fires
    │
    ▼
Origin executes work, updates state
    │
    ▼
Ship polls or gets notified, sees results
```

## No Ticks

### The Old Model (Removed)

```
Every 10 seconds:
├── Check all pending work
├── Process anything due
├── Update all ship systems
└── Repeat forever

Problems:
- Constant overhead
- Checking things that aren't ready
- Designed for real-time combat
- Doesn't fit async exploration
```

### The New Model

```
Work unit created:
├── Calculate completion time
├── Schedule single action for that time
└── Done. Nothing until then.

When scheduled time arrives:
├── Action fires for that specific unit
├── Origin executes work
├── State updated
└── Done.
```

No background processing. No regular intervals. Just direct scheduling.

## Work Unit Types

```php
enum WorkUnitType: string
{
    case Travel = 'travel';     // Move between nodes
    case Scan = 'scan';         // Discover new nodes/edges
    case Mine = 'mine';         // Extract resources
    case Dock = 'dock';         // Station interaction
    case Refuel = 'refuel';     // Replenish fuel
    case Repair = 'repair';     // Fix damage
}
```

### Travel

Move from one node to another.

```php
[
    'type' => 'travel',
    'params' => [
        'from_node' => 'HIP_8102',
        'to_node' => 'HIP_16537',
        'route' => ['HIP_8102', 'interstellar_001', 'HIP_16537'],
    ],
    'duration' => 28800,                 // 8 hours
    'fuel_cost' => 50,
]
```

### Scan

Discover new nodes and edges from current location.

```php
[
    'type' => 'scan',
    'params' => [
        'from_node' => 'HIP_8102',
        'direction' => 247,              // Scan direction (degrees)
        'depth' => 3,                    // How deep to scan
    ],
    'duration' => 14400,                 // 4 hours
    'generates' => true,                 // Will produce new content
]
```

### Mine

Extract resources from current location.

```php
[
    'type' => 'mine',
    'params' => [
        'node' => 'HIP_8102',
        'target' => 'asteroid_belt_1',
        'resource' => 'platinum',
    ],
    'duration' => 21600,                 // 6 hours
]
```

### Dock

Interact with a station.

```php
[
    'type' => 'dock',
    'params' => [
        'node' => 'HIP_8102',
        'station' => 'tau_ceti_station',
    ],
    'duration' => 1800,                  // 30 minutes
    'enables' => ['trade', 'refuel', 'repair'],
]
```

## Work Unit Lifecycle

### States

```
pending      → Created, not yet started
in_progress  → Started, scheduled for completion
complete     → Executed, results applied
failed       → Something went wrong
cancelled    → Player cancelled before completion
```

### Flow

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [pending] ──start──► [in_progress] ──execute──►      │
│                              │                          │
│                              │ (scheduled time arrives) │
│                              ▼                          │
│                        [complete]                       │
│                              │                          │
│                         (state updated,                 │
│                          ship notified)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

Cancellation possible from: pending, in_progress
```

## Implementation

### Work Unit Structure

```php
class WorkUnit
{
    public string $id;
    public string $ship_id;
    public WorkUnitType $type;
    public array $params;
    public int $duration;
    public int $created_at;
    public ?int $started_at;
    public ?int $completes_at;
    public string $status;
    public ?array $result;
}
```

### Starting Work (Origin)

```php
class WorkService
{
    public function start(WorkUnit $unit): void
    {
        // Validate ship can do this work
        $this->validate($unit);

        // Update state
        $unit->status = 'in_progress';
        $unit->started_at = time();
        $unit->completes_at = time() + $unit->duration;

        // Persist
        $this->repository->save($unit);

        // Schedule completion
        as_schedule_single_action(
            $unit->completes_at,
            'helm_work_complete',
            ['unit_id' => $unit->id]
        );
    }
}
```

### Completion Handler (Origin)

```php
add_action('helm_work_complete', function(string $unit_id) {
    $service = helm(WorkService::class);
    $unit = $service->find($unit_id);

    if (!$unit || $unit->status !== 'in_progress') {
        return; // Already processed or cancelled
    }

    // Execute the work
    $result = $service->execute($unit);

    // Store result
    $unit->result = $result;
    $unit->status = 'complete';
    $service->save($unit);

    // Update ship state
    $service->applyResult($unit);

    // Notify ship (optional webhook or poll)
    $service->notifyShip($unit);
});
```

### Executing Work (Origin)

```php
class WorkService
{
    public function execute(WorkUnit $unit): array
    {
        return match($unit->type) {
            WorkUnitType::Travel => $this->executeTravel($unit),
            WorkUnitType::Scan => $this->executeScan($unit),
            WorkUnitType::Mine => $this->executeMine($unit),
            WorkUnitType::Dock => $this->executeDock($unit),
            WorkUnitType::Refuel => $this->executeRefuel($unit),
            WorkUnitType::Repair => $this->executeRepair($unit),
        };
    }

    private function executeScan(WorkUnit $unit): array
    {
        $generator = helm(SystemGenerator::class);

        // Generate content deterministically
        $discovered = $generator->scan(
            $unit->params['from_node'],
            $unit->params['direction'],
            $unit->params['depth'],
        );

        return [
            'type' => 'scan',
            'discovered' => $discovered,
        ];
    }

    private function executeMine(WorkUnit $unit): array
    {
        $ship = $this->ships->find($unit->ship_id);
        $location = $unit->params['node'];
        $resource = $unit->params['resource'];

        // Calculate yield based on duration, equipment, location
        $yield = $this->calculateMiningYield($unit, $ship);

        return [
            'type' => 'mine',
            'resource' => $resource,
            'quantity' => $yield,
        ];
    }

    private function executeTravel(WorkUnit $unit): array
    {
        return [
            'type' => 'travel',
            'arrived_at' => $unit->params['to_node'],
            'fuel_used' => $unit->fuel_cost,
        ];
    }
}
```

### Applying Results (Origin)

```php
class WorkService
{
    public function applyResult(WorkUnit $unit): void
    {
        $ship = $this->ships->find($unit->ship_id);
        $result = $unit->result;

        match($unit->type) {
            WorkUnitType::Travel => $this->applyTravel($ship, $result),
            WorkUnitType::Scan => $this->applyScan($ship, $result),
            WorkUnitType::Mine => $this->applyMine($ship, $result),
            // ...
        };
    }

    private function applyTravel(Ship $ship, array $result): void
    {
        $ship->location = $result['arrived_at'];
        $ship->fuel -= $result['fuel_used'];
        $this->ships->save($ship);
    }

    private function applyScan(Ship $ship, array $result): void
    {
        foreach ($result['discovered']['nodes'] as $node) {
            $this->discoveries->record($node, $ship->id);
        }
        foreach ($result['discovered']['edges'] as $edge) {
            $this->discoveries->recordEdge($edge, $ship->id);
        }
    }

    private function applyMine(Ship $ship, array $result): void
    {
        $this->inventory->add(
            $ship->id,
            $result['resource'],
            $result['quantity']
        );
    }
}
```

## Cancellation

Players can cancel work that hasn't completed yet.

```php
class WorkService
{
    public function cancel(WorkUnit $unit): bool
    {
        if (!in_array($unit->status, ['pending', 'in_progress'])) {
            return false; // Can't cancel completed work
        }

        // Remove scheduled action
        as_unschedule_action('helm_work_complete', ['unit_id' => $unit->id]);

        // Update status
        $unit->status = 'cancelled';
        $unit->cancelled_at = time();
        $this->repository->save($unit);

        // Refund partial fuel/resources if applicable
        $this->refundPartial($unit);

        return true;
    }
}
```

## Duration Calculation

Different work types have different base durations, modified by conditions.

```php
class DurationCalculator
{
    public function calculate(WorkUnitType $type, array $params, Ship $ship): int
    {
        $base = match($type) {
            WorkUnitType::Travel => $this->travelDuration($params),
            WorkUnitType::Scan => $this->scanDuration($params),
            WorkUnitType::Mine => $this->mineDuration($params),
            WorkUnitType::Dock => 1800,      // 30 minutes
            WorkUnitType::Refuel => 3600,    // 1 hour
            WorkUnitType::Repair => 7200,    // 2 hours base
        };

        // Apply modifiers from equipped artifacts
        $modifiers = $this->getArtifactModifiers($ship);

        return $this->applyModifiers($base, $modifiers);
    }

    private function travelDuration(array $params): int
    {
        $distance = $this->calculateDistance(
            $params['from_node'],
            $params['to_node']
        );

        // 1 light year = 1 hour (game time)
        return (int) ($distance * 3600);
    }

    private function scanDuration(array $params): int
    {
        $depth = $params['depth'] ?? 1;

        return match($depth) {
            1 => 7200,      // 2 hours
            2 => 14400,     // 4 hours
            3 => 28800,     // 8 hours
            default => 28800,
        };
    }
}
```

## Concurrent Work

Ships can have multiple work units, but with constraints.

```php
class WorkService
{
    public function canStart(Ship $ship, WorkUnit $unit): bool
    {
        $active = $this->getActiveWork($ship->id);

        // Some work types are exclusive
        if ($unit->type === WorkUnitType::Travel) {
            if ($this->hasActiveType($active, WorkUnitType::Travel)) {
                return false; // Can't travel while traveling
            }
            if ($this->hasActiveType($active, WorkUnitType::Mine)) {
                return false; // Can't travel while mining
            }
        }

        // Scanning can happen during travel
        if ($unit->type === WorkUnitType::Scan) {
            return true; // Always allowed
        }

        // Mining requires being stationary
        if ($unit->type === WorkUnitType::Mine) {
            if ($this->hasActiveType($active, WorkUnitType::Travel)) {
                return false;
            }
        }

        return true;
    }
}
```

## Ship Communication

### Ship Submits Work

```
POST {origin}/helm/work
{
    "ship_id": "ship-enterprise",
    "type": "mine",
    "params": {
        "node": "HIP_8102",
        "target": "asteroid_belt_1",
        "resource": "platinum"
    }
}

Response:
{
    "unit_id": "work-12345",
    "status": "in_progress",
    "completes_at": 1706580000,
    "estimated_duration": 21600
}
```

### Ship Checks Status

```
GET {origin}/helm/work/work-12345

Response:
{
    "unit_id": "work-12345",
    "status": "complete",
    "result": {
        "type": "mine",
        "resource": "platinum",
        "quantity": 47
    }
}
```

## Storage

Work units are stored on Origin, either as custom post types or custom table.

### Custom Table (Recommended)

```sql
CREATE TABLE {$wpdb->prefix}helm_work_units (
    id VARCHAR(36) PRIMARY KEY,
    ship_id VARCHAR(36) NOT NULL,
    type VARCHAR(32) NOT NULL,
    params JSON NOT NULL,
    duration INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at INT NOT NULL,
    started_at INT,
    completes_at INT,
    result JSON,
    INDEX idx_ship_status (ship_id, status),
    INDEX idx_completes_at (completes_at)
);
```

## API Endpoints

### Ship → Origin

```
POST /helm/work              - Submit work unit
GET  /helm/work              - List ship's work units
GET  /helm/work/{id}         - Get specific work unit
POST /helm/work/{id}/cancel  - Cancel work unit
```

## Summary

Work units in Helm:

1. **Origin processes everything** - Ships submit, Origin computes
2. **Event-driven** - No ticks, just scheduled completions
3. **Real time** - Hours/days, not seconds
4. **Async-friendly** - Start work, check back later
5. **Deterministic** - Same inputs = same outputs (for future federation)

The player experience:

```
Morning: Start a scan toward unexplored space (4 hours)
Noon: Check in - scan complete, new system discovered!
       Start mining platinum (6 hours)
Evening: Mining complete, 47 platinum collected
         Start travel to trade hub (8 hours)
Next morning: Arrived at station, ready to trade
```

No grinding. No waiting at your screen. Just decisions and time.
