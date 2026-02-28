# Simulation Testing

How we validate game mechanics through multi-action scenarios with time acceleration, and why the current architecture needs an engine layer to support it.

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

## The Architecture Gap: The Engine

### What We Have

The current action processing flow:

```
Client → REST API → ActionFactory → Validate → Handle → Insert
                                                            ↓
                                            ActionProcessor (cron, 60s)
                                                            ↓
                                            ActionResolver → Load Ship
                                                           → Call Resolver
                                                           → Mutate State
                                                           → Fulfill
```

`ActionProcessor` is effectively the game engine today. It claims ready actions and resolves them one at a time. Each action resolver loads the ship, does its calculations, mutates state, and fulfills the action. This works for the current simple model where actions are independent and the world is static.

### What We Need

The mechanics we've designed (envelopes, sweeps, stellar effects, detection, interdiction) require context that no individual action resolver should be responsible for collecting. Before an action resolves, the engine needs to:

1. **Collect system-wide effects.** What stellar effects are active in this system? Generated constants, random events (ion storm?), player-sourced effects (station security field? interdiction field?), NPC effects (hisec security?). See `stellar-effects.md`.

2. **Compute the effective environment.** Stack all effects into modifier values that feed into the formula chain. These modify formula *inputs*, not outputs — the action resolver sees adjusted parameters, not raw ones.

3. **Evaluate the detection model.** Is this action producing emissions? Are there other ships in the system that might detect those emissions? Should a passive detection event fire?

4. **Check for interrupts.** Is there an active interdiction field? Has the ship's power hit zero during an envelope phase? Should this checkpoint resolve normally or trigger an interrupt?

5. **Pass the collected context to the action resolver.** The resolver does its specific work (jump physics, scan probability, shield regen) with the full environmental context already computed.

### The Engine Layer

```
ActionProcessor (cron)
        ↓
    Engine::tick(Action $action)
        ↓
    ┌─────────────────────────────────────────┐
    │  1. Load ship state                     │
    │  2. Load system context                 │
    │     - Stellar effects (constant)        │
    │     - Random effects (active?)          │
    │     - Player effects (station, ships)   │
    │     - NPC effects (security zone)       │
    │  3. Compute effective environment       │
    │     - Stack all effect modifiers        │
    │     - Apply to formula inputs           │
    │  4. Evaluate detection / interrupts     │
    │  5. Build ActionContext                 │
    │  6. Pass to ActionResolver              │
    └─────────────────────────────────────────┘
        ↓
    ActionResolver::resolve(Action, ActionContext)
        ↓
    Mutate state, schedule next checkpoint or fulfill
```

The engine is the layer between the processor (which just claims and dispatches) and the resolver (which just does action-specific math). The engine is responsible for *understanding the world* at the moment of resolution.

### ActionContext

The engine produces an `ActionContext` that the resolver receives:

```php
class ActionContext
{
    public readonly Ship $ship;
    public readonly EffectStack $effects;        // All active effects, stacked
    public readonly array $modifiers;             // Computed modifier values per formula input
    public readonly array $nearbyShips;           // Ships in system (for detection)
    public readonly ?Interdiction $interdiction;  // Active interdiction, if any
    public readonly SystemInfo $system;            // Current system properties
}
```

Resolvers currently receive `(Action $action, Ship $ship)`. They'd receive `(Action $action, ActionContext $context)` instead. The ship is still there (`$context->ship`), but now the resolver also has the environmental context it needs.

Existing resolvers that don't care about effects (buy, sell, repair) just ignore the extra context. Jump and scan resolvers use the modifiers to adjust their formula inputs. The change is additive — nothing breaks, everything gains capability.

## Simulation Mode

### Purpose

As we build the game engine, we need the ability to create multi-action scenarios that play out over time. This is how we validate that our game rules produce the gameplay we designed. Not unit testing (which validates individual functions) — scenario testing (which validates how systems interact across sequences of actions over hours and days of game time).

The simulation is how we answer "does this actually work?" before players find out it doesn't.

### How It Works

The simulation runs the real game code with two modifications:

1. **Time control.** Instead of waiting for real time to pass, the simulation advances timestamps programmatically. "Advance 6 hours" means all pending checkpoints in that window fire in sequence — envelope draws calculated, sweep peaks rolled, power states updated, all through the real engine code.

2. **Isolation.** Simulation runs don't affect the live game state. They operate on a separate state context (either a transaction that rolls back, a separate database prefix, or in-memory state).

### Interface

```php
interface Simulation
{
    // Setup
    createShip(array $loadout): int;
    setSystem(int $shipId, string $systemId): void;
    applyEffect(string $systemId, Effect $effect): void;

    // Actions
    createAction(int $shipId, ActionType $type, array $params): Action;

    // Time control
    advance(int $seconds): array;  // Returns all events that fired
    advanceTo(DateTimeImmutable $time): array;
    advanceUntilIdle(): array;     // Fast-forward until no pending actions

    // Inspection
    getShipState(int $shipId): ShipState;
    getPowerAt(int $shipId, DateTimeImmutable $time): float;
    getActionHistory(int $shipId): array;
    getSystemEffects(string $systemId): EffectStack;
}
```

### Scenario Examples

**Can a hauler cross the sector?**

```php
$sim = new Simulation();
$hauler = $sim->createShip(['drive' => 'DR-305', 'core' => 'Epoch-S', 'sensor' => 'VRS Mk I']);
$sim->setSystem($hauler, 'sol');

// Jump across 8 systems, comfort range, throttle 1.0
foreach ($route as $target) {
    $sim->createAction($hauler, ActionType::Jump, ['target' => $target]);
    $sim->advanceUntilIdle();
    $state = $sim->getShipState($hauler);
    // Log: power, core life remaining, time elapsed
}

// Result: Did the hauler make it? How much core life remains?
// How does power look at each waypoint? Any leg where they arrived dangerously low?
```

**How hard is it to find prey?**

```php
$sim = new Simulation();
$wolf = $sim->createShip(['drive' => 'DR-705', 'sensor' => 'ACU Mk I', ...]);
$miner = $sim->createShip(['drive' => 'DR-305', 'sensor' => 'DSC Mk I', ...]);
$sim->setSystem($wolf, 'frontier-7');
$sim->setSystem($miner, 'frontier-7');

// Miner is actively mining (emitting)
$sim->createAction($miner, ActionType::Mine, ['target' => 'belt-1']);

// Wolf runs PNP scans repeatedly
$detections = 0;
for ($i = 0; $i < 20; $i++) {
    $sim->createAction($wolf, ActionType::ScanPNP, ['effort' => 1.0]);
    $events = $sim->advanceUntilIdle();
    if (hasDetection($events)) $detections++;
}

// Result: Out of 20 scans over ~10 hours, how many found the miner?
// What if the miner was idle instead of mining?
// What if the wolf used effort 2.0?
```

**How safe is a nullsec miner?**

```php
$sim = new Simulation();
$miner = $sim->createShip([...]);
$sim->setSystem($miner, 'deep-frontier-12');  // Nullsec, no station, no effects

// Mine for 24 hours straight
$sim->createAction($miner, ActionType::Mine, ['target' => 'belt-1']);

// Simulate a wolf arriving at hour 8 and scanning
$wolf = $sim->createShip([...]);
$sim->advanceTo($sim->start()->modify('+8 hours'));
$sim->setSystem($wolf, 'deep-frontier-12');
$sim->createAction($wolf, ActionType::ScanPNP, ['effort' => 1.0]);
$events = $sim->advanceUntilIdle();

// Was the miner detected? If so, what does interdiction look like?
// If the miner had a flee automation script, did they escape before interdiction?
```

**Post-interdiction recovery**

```php
$sim = new Simulation();
$victim = $sim->createShip(['drive' => 'DR-705', 'core' => 'Epoch-E', ...]);
$sim->setSystem($victim, 'frontier-3');

// Simulate post-interdiction state: shields gone, power at 5%
$sim->setShipState($victim, ['power' => 5, 'shields' => 0]);

// How long until they can jump?
// DR-705 spool spike needs ~25 power. Regen rate with Epoch-E...
$canJump = false;
$elapsed = 0;
while (!$canJump) {
    $sim->advance(300);  // 5-minute increments
    $elapsed += 300;
    $state = $sim->getShipState($victim);
    $canJump = $state->power >= 25;  // Simplified — engine would check spool cost
}

// Result: stranded for $elapsed seconds. Is that reasonable?
// How does it differ with DR-305 (lower spool spike)?
// How does it differ with Epoch-S (higher regen)?
```

**Station siege with stellar effects**

```php
$sim = new Simulation();

// The system: player station, ion storm active, 3 defenders, 5 attackers
$sim->setSystem('kepler-9', ['station' => $station]);
$sim->applyEffect('kepler-9', new IonStorm(severity: 0.4));
$sim->applyEffect('kepler-9', $station->getSecurityEffect());  // Counter-PVP

$defenders = [];
for ($i = 0; $i < 3; $i++) {
    $d = $sim->createShip(['drive' => 'DR-505', 'shield' => 'Bastion Mk I', ...]);
    $sim->setSystem($d, 'kepler-9');
    $defenders[] = $d;
}

$attackers = [];
for ($i = 0; $i < 5; $i++) {
    $a = $sim->createShip(['drive' => 'DR-705', 'shield' => 'Aegis Mk I', ...]);
    $sim->setSystem($a, 'kepler-9');
    $attackers[] = $a;
}

// Attackers begin siege
foreach ($attackers as $a) {
    $sim->createAction($a, ActionType::SiegeAttack, ['target' => $station->id]);
}

// Station security engages — no bounty for defenders destroying attackers
foreach ($defenders as $d) {
    $sim->createAction($d, ActionType::Defend, ['target' => $station->id]);
}

// Advance through 48 hours of siege
$events = $sim->advance(3600 * 48);

// Questions this answers:
// - How much damage did the station take? Did it fall?
// - How many attacker ships were destroyed by station defenses + defenders?
// - How did the ion storm affect both sides? (shield regen degraded for everyone)
// - What's the total resource cost for the attackers?
// - Could 3 defenders hold against 5 attackers with station support?
// - At what point did the attackers' power situation become unsustainable?
```

**Vulture during a siege**

```php
// Continuing from the siege above — a vulture arrives at hour 6
$vulture = $sim->createShip(['drive' => 'DR-305', 'sensor' => 'DSC Mk I', ...]);
$sim->advanceTo($sim->start()->modify('+6 hours'));
$sim->setSystem($vulture, 'kepler-9');

// The system is loud — siege emissions everywhere.
// Vulture scans for wrecks (system scan, not PNP)
$sim->createAction($vulture, ActionType::ScanSystem, ['effort' => 0.5]);
$events = $sim->advanceUntilIdle();

// Did the vulture find wreckage? The siege should have produced some by hour 6.
// Quick scan (effort 0.5) because the vulture wants speed, not thoroughness.

// Vulture starts salvaging a wreck
$sim->createAction($vulture, ActionType::Salvage, ['target' => $wreck->id]);

// Now the vulture is emitting. But the system is full of scan noise from
// the siege. Is the vulture's salvage emission lost in the background?
// Does any combatant detect the vulture?

$events = $sim->advanceUntilIdle();

// Questions:
// - Was the vulture detected while salvaging? By whom?
// - How much did they extract before detection (if detected)?
// - What was the emission-to-background-noise ratio during active siege?
// - If the vulture waited until hour 24 (siege winding down, less noise),
//   would they be more or less likely to be detected?
```

**Wolf pack loot capacity**

```php
$sim = new Simulation();

// The prey: a loaded hauler
$hauler = $sim->createShip([
    'drive' => 'DR-305', 'hull' => 'Pioneer',  // Big cargo, slow
    'cargo' => generateCargo(280),               // 280 m³ of mixed ore
]);
$sim->setSystem($hauler, 'frontier-5');

// The pack: one interceptor, two hauler-wolves
$interceptor = $sim->createShip([
    'drive' => 'DR-705', 'shield' => 'Aegis Mk I',  // Combat fit, ~50 m³ cargo
]);
$wolf_hauler_1 = $sim->createShip([
    'drive' => 'DR-505', 'hull' => 'Pioneer',  // 200 m³ cargo, light weapons
]);
$wolf_hauler_2 = $sim->createShip([
    'drive' => 'DR-505', 'hull' => 'Pioneer',
]);

// All wolves in system
foreach ([$interceptor, $wolf_hauler_1, $wolf_hauler_2] as $w) {
    $sim->setSystem($w, 'frontier-5');
}

// Interceptor finds and interdicts the hauler
$sim->createAction($interceptor, ActionType::Interdict, ['target' => $hauler]);
$events = $sim->advanceUntilIdle();
// → Shield drain complete. Hauler's cargo is accessible.

// Cargo window opens. All three wolves transfer what they can carry.
$sim->createAction($interceptor, ActionType::Loot, ['target' => $hauler]);
$sim->createAction($wolf_hauler_1, ActionType::Loot, ['target' => $hauler]);
$sim->createAction($wolf_hauler_2, ActionType::Loot, ['target' => $hauler]);
$events = $sim->advanceUntilIdle();

// Questions:
// - Total cargo capacity of the pack: ~450 m³. Hauler had 280 m³.
//   Did they strip it clean?
// - How long did the looting take? (The haulers are emitting during transfer)
// - What if the hauler's allies arrive during the cargo window?
// - What's left in the wreck for a vulture? (Components, hull, leftover cargo?)
// - What if the pack only had the interceptor? How much of the 280 m³ is wasted?
// - Total component wear on the interceptor from the engagement?
```

**Reinforcement timing**

```php
$sim = new Simulation();

// Station under siege in kepler-9
// ... (siege setup as above)

// Allied reinforcements are 3 systems away
$reinforcements = [];
for ($i = 0; $i < 4; $i++) {
    $r = $sim->createShip(['drive' => 'DR-705', ...]);
    $sim->setSystem($r, 'sol');  // 3 jumps away
    $reinforcements[] = $r;
}

// Reinforcements start jumping immediately
foreach ($reinforcements as $r) {
    $sim->createAction($r, ActionType::Jump, ['target' => 'waypoint-1']);
}

// Key question: how long to arrive?
// 3 jumps × DR-705 duration + spool + cooldown between jumps
// vs siege timeline — does the station hold long enough?

$events = $sim->advanceUntilIdle();

// Questions:
// - When do reinforcements arrive relative to siege progress?
// - What power/shield state are reinforcements in when they arrive?
//   (back-to-back jumps with DR-705 means heavy power drain)
// - Do they arrive combat-ready or do they need recovery time?
// - What if they used DR-305 (slower but arrive with more power)?
// - What's the minimum number of defenders needed to hold until reinforcements arrive?
```

### CLI Integration

The simulation should be drivable from WP-CLI for scripted analysis:

```bash
# Run a named scenario
wp helm sim run hauler-cross-sector --drive=DR-305 --core=Epoch-S

# Run a scenario file (YAML or JSON describing a sequence)
wp helm sim run-file scenarios/interdiction-recovery.yml

# Compare two configurations
wp helm sim compare --a="drive=DR-705,core=Epoch-E" --b="drive=DR-505,core=Epoch-S" --scenario=comfort-jump

# Run the full analysis battery
wp helm sim analyse

# Answer a specific design question
wp helm sim run pvp-detection-rate --scans=50 --system=nullsec
```

## Implementation Path

### Phase 1: Engine Layer

Extract the "understand the world" logic from action resolvers into a dedicated Engine class. This is prerequisite for everything else.

- Define `ActionContext` with ship + effect stack + modifiers
- Create `Engine::tick()` that builds context and delegates to resolver
- Refactor `ActionResolver` to accept `ActionContext`
- Existing behavior unchanged (empty effect stack, no detection)

### Phase 2: Stellar Effects Infrastructure

Build the effects system that the engine collects.

- Effect model: source, type, modifiers, duration
- Effect storage: per-system, queryable
- Generated stellar effects from star properties
- Effect stacking logic
- Engine collects and applies effects before resolution

### Phase 3: Time Control

Build the simulation harness.

- `Simulation` class with time control (advance, advanceTo, advanceUntilIdle)
- Isolated state context (transaction-based or prefixed)
- Ship creation and configuration without going through normal flows
- WP-CLI commands for running scenarios

### Phase 4: Scenario Framework

Build the tooling for writing and running repeatable scenarios.

- Scenario definition format (YAML/JSON)
- Assertion framework (expected power levels, expected events, expected durations)
- Comparison mode (run same scenario with different configurations)
- Analysis output (structured reports, diffable)

### Phase 5: Detection and Interaction

Add multi-ship scenarios.

- Detection model in the engine (emission calculation, passive detection rolls)
- Interdiction as an engine-level interrupt
- Multi-ship scenarios in the simulation
- Automation trigger simulation

## Open Questions

- **State isolation.** Transaction rollback is cleanest but limits scenario length (transaction size). Separate database prefix is more robust but requires setup/teardown. In-memory state would be fastest but diverges from the real storage layer.

- **Deterministic randomness.** Scan sweep rolls, detection rolls, random stellar events — all need to be seeded for reproducible scenarios. The simulation needs a seeded RNG that produces identical results across runs.

- **Performance.** Advancing 24 hours of game time with multiple ships and checkpoint-frequency resolution could mean thousands of engine ticks. Needs to be fast enough for interactive use (seconds, not minutes).

- **Scenario portability.** Can we export a scenario definition and its results so that future code changes can be regression-tested against known-good outputs? A scenario that produces different numbers after a code change tells you exactly what changed and whether it was intentional.
