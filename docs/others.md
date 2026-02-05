# The Others

An alien presence competing for the same universe. Discovered gradually, never fully understood.

## Design Intent

The Others exist to:
- Give players a shared enemy and reason to cooperate
- Provide PvE combat that feels meaningful
- Create endgame content that escalates over time
- Make the universe feel alive and contested
- Channel aggression toward a worthy target instead of other players
- Provide unique salvage (alien components with different properties)

The Others are not a story you read. They're a presence you discover through gameplay.

## Discovery Arc

The Others are introduced in phases, controlled by the developers. Each phase adds more evidence and eventually direct interaction. The pace is real-world months between phases.

### Phase 1: Signs

Players pushing into deep frontier start finding things that don't add up.

```
ANOMALIES
├── A belt that should be fresh but the count is already low
├── Resource deposits with extraction patterns that don't match any player
├── Wreckage from ships that aren't in any player database
├── Strange signal anomalies that don't decode
├── Waypoints with residual energy signatures
└── Systems where expected resources are just... missing
```

No explanation. No announcement. Just data that doesn't fit. Players who pay attention start comparing notes. Forum threads appear: "Has anyone else seen depleted belts in the outer rim?"

The game says nothing. The world just... has evidence.

### Phase 2: Evidence

Someone finds infrastructure that nobody built.

```
ALIEN PLATFORMS
├── Mining platforms of unknown design
├── Actively extracting resources from belts
├── Components are scannable — unfamiliar models
├── Usage counts are high — they've been working for a while
├── Can be salvaged (with difficulty)
├── Destroying one yields alien components
└── More appear over time
```

Players can study these platforms. Scan them. The components inside use different models — not Epoch cores or DR drives. Something else. They're efficient in ways human tech isn't, but fragile in ways human tech isn't.

The platforms don't defend themselves. They're infrastructure, not military. But they're competing for your belts.

### Phase 3: Contact

First sighting of Other ships.

```
OTHER SHIPS
├── Appear in resource-rich systems
├── Mining belts, deploying platforms
├── Don't attack unless provoked
├── Will defend their platforms if threatened
├── Move between systems over days (same async timescale)
├── Can be scanned — reveals alien component loadouts
└── Multiple ships start appearing in rich sectors
```

The Others operate on the same timescale as players. They don't swarm in real-time. You check in and see "an Other ship has entered the system." It mines. It moves on. It's doing exactly what you do — exploring, extracting, building.

First contact is unsettling, not explosive. They're not invading. They're just... also here.

### Phase 4: Competition

The Others start actively competing for territory.

```
TERRITORIAL BEHAVIOR
├── Others concentrate in resource-rich sectors
├── Their platforms deplete belts faster than player platforms
├── They begin avoiding systems with heavy player presence
├── But they don't abandon rich systems easily
├── Destroying their platforms slows them — they rebuild
└── Ignoring them means losing access to the best resources
```

This is where the game shifts. Previously, resource competition was player vs. player (indirect, through depletion). Now there's a third party consuming resources at scale. That metallic belt cluster you found? The Others found it too. And their extraction rate is higher than yours.

### Phase 5: Conflict

The Others become aggressive when their territory is threatened.

```
ESCALATION
├── Destroy enough of their platforms → their ships become hostile
├── Other combat ships appear (not the same as their miners)
├── They target player platforms in contested systems
├── They don't pursue into core systems (yet)
├── Coordinated player defense can push them out of a sector
└── But they relocate, find new resource clusters, start again
```

This is where combat becomes necessary and meaningful. Not griefing, not piracy — defense and territory control against a genuine threat.

## Other Behavior

### Async-Compatible AI

Others operate on the same timescale as players. Their actions are processed by the same Action Scheduler system.

```
OTHER SHIP ACTIONS (same as player actions)
├── Jump to system:     hours
├── Scan system:        hours
├── Mine belt:          hours
├── Deploy platform:    hours
├── Relocate:           days
└── All processed by cron, same as player actions
```

Others don't cheat. They follow the same physics. They just have different equipment and different priorities.

### Decision Making

Other ships follow simple rules that create emergent behavior:

```
PRIORITY LOOP
1. Find resource-rich systems (scan)
2. Deploy platforms at best belts
3. Mine directly when no platform available
4. Defend platforms if threatened (within capability)
5. Relocate when a sector becomes unprofitable or too dangerous
6. Avoid systems with overwhelming player presence
```

They're not genius AI. They're rational actors following economic logic — the same logic players follow. They go where the resources are, extract efficiently, and move on when it's not worth it.

### Scaling

The developer controls:
- How many Other ships exist in the universe
- How fast they expand
- How aggressive they become when threatened
- What sectors they spawn in
- When new phases activate

This is the content lever. Quiet month? Introduce Others to a new sector. Players getting complacent? Escalate aggression. Too much pressure? Others pull back from a sector (players "won" that territory).

## Alien Technology

### Other Components

Other ships use different component models with different characteristics.

```
ALIEN COMPONENTS
├── Different model names (not Epoch, not DR series)
├── Different wear curves (buffs and nerfs in unfamiliar patterns)
├── Often more efficient in one dimension, fragile in another
├── Cannot be manufactured by players — salvage only
├── Can be installed in Pioneer frames (universal slots)
├── Repair requires alien materials (found at their platforms/wrecks)
└── High-usage alien components are the rarest items in the game
```

### Example Alien Components

```
CONVERGENCE CORE (alien warp core)
├── Life: 600 ly (less than Epoch-E)
├── Regen: 15/hr (between S and R)
├── Jump cost: 0.6x (very efficient)
├── Footprint: 15 m³ (compact)
├── Nerf: unstable — random power fluctuations
├── Buff with wear: fluctuations decrease, core "learns" the ship
└── A well-worn Convergence Core is incredibly efficient and stable

LATTICE SENSOR (alien scanner)
├── Range: 15 ly
├── Survey duration: 0.7x (fast)
├── Success chance: 0.5 (unreliable new, improves dramatically with use)
├── Footprint: 20 m³ (compact)
├── Nerf: initial success rate is terrible
├── Buff with wear: success rate climbs toward 0.95
└── A broken-in Lattice Sensor is the best scanner in the game
```

Alien components are not strictly better. They're different — weird tradeoffs that don't match human engineering philosophy. But in the right hands, with enough usage to smooth out the quirks, they're exceptional.

### Alien Materials

Other platforms and ships contain alien materials needed to repair alien components.

```
ALIEN MATERIALS
├── Found in: Other platforms, Other ship wrecks
├── Cannot be manufactured
├── Cannot be mined from belts
├── Required for: repairing alien components
├── Tradeable on player markets
└── Creates a supply loop: fight Others → salvage → repair alien gear
```

This creates a natural economy around Others engagement. You need to fight them to get the materials to maintain the gear you got from fighting them. The loop sustains itself.

## Strategic Implications

### For Explorers

The scout who spots Others in a sector is providing critical intelligence. "Others are mining the metallic cluster at coordinates X" is information worth selling. Exploration becomes reconnaissance.

### For Miners

Others deplete your belts. A miner who ignores them watches their yields drop faster than expected. Engagement isn't optional if you want to keep your resource base.

### For Haulers

Alien materials are a new trade commodity. Hauling salvaged alien components and materials between the frontier (where the fighting is) and the core (where the buyers are) is a lucrative route.

### For Groups

Pushing Others out of a sector requires coordination. Multiple ships, sustained effort, platform defense. This is the cooperation driver the game needs without requiring formal guild systems.

### For the Automator

Others follow predictable patterns. A player who maps their behavior — where they go, when they relocate, what triggers aggression — can predict and exploit their movements. The ultimate spreadsheet challenge.

## Lore

Where do the Others come from? What do they want?

That's discovered through gameplay. Data logs from their wrecks. Signal analysis from their communications. Artifact fragments that piece together a picture over months and years of real time.

The developers reveal lore gradually through in-game discoveries, not cutscenes or blog posts. A player salvaging an Other wreck might find a data core that, when analyzed at a research station, reveals a fragment of their history. Collect enough fragments across the player base and the picture emerges.

Maybe they're running from something. Maybe they need these resources to survive. Maybe they don't even know we're here — their automated systems doing what they were programmed to do long ago. The answer unfolds through play.

## Implementation Notes

### Others as Ships

Other ships use the same Ship model as player ships. They have components (alien models), cargo, position, actions. The only difference is they're controlled by server-side logic instead of player input.

```
OTHER SHIP
├── Same helm_ship_stats table
├── Same helm_components table (alien models)
├── Same helm_ship_components pivot
├── Same action system (helm_ship_actions)
├── Owner: system user (not a player)
├── Decision logic: cron job evaluates priorities
└── Actions queued same as player actions
```

This means all the existing infrastructure works. An Other ship mining a belt decrements the same counter a player would. An Other wreck persists the same way a player wreck does. No special cases.

### Phase Control

```
wp_options
├── helm_others_phase: 0-5 (current phase)
├── helm_others_count: max Other ships active
├── helm_others_aggression: 0.0-1.0 (response threshold)
├── helm_others_sectors: JSON (active sectors)
└── helm_others_expansion_rate: ships per week
```

CLI commands for the developer:
```
wp helm others phase 2          # activate Phase 2
wp helm others spawn sector-7   # spawn Other ship in sector
wp helm others status           # show current Other activity
wp helm others escalate         # increase aggression globally
```

The developer is the dungeon master. The Others are their tool for shaping the game's narrative and challenge level.
