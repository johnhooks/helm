# Power Systems Design

## Overview

The warp core is central to all ship operations. Every system's capability is tied to core output, creating meaningful resource management decisions.

## Core Resources

### Core Life (Strategic)
- **Permanent, degrading resource**
- Represents the physical health of the warp core
- Depletes based on mode and system usage
- Cannot be regenerated in the field - requires station service
- When depleted: ship is derelict

### Power (Tactical)
- **Regenerating resource**
- Represents available energy for operations
- Consumed by actions (jumps, scans, shields)
- Regenerates over time based on core output
- When depleted: must wait for regen or change mode

## Power Modes

Players choose one mode. No sliders, no micromanagement.

| Mode       | Output | Decay Rate | Regen Rate | Use Case              |
|------------|--------|------------|------------|-----------------------|
| Efficiency | 70%    | 0%         | 50%        | Stranded, conserving  |
| Normal     | 100%   | baseline   | 100%       | Standard operations   |
| Overdrive  | 130%   | 250%       | 130%       | Emergency, pushing it |

### Mode Effects

**Output Multiplier** - Scales ALL system capabilities:
- Max scan range
- Max jump distance
- Jump speed
- Shield strength
- Regen rate

**Decay Multiplier** - Scales core life consumption:
- Efficiency: 0% (no decay, safe harbor)
- Normal: 100% (baseline)
- Overdrive: 250% (burning hot)

## System Contributions

Each system reports its contribution to power calculations. Ship orchestrates.

### Propulsion (Drive)

Drives have different power appetites:

| Drive | Consumption | Sustain | Amplitude | Character              |
|-------|-------------|---------|-----------|------------------------|
| DR-3  | 60%         | High    | Low       | Long hauls, efficient  |
| DR-5  | 100%        | Medium  | Medium    | Balanced               |
| DR-7  | 150%        | Low     | High      | Fast sprints, hungry   |

**Sustain** - How far can you jump (distance)
**Amplitude** - How fast do you jump (speed)
**Consumption** - How much power the drive demands

A drive performs based on how well-fed it is:

```
powerRatio = coreOutput / driveConsumption
performance = min(1.0, powerRatio)
```

**DR-7 on Efficiency mode:**
- Core output: 70%
- Drive consumption: 150%
- Ratio: 0.47 → Drive at 47% performance
- Worse than DR-5 on Efficiency (70/100 = 70%)
- But it works - gets you limping home

**DR-7 on Overdrive:**
- Core output: 130%
- Drive consumption: 150%
- Ratio: 0.87 → Drive at 87% performance
- Fast, but burning core at 2.5x rate

### Sensors

| Sensor | Range Base | Power/Hour | Character           |
|--------|------------|------------|---------------------|
| SRS    | 5 ly       | 5          | Short range, cheap  |
| MRS    | 10 ly      | 10         | Medium range        |
| LRS    | 20 ly      | 20         | Long range, hungry  |

Effective range = `baseRange × coreOutputMultiplier`

### Navigation Computer

| Tier | Skill | Efficiency | Character                    |
|------|-------|------------|------------------------------|
| 1    | 0.6   | 0.7        | Basic, short routes          |
| 2    | 0.7   | 0.8        | Improved                     |
| 3    | 0.8   | 0.85       | Advanced                     |
| 4    | 0.9   | 0.9        | Military grade               |
| 5    | 0.95  | 0.95       | Experimental, best discovery |

Nav tier affects route discovery probability, not power consumption.

## Calculation Formulas

### Core Decay Rate (per hour)

```
decayRate = baseDecay
          × mode.decayMultiplier
          × drive.consumptionFactor
          × (sensors.isActive ? sensors.decayContribution : 1.0)
          × (future: system health penalties)
```

Only accumulates when:
- Mode is Normal or Overdrive (Efficiency = 0 decay)
- Ship is performing actions

### Jump Calculations

**Max Jump Distance (Sustain):**
```
maxDistance = drive.sustain × core.outputMultiplier × drive.performanceRatio
```

**Jump Duration (Amplitude):**
```
baseDuration = distance × BASE_SECONDS_PER_LY
duration = baseDuration / (drive.amplitude × core.outputMultiplier × drive.performanceRatio)
```

**Jump Power Cost:**
```
powerCost = distance × drive.consumptionFactor × mode.outputMultiplier
```

**Jump Core Decay:**
```
coreDecay = distance
          × core.baseDecayRate
          × mode.decayMultiplier
          × drive.consumptionFactor
```

### Scan Calculations

**Max Scan Range:**
```
maxRange = sensor.baseRange × core.outputMultiplier
```

**Scan Duration:**
```
duration = distance × sensor.timePerLy
```

**Scan Power Cost:**
```
powerCost = duration × sensor.powerPerHour
```

**Power Balance During Scan:**
```
netPowerPerHour = core.regenRate - sensor.powerPerHour
finalPower = currentPower + (netPowerPerHour × scanHours)
```

If `finalPower < 0`, player needs more power buffer or lower mode.

### Power Regeneration

```
regenRate = core.baseRegenRate × mode.outputMultiplier × (coreLife / maxCoreLife)
```

Note: As core life depletes, regen rate decreases. Damaged cores regenerate slower.

## System Layers

The navigation system demonstrates the layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│   ShipLink\Ship (orchestrator)                              │
│   - Gathers system contributions                            │
│   - Calculates combined costs                               │
│   - Validates resources                                     │
│   - Calls systems to execute                                │
├─────────────────────────────────────────────────────────────┤
│   ShipLink\System\Navigation (ship's nav computer)          │
│   - Player interface: "Computer, plot a course"             │
│   - Knows nav tier, skill, efficiency                       │
│   - Delegates to NavigationService for graph work           │
│   - Reports contributions to Ship                           │
├─────────────────────────────────────────────────────────────┤
│   Navigation\NavigationService (graph infrastructure)       │
│   - Pure graph operations                                   │
│   - No knowledge of ships, power, or core life              │
│   - Takes primitives, returns results                       │
├─────────────────────────────────────────────────────────────┤
│   Navigation\Repositories (storage)                         │
│   - NodeRepository, EdgeRepository, RouteRepository         │
└─────────────────────────────────────────────────────────────┘
```

### System\Navigation Uses NavigationService

The ship's nav computer delegates graph operations:

```php
// ShipLink\System\Navigation.php
public function __construct(
    private ShipModel $model,
    private NavigationService $navService,
) {}

public function getRouteInfo(int $targetNodeId): RouteInfo|WP_Error
{
    $currentNodeId = $this->getCurrentPosition();
    return $this->navService->getEdgeInfo($currentNodeId, $targetNodeId);
}

public function scanForRoutes(int $targetNodeId): ScanResult
{
    return $this->navService->scan(
        fromNodeId: $this->getCurrentPosition(),
        toNodeId: $targetNodeId,
        skill: $this->getSkill(),
        efficiency: $this->getEfficiency(),
    );
}
```

### NavigationService Becomes Pure Graph Operations

No Ship dependency - just primitives in, results out:

```php
// Navigation\NavigationService.php
public function getEdgeInfo(int $fromNodeId, int $toNodeId): RouteInfo|WP_Error
{
    // Validates nodes exist, edge exists
    // Returns distance, edge info
}

public function scan(
    int $fromNodeId,
    int $toNodeId,
    float $skill,
    float $efficiency
): ScanResult {
    // Pure graph discovery
    // No knowledge of ships
}
```

## Ship Orchestration Pattern

Ship gathers contributions and orchestrates calculations. Systems own their state mutations.

```php
interface PowerSystem {
    // State
    public function getPower(): float;
    public function getCoreLife(): float;
    public function getMode(): PowerMode;

    // Contributions (for Ship to gather)
    public function getOutputMultiplier(): float;
    public function getBaseDecayRate(): float;
    public function getRegenRate(): float;

    // Mutations (Ship calls these)
    public function consumePower(float $amount): void;
    public function consumeCoreLife(float $amount): void;
    public function setMode(PowerMode $mode): void;
}

interface Propulsion {
    // Contributions
    public function getConsumptionFactor(): float;
    public function getSustain(): float;
    public function getAmplitude(): float;
    public function getDecayContribution(): float;

    // Calculated (needs core output)
    public function getPerformanceRatio(float $coreOutput): float;
}

interface Sensors {
    // Contributions
    public function getBaseRange(): float;
    public function getPowerPerHour(): float;
    public function getDecayContribution(): float;
    public function isActive(): bool;
}
```

### Action Flow

```
1. Player initiates action (jump to node X)

2. Ship gathers system contributions
   → power.getOutputMultiplier()
   → drive.getConsumptionFactor()
   → drive.getSustain()

3. Ship calculates combined costs
   → calculateJumpCoreCost(distance)
   → calculateJumpPowerCost(distance)
   → calculateJumpDuration(distance)

4. Ship validates
   → Do we have enough core life?
   → Do we have enough power?
   → Is distance within max range?

5. Ship executes via system calls
   → power.consumeCoreLife(coreCost)
   → power.consumePower(powerCost)
   → navigation.setPosition(targetNode)

6. Ship returns result with details
```

## Player Decisions

The system creates meaningful tensions:

### Before a Jump
- "This costs 40 power. I have 60. I'll arrive with 20. Enough to scan or flee?"
- "Overdrive gets me there faster, but costs 15 core life instead of 6."
- "My DR-7 on efficiency is slower than a DR-5, but I'm conserving core."

### Before a Scan
- "4 hour scan at 10 power/hr. My regen is 8/hr. I'll be -8 by the end."
- "Do I have 8 power buffer? Or drop to efficiency and scan slower?"
- "Overdrive lets me scan 15 ly instead of 10 ly. Worth the decay?"

### Strategic
- "Core life at 30%. Every overdrive hour costs me. Save it for emergencies."
- "Stuck in empty space. Efficiency mode, wait for power, limp to nearest star."
- "Rich system nearby, worth burning core to get there fast and claim it."

## Future Considerations

### System Health
Systems could have their own health/degradation:
```php
public function getHealthPenalty(): float;  // 1.0 = healthy, 1.5 = damaged
```

Damaged drive = more core decay, worse performance.
Damaged sensors = reduced range, higher power consumption.

### Core Replacement
Stations could offer core replacement/repair:
- Full replacement: expensive, restores 100%
- Partial repair: cheaper, restores some %
- Creates economy sink

### Emergency Protocols
- Core dump: Sacrifice massive core life for one huge action
- Emergency shutdown: Instant efficiency mode, no actions for X time
- Distress beacon: Calls for help, reveals position

## Migration Path

Current state:
- `Ships\Ship` value object with `fuel`, `driveRange`
- `ShipLink\Ship` with systems, but not fully integrated
- `NavigationService` uses old `Ship` pattern

Target state:
- Remove old `fuel`, `driveRange` from value object
- All calculations through ShipLink orchestration
- NavigationService accepts ShipLink, delegates to it

Steps:
1. Add PowerMode enum
2. Update PowerSystem contract with mode support
3. Update Propulsion contract with consumption/sustain/amplitude
4. Implement calculation methods on Ship
5. Update NavigationService to use ShipLink
6. Remove old Ship properties
7. Update tests
