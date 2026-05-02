# Sensors

## Overview

Sensors are the ship's eyes. They gather data about the universe - distant stars, nearby ships, planetary compositions, hidden anomalies. Without sensors, you're flying blind.

Sensors serve two primary exploration functions:

1. **Route scanning** - Detecting waypoints between stars for navigation
2. **System surveys** - Analyzing planets, resources, and points of interest

These roles want different things from sensors, creating a meaningful equipment choice.

## The Tradeoff: Range vs Resolution

A sensor array can be optimized for distance or detail, but not both.

**Long-range sensors** see further:

-   Can target distant stars for route scanning
-   Better first-hop success at long distances
-   But: System surveys are slow and less detailed

**High-resolution sensors** see deeper:

-   Fast, thorough system surveys
-   Detect hidden resources and anomalies
-   But: Limited range for route scanning

This creates two distinct exploration roles.

## Exploration Roles

### Scout

Scouts push into unknown space, discovering routes for others to follow.

**Priorities:**

-   Reach distant stars
-   Reveal waypoints quickly
-   Map the frontier

**Ideal sensors:** Long-range
**Ideal core:** Epoch-R (fast regen for frequent scanning)
**Ideal drive:** DR-705 Boost (cover ground quickly)

_"First to arrive, first to file the route, first to move on."_

### Surveyor

Surveyors thoroughly document what's in each system - planets, resources, opportunities.

**Priorities:**

-   Complete system surveys
-   Find hidden resources
-   Generate detailed data

**Ideal sensors:** High-resolution
**Ideal core:** Epoch-E (patient, long-lasting)
**Ideal drive:** DR-305 Economy (in no hurry)

_"The scout found the system. I found the platinum deposits."_

## Sensor Types

First-generation sensors come from three competing manufacturers — **Deep Scan Dynamics**, **Versa Instruments**, and **Acuity Systems** — each optimizing for different use cases. See `manufacturers.md` for their full stories. All are Mk I (first generation) — future upgrades will be Mk II, III, etc.

| Model    | Base Range | Survey Speed | Accuracy | Character               |
| -------- | ---------- | ------------ | -------- | ----------------------- |
| DSC Mk I | 20 ly      | 2x time      | 60%      | _"What's out there?"_   |
| VRS Mk I | 12 ly      | 1x           | 70%      | _"Jack of all trades."_ |
| ACU Mk I | 6 ly       | 0.5x time    | 85%      | _"What's down there?"_  |

_Starting values subject to balancing._

Effective range scales with core output. At full power, you get base range. In efficiency mode (70% output), your VRS Mk I sees 8.4 ly instead of 12 ly. This creates meaningful tradeoffs when conserving power.

### DSC Mk I (DeepScan)

Optimized for distance. Can detect and scan toward stars that other sensors can't reach.

-   Route scanning: Can target stars up to 20 ly away
-   System surveys: Slow and basic
-   Good for: Scouts, frontier exploration, route discovery

### ACU Mk I (Acuity)

Optimized for detail. Produces thorough surveys quickly.

-   Route scanning: Limited to nearby stars (6 ly)
-   System surveys: Fast and comprehensive
-   Good for: Surveyors, resource hunting, thorough exploration

### VRS Mk I (Versa)

The baseline. Adequate at both roles.

-   Route scanning: Moderate range (12 ly)
-   System surveys: Normal speed
-   Good for: General purpose, new players, balanced builds

## Power Consumption

All sensor operations consume power. This creates operational tempo - you can't spam scans.

| Operation                | Power Cost                 |
| ------------------------ | -------------------------- |
| Route scan               | 15-25 (varies by distance) |
| System survey (per hour) | 5-10                       |
| Passive detection        | Free                       |

After scanning, you may need to wait for power to regenerate before jumping. This pacing is intentional - it gives weight to each action.

### The Scan-Wait-Jump Rhythm

```
Scan toward destination → power depleted
Wait for regeneration → core type matters
Jump to waypoint → core life consumed
Arrive → repeat
```

A hot core (Epoch-R) regens quickly - scan and jump frequently.
A cold core (Epoch-E) regens slowly - plan your scans carefully.

## How Sensors Affect Route Scanning

Sensors feed data to the nav computer. Better sensor data means better route computation.

**Sensor contribution:**

-   Range determines which stars you can target
-   Power/quality affects first-hop success rate

**Nav computer contribution:**

-   Skill affects multi-hop discovery (reveal more waypoints per scan)
-   Efficiency affects... (TBD - power cost? accuracy?)

The two systems work together. Great sensors with a bad nav computer means good data, poorly processed. Great nav computer with weak sensors means excellent processing of limited data.

## How Sensors Affect System Surveys

When surveying a star system (planets, resources, anomalies):

**Survey speed** - How quickly you complete scan milestones

-   SR-H completes surveys in half the time
-   SR-L takes twice as long

**Survey depth** - What you can detect

-   High-res sensors might reveal hidden resources or anomalies
-   Long-range sensors get basic data only

Survey results are shared (see system-scanning.md) - the reward is discovery credit, not information hoarding.

## Detection

Beyond exploration, sensors provide awareness:

-   **Ship detection** - See other ships in the area
-   **Derelict detection** - Find abandoned ships for salvage
-   **Hazard warning** - Early warning of navigation dangers
-   **Anomaly detection** - Discover unusual phenomena

Detection range scales with sensor range. A long-range sensor sees ships further out. A high-res sensor might identify ship types more accurately at close range.

## Passive vs Active

Sensors have two modes:

**Passive** (always on, free):

-   Basic detection within short range
-   No power cost
-   Doesn't reveal your position

**Active** (manual, costs power):

-   Full range and capability
-   Route scanning and system surveys require active mode
-   May be detectable by others (future PvP consideration)

You're never completely blind, but meaningful scanning requires power investment.

## Future Considerations

### Sensor Upgrades

Could sensors be enhanced with modules?

-   Extended range boosters
-   Resolution enhancers
-   Power efficiency improvements
-   Specialized detection (minerals, life signs, anomalies)

### Sensor Damage

Could sensors be damaged?

-   Failed jumps might stress sensor arrays
-   Combat damage
-   Degradation over time?
-   Repair vs replace decisions

### Stealth and Detection

If PvP becomes relevant:

-   Active scanning reveals your position
-   Some ships might optimize for low sensor signature
-   Cat-and-mouse gameplay between detection and stealth

### Mark Progression

-   **Mk II** — Each archetype improves. DSC Mk II sees further (24 ly) with less survey penalty (1.6x instead of 2.0x). ACU Mk II gains moderate range (8 ly) while keeping its precision edge. The identities persist; the weaknesses soften.
-   **Mk III** — Endgame sensors. A DSC Mk III has extreme range with reasonable survey speed. An ACU Mk III is competitive in range while remaining surgical. The gap between archetypes narrows but never closes — the tradeoff always matters.

**New archetypes at higher marks:**

-   **MIL (Military Detection Array)** — Appears at Mk II. Optimized for ship detection and tracking, not exploration. Short range for route scanning, but identifies ship types, loadouts, and heading at distance. The combat pilot's sensor.
-   **Science arrays** — Anomaly analysis, research bonuses, unknown signal decryption. The surveyor who wants to understand, not just catalog.

### Crossover Sensors

Manufacturers from other domains build sensors that reflect their home expertise:

-   An Epoch sensor that draws from core life instead of power — scan endlessly if you're willing to burn the core
-   A DSC shield that boosts passive sensor range while active — the defense company that couldn't stop thinking about distance
-   See `manufacturers.md` for the full crossover concept

### Specialized Arrays

Beyond the founding manufacturers:

-   **Mining sensors** — Bonus to resource detection and composition analysis
-   **Combat sensors** — Tracking, targeting, signature analysis
-   **Science sensors** — Anomaly analysis, research bonuses
