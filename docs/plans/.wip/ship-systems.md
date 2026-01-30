# Ship Systems Architecture Plan

Status: Core architecture complete. Action processing layer remaining.

## Overview

ShipLink is the starship interface - the abstraction through which all ship interactions occur. Ships are WordPress CPTs (for admin integration, comments, descriptions) with operational state stored in custom tables for performance.

## Storage Architecture

### Hybrid: CPT + Custom Tables

**Ship CPT (wp_posts + meta)**
- `post_title` → ship name
- `post_content` → captain's log / description
- `post_author` → owner user ID
- Comments → crew notes, event log
- Revisions → history

**Ship Systems Table (helm_ship_systems)**
```sql
ship_post_id bigint PRIMARY KEY
-- Component configuration (smallint IDs → PHP enums)
core_type, drive_type, sensor_type, shield_type, nav_tier

-- Regenerating resources (datetime "full_at" pattern)
power_full_at, power_max
shields_full_at, shields_max

-- Static state
core_life, hull_integrity, hull_max

-- Position & activity
node_id, cargo (JSON), current_action_id

-- Timestamps
created_at, updated_at
```

**Ship Actions Table (helm_ship_actions)**
```sql
id bigint PRIMARY KEY
ship_post_id bigint
action_type varchar(50)      -- 'scan_route', 'jump', etc.
params longtext              -- JSON
status varchar(20)           -- pending/running/fulfilled/partial/failed
deferred_until datetime      -- for waiting/delayed actions
result longtext              -- JSON
created_at, updated_at
```

**User Meta**
- Credits (economy is per-player, not per-ship)

## Component Types

Hardware configurations are int-backed PHP enums with config methods:

### CoreType (Warp Cores)
| Type | Core Life | Regen Rate | Jump Cost | Base Output |
|------|-----------|------------|-----------|-------------|
| Epoch-E (Endurance) | 1000 ly | 5/hr | 0.75x | 0.9x |
| Epoch-S (Standard) | 750 ly | 10/hr | 1.0x | 1.0x |
| Epoch-R (Rapid) | 500 ly | 20/hr | 1.5x | 1.1x |

Base output affects all systems that scale with power (drive range, sensor range).

### DriveType (Propulsion)
| Type | Amplitude (Speed) | Consumption (Power Appetite) | Sustain (Range) |
|------|-------------------|------------------------------|-----------------|
| DR-305 (Economy) | 0.5x | 0.6x | 10 ly |
| DR-505 (Standard) | 1.0x | 1.0x | 7 ly |
| DR-705 (Boost) | 2.0x | 1.5x | 5 ly |

Performance ratio = min(1.0, coreOutput / consumption). Hungry drives underperform when underpowered.

### SensorType
Different manufacturers, all Mk I (first generation):
| Type | Range | Survey Duration | Success Chance |
|------|-------|-----------------|----------------|
| DSC Mk I (DeepScan) | 20 ly | 2.0x | 0.6 |
| VRS Mk I (Versa) | 12 ly | 1.0x | 0.7 |
| ACU Mk I (Acuity) | 6 ly | 0.5x | 0.85 |

### ShieldType
Aegis series with Greek letter designations:
| Type | Capacity | Regen Rate |
|------|----------|------------|
| Aegis Alpha | 50 | 20/hr |
| Aegis Beta | 100 | 10/hr |
| Aegis Gamma | 200 | 5/hr |

### NavTier (1-5)
Higher tiers → better skill/efficiency for route discovery.

## System Contracts

Each ship system has a contract interface:

```
Contracts/
├── PowerMetrics   # read-only power data (output multiplier, regen rate)
├── PowerSystem    # extends PowerMetrics, adds mutations (consume, etc.)
├── Propulsion     # jump duration, range, performance ratio
├── Sensors        # scan range, success chance, survey duration
├── Shields        # shield regen, damage absorption
├── Hull           # integrity, damage, repair
├── Navigation     # tier, skill, efficiency, position
└── ShipLink       # main interface, orchestrates systems
```

Systems that need power data receive `PowerMetrics` (read-only). Only Ship holds `PowerSystem` for mutations. This prevents systems from accidentally consuming resources.

## Action System

### ActionType (string-backed enum)
- `scan_route`, `jump`, `survey`, `scan_planet`
- `mine`, `refine`
- `buy`, `sell`, `transfer`
- `repair`, `upgrade`

### ActionStatus
- `pending` - queued, waiting to start
- `running` - currently being processed
- `fulfilled` - completed successfully
- `partial` - completed with partial results
- `failed` - completed with error

### Deferred Actions
`deferred_until` datetime for actions waiting on:
- Power regeneration
- Cooldowns
- External conditions

## Processing Flow

```
Request: "Ship X performs Action Y"
           │
           ▼
┌──────────────────────────────────┐
│  Load Ship Model from storage    │
│  (CPT + systems table)           │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ShipFactory                     │
│  - Read component types          │
│  - Build system instances        │
│  - Inject current state          │
│  - Return ShipLink               │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ShipLink.process(Action)        │
│  - Systems compute changes       │
│  - Model mutated directly        │
│  - Returns ActionResult          │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ActionProcessor                 │
│  - Saves mutated model           │
│  - Queues follow-up if needed    │
│  - Returns result to caller      │
└──────────────────────────────────┘
```

## Key Classes

### ShipModel
Mutable. Combines data from CPT and systems table.

```php
class ShipModel {
    // Identity (from CPT)
    public int $postId;
    public string $name;
    public int $ownerId;

    // Components (from systems table, maps to enums)
    public CoreType $coreType;
    public DriveType $driveType;
    public SensorType $sensorType;
    public ShieldType $shieldType;
    public NavTier $navTier;

    // State (from systems table, mutated during processing)
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
}
```

### ShipSystemsRepository
Loads from CPT + systems table. Saves back to both.

### ShipFactory
Builds ShipLink from ShipModel. Instantiates system implementations based on component types.

### ShipLink
The starship interface. Holds systems, processes actions, mutates model.

### ActionProcessor
Orchestrates: load → build → process → save.

```php
class ActionProcessor {
    public function execute(int $shipPostId, Action $action): ActionResult
    {
        $model = $this->repo->find($shipPostId);
        $shipLink = $this->factory->build($model);
        $result = $shipLink->process($action);

        if (!$result->hasCriticalErrors()) {
            $this->repo->save($shipLink->getModel());
        }

        return $result;
    }
}
```

### ActionResult
Collects outcomes from each system. Can contain WP_Error instances.

```php
$result->get('power');   // PowerResult or WP_Error
$result->get('sensors'); // SensorResult or WP_Error
$result->hasErrors();
$result->hasCriticalErrors();
```

## Action Scheduler Integration

Time-based actions (scans, jumps, mining) are queued via Action Scheduler:

1. Action created with `status = 'pending'`
2. If requires time, schedule completion via AS
3. Worker fires at completion time
4. ActionProcessor completes the action
5. Status updated to fulfilled/partial/failed

```php
as_schedule_single_action(
    $completesAt->getTimestamp(),
    'helm_complete_ship_action',
    ['action_id' => $actionId],
    'helm-ships'
);
```

## Multi-Ship Scenarios

For combat, trade, or co-op, separate processors coordinate multiple ShipLinks:

```php
class TradeProcessor {
    public function execute(int $sellerId, int $buyerId, TradeAction $action): TradeResult
    {
        $seller = $this->factory->build($this->repo->find($sellerId));
        $buyer = $this->factory->build($this->repo->find($buyerId));

        // Validate both sides
        // Execute trade
        // Save both models
    }
}
```

## Files Created

```
src/Helm/ShipLink/
├── Components/
│   ├── CoreType.php
│   ├── DriveType.php
│   ├── SensorType.php
│   ├── ShieldType.php
│   └── NavTier.php
├── Contracts/
│   ├── PowerMetrics.php      # read-only power interface
│   ├── PowerSystem.php       # extends PowerMetrics
│   ├── Propulsion.php
│   ├── Sensors.php
│   ├── Shields.php
│   ├── Hull.php
│   ├── Navigation.php
│   └── ShipLink.php
├── System/
│   ├── Power.php
│   ├── Propulsion.php
│   ├── Sensors.php
│   ├── Shields.php
│   ├── Hull.php
│   └── Navigation.php
├── Action.php
├── ActionResult.php
├── ActionStatus.php
├── ActionType.php
├── Provider.php
├── Ship.php                  # ShipLink implementation
├── ShipFactory.php
├── ShipModel.php
├── ShipSystems.php           # table row DTO
├── ShipSystemsRepository.php
└── SystemResult.php

src/Helm/CLI/
├── ShipCommand.php           # create, diagnostic, list
└── DbCommand.php             # migrate, status, drop
```

Schema in `src/Helm/Database/Schema.php`:
- `helm_ship_systems` table
- `helm_ship_actions` table

## Implementation Status

**Completed:**
- [x] ShipModel class
- [x] ShipSystemsRepository (hybrid CPT + table loading/saving)
- [x] ShipFactory (builds ShipLink with DI-wired systems)
- [x] Ship (ShipLink implementation)
- [x] System implementations (Power, Propulsion, Sensors, Shields, Hull, Navigation)
- [x] Provider (DI wiring)
- [x] CLI commands (create, diagnostic, list)
- [x] Database schema (helm_ship_systems, helm_ship_actions tables)

**Still To Build:**
- [ ] ActionProcessor (orchestrates load → build → process → save)
- [ ] ActionRepository (persistence for helm_ship_actions)
- [ ] Action Scheduler integration (time-based actions)
- [ ] REST controllers (ship API endpoints)

## Design Decisions

1. **Hybrid storage** - CPT for WordPress integration, custom table for operational state
2. **State in model, mutate directly** - Simple for now, interfaces allow change later
3. **Component configs in enums** - No separate table until we need dynamic components
4. **String-backed ActionType** - Database readability over minor performance
5. **Int-backed component types** - Compact storage, enum handles slug/label
6. **DateTime for timestamps** - Timezone stability
7. **No foreign keys** - dbDelta limitation, enforce in application code
8. **Credits on user** - Economy is per-player, not per-ship
