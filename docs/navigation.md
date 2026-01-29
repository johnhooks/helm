# Navigation System

## Overview

Ships navigate between stars through a network of intermediate waypoints in 3D space. Space is dangerous - blind jumps without computed paths result in navigation failure. Players must scan toward destinations, discover safe waypoints, and build routes to travel reliably.

## Core Concepts

### Two Scales of Travel

**Interstellar** (between stars)
- 3D coordinate space
- Requires scanning and route computation
- Multiple jumps through waypoints
- This document focuses here

**In-System** (within a star system)
- Abstracted for now
- Ship is simply "at" a system
- Future: system map with planets, stations, points of interest

### The Navigation Graph

```
Star A ───[W1]───[W2]───[W3]─── Star B
              \         /
               [W4]───[W5]
                    \
                     [W6]─── Star C
```

- **Stars** are major nodes (entry/exit points for systems)
- **Waypoints** exist in the space between stars (3D coordinates)
- **Edges** connect waypoints that are reachable from each other
- Multiple paths may exist between any two stars
- Waypoints can be shared across different star-pair routes

### Physical Constraints

- Ships can only attempt jumps to stars within **drive range** (X light-years)
- The waypoint network is **deterministic** (generated from master seed)
- Waypoints and edges are **generated once and stored permanently**
- Algorithm version is locked when waypoints are created

## Decided Mechanics

### Two-Layer Architecture

**Deterministic Layer** (locked down, versioned, never changes):
- Given two nodes A and B, the waypoint between them is FIXED
- Waypoint position is pure math from master seed + node IDs
- The path "exists" conceptually - scanning reveals it like fog of war
- Hash = `hash(masterSeed, min(A,B)-max(A,B), algorithmVersion, waypointIndex)`

**Gameplay Layer** (can evolve):
- Whether you successfully compute the path
- Affected by ship/crew stats
- Decorations: what's at waypoints, obstacles avoided, fuel/time costs

### Scanning

- [x] **Directional scanning** - You scan TOWARD a specific destination node
- [x] **Node-to-node** - Each computation is between your current node and target
- [x] **Multi-hop discovery** - One scan can reveal 1 to N hops based on skill
- [x] **Failure possible** - Nav computer can error out (no path computed)
- [x] **Diminishing returns** - Each successive hop revealed is harder

### Scan Variables

Three gameplay variables affect scan success:

| Variable | Range | Role |
|----------|-------|------|
| `chance` | 0.0-1.0 | Base success rate. 1.0 = guaranteed first hop. Safety valve for tuning. |
| `skill` | 0.0-1.0 | Increases probability of revealing additional hops |
| `efficiency` | 0.0-1.0 | Increases probability of revealing additional hops |

These are set by the game layer before the scan attempt. The algorithm doesn't know what feeds into them (nav computer tier, crew experience, upgrades, etc.).

### Scan Algorithm

```php
public function scan(Node $from, Node $to, float $chance, float $skill, float $efficiency): ScanResult
{
    $revealed = [];
    $current = $from;

    while ($current->id !== $to->id) {
        // First hop uses chance, subsequent hops use skill + efficiency
        $isFirstHop = empty($revealed);
        $probability = $isFirstHop
            ? $chance
            : $skill * $efficiency * (0.9 ** count($revealed)); // Diminishing returns

        if (!$isFirstHop && $this->roll() > $probability) {
            break; // Can't see any further
        }

        if ($isFirstHop && $this->roll() > $chance) {
            return ScanResult::failure(); // Failed to compute anything
        }

        // Reveal next hop (deterministic - same A→B always = same waypoint)
        $next = $this->generator->computeNextNode($current, $to);
        $revealed[] = $next;
        $current = $next;
    }

    return new ScanResult($revealed, $current->id === $to->id);
}
```

### Success Factors

Distance is factored into the deterministic roll for each node pair:

```php
// Each node pair has a fixed "difficulty" value
$pairDifficulty = $this->deterministicValue($from->id, $to->id, $masterSeed); // 0.0-1.0

// Distance affects base success (further = harder)
$distancePenalty = exp(-$distance / self::SCALE_FACTOR);

// Combined with chance to determine first-hop success
$effectiveChance = $chance * $distancePenalty * (1 + $pairDifficulty * 0.5);
```

When computation fails, you can:
- Try a closer intermediate star (shorter distance = easier)
- Upgrade nav computer (increases `skill`)
- Use known waypoints as stepping stones

### Route Visibility

- [x] **Private** - Only discoverer knows the route
- [x] **Traversal counting** - Track how many times a route is used
- [x] **Auto-reveal threshold** - After X traversals, route appears on star maps
- [ ] **Sharing mechanics** - TBD (gift, sell, faction?)

### Travel Costs

- [x] **Fuel** - Consumed per jump, based on distance
- [x] **Time** - Each jump takes time (game time, not real time?)
- [ ] **Balance** - Will require playtesting to tune
- [ ] **Fuel creation** - Part of game economy (refining, stations, etc.)

## Open Questions

### Waypoint Generation

- [x] **Positioning algorithm** - Along the vector between nodes with perpendicular scatter
- [x] **Corridor-based** - Waypoints belong to a node-pair corridor, not shared spatially
- [x] **Hash** - `hash(masterSeed, min(A,B)-max(A,B), algorithmVersion, waypointIndex)`

- [ ] **Density** - TBD, likely based on distance
- [ ] **Scatter amount** - How far off the direct line? Tunable constant.

- [ ] **Waypoint properties** (separate from core algorithm)
  - Just coordinates for now
  - Types (radiation, asteroids) added via decoration layer later
  - Properties don't affect graph structure, only traversal costs

### Scan Failure Handling

- [x] **Failure is possible** - Nav computer can error out completely
- [x] **Chance variable** - Set to 1.0 to guarantee first hop (safety valve)
- [x] **Distance affects difficulty** - Further = harder to compute

- [x] **Multiple jumps ARE the mechanic** - You rarely get a direct route
  - Each scan discovers waypoints and edges toward your destination
  - High skill/efficiency can reveal multiple hops in one scan
  - Route is built through exploration

### Nav Computer Upgrades

- [x] **Feeds into skill variable** - Higher tier = higher skill value
- [x] **Affects multi-hop discovery** - Better computer reveals more of the path
- [ ] **Specific tier values** - TBD (e.g., Tier 1 = 0.3, Tier 5 = 0.9)

### Time Mechanics

- [ ] **How does jump time work?**
  - Real-time waiting?
  - Game-time that passes (affects other systems)?
  - Instant but "costs" time units?

### Edge Cases

- [ ] **What if a known waypoint is "in the way"?**
  - Can you use it as a stepping stone?
  - Scan from current position to known waypoint (shorter = easier)
  - Then scan from waypoint to destination

- [ ] **Multiple ships discovering same route**
  - First discoverer gets credit?
  - Both add to traversal count?

## Deferred (Node Events)

First-traveler bonuses/penalties - revisit after core navigation works:

| Event Type | Uses | Effect |
|------------|------|--------|
| Derelict ship | 1-3 | Salvage loot |
| Resource cache | 5-10 | Bonus resources |
| Pirate ambush | 3-5 | Combat encounter |
| Anomaly | 1 | Unique discovery |
| Clear space | ∞ | Nothing special |

## Data Model

### Final Design

**Key insight**: Nodes and stars are separate concepts.

- **Node** = A point in space (geometry for the graph)
- **Star** = A celestial object (data) that exists AT a node
- **Waypoint** = A node with nothing at it (just a navigation point)

```
┌─────────────────────────────────────────────────────────┐
│                   NAVIGATION GRAPH                      │
│                                                         │
│   [★ SOL]────[W1]────[W2]────[★ TAU CETI]              │
│      │   \          /   \          │                    │
│      │    [W3]────[W4]   [W5]────[W6]                  │
│      │               \      \       │                   │
│    [W7]               [W8]──[★ PROXIMA]                │
│                                                         │
│   [★]  = node with star_post_id (has a star)           │
│   [W#] = node with star_post_id = NULL (waypoint)      │
│   ──── = edge (bidirectional connection)               │
└─────────────────────────────────────────────────────────┘
```

### Decided

- [x] **Traversal count on edges** - Individual connections become well-known
- [x] **Path storage as node IDs** - `[1, 5, 8, 12, 2]` more readable than edge IDs
- [x] **Edges are bidirectional** - Store once, query both directions
- [x] **Star nodes created during seed** - When helm_star posts are created
- [x] **Waypoints created during scanning** - Generated deterministically, stored permanently
- [x] **Link via star_post_id column** - Not matching IDs, clean FK relationship

### Tables

```sql
wp_helm_nav_nodes
├── id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
├── star_post_id BIGINT UNSIGNED NULL (FK → wp_posts.ID where post_type='helm_star')
├── x DOUBLE NOT NULL
├── y DOUBLE NOT NULL
├── z DOUBLE NOT NULL
├── hash VARCHAR(64) NULL (deterministic identifier for waypoints)
├── algorithm_version SMALLINT UNSIGNED NOT NULL DEFAULT 1
├── created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── UNIQUE KEY (star_post_id) -- only one node per star
├── UNIQUE KEY (hash) -- only one node per waypoint hash
├── KEY coords (x, y, z) -- for spatial queries

-- star_post_id NOT NULL → this node is a star
-- star_post_id IS NULL → this node is a waypoint

wp_helm_nav_edges
├── id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
├── node_a_id BIGINT UNSIGNED NOT NULL (FK → nav_nodes, always lower ID)
├── node_b_id BIGINT UNSIGNED NOT NULL (FK → nav_nodes, always higher ID)
├── distance DOUBLE NOT NULL (light-years)
├── discovered_by_ship_id VARCHAR(50) NULL
├── traversal_count INT UNSIGNED DEFAULT 0
├── algorithm_version SMALLINT UNSIGNED NOT NULL DEFAULT 1
├── created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── UNIQUE KEY (node_a_id, node_b_id)
├── KEY node_a (node_a_id)
├── KEY node_b (node_b_id)
├── KEY traversal (traversal_count) -- for finding "public" edges

-- Bidirectional: always store with node_a_id < node_b_id
-- Query both directions: WHERE node_a_id = ? OR node_b_id = ?

wp_helm_routes
├── id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
├── name VARCHAR(255) NULL (user-given name)
├── start_node_id BIGINT UNSIGNED NOT NULL (FK → nav_nodes, must be a star)
├── end_node_id BIGINT UNSIGNED NOT NULL (FK → nav_nodes, must be a star)
├── path JSON NOT NULL (array of node IDs: [1, 5, 8, 12, 2])
├── total_distance DOUBLE NOT NULL
├── jump_count SMALLINT UNSIGNED NOT NULL
├── discovered_by_ship_id VARCHAR(50) NOT NULL
├── traversal_count INT UNSIGNED DEFAULT 1
├── visibility ENUM('private', 'public') DEFAULT 'private'
├── algorithm_version SMALLINT UNSIGNED NOT NULL DEFAULT 1
├── created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
├── KEY start_end (start_node_id, end_node_id)
├── KEY visibility (visibility)
├── KEY discoverer (discovered_by_ship_id)
```

### Domain Classes

```
src/Helm/Navigation/
├── Provider.php              # Service provider, registers tables on activation
├── Node.php                  # Value object (id, x, y, z, starPostId, hash)
├── Edge.php                  # Value object (id, nodeA, nodeB, distance, traversalCount)
├── Route.php                 # Value object (id, path, distance, visibility)
├── NodeRepository.php        # CRUD for nav_nodes table
├── EdgeRepository.php        # CRUD for nav_edges table
├── RouteRepository.php       # CRUD for routes table
│
│ # Deterministic Layer (locked down)
├── NodeGenerator.php         # Pure waypoint positioning: given A↔B, where is waypoint?
│                             # No side effects, no randomness beyond seed
│
│ # Gameplay Layer (can evolve)
├── NavComputer.php           # Scan logic with chance/skill/efficiency
│                             # Calls NodeGenerator for deterministic positions
│                             # Handles multi-hop discovery with diminishing returns
│
├── NavigationService.php     # High-level API: scan(), jump(), getRoutes()
└── ScanInput.php             # DTO: from, to, chance, skill, efficiency
└── ScanResult.php            # DTO: nodes[], edges[], complete
```

### Key Relationships

```
StarCatalog (JSON)
     │
     ▼ seed command
helm_star (CPT)
     │
     │ star_post_id
     ▼
nav_nodes ◄─────────────► nav_edges
     │                         │
     │ path: [node_ids]        │ traversal_count
     ▼                         │
nav_routes ◄───────────────────┘
```

## Example Flows

### Star Seeding (Setup)

```
wp helm star seed
├── For each star in catalog:
│   ├── Create helm_star post (get post_id)
│   ├── Calculate 3D coordinates from RA/Dec/Distance
│   ├── Create nav_node with star_post_id = post_id
│   └── Log: "Created node 42 for Sol at (0, 0, 0)"
└── Result: All stars exist as nodes in the nav graph
```

### First Exploration (Sol → Tau Ceti) - Low Skill

```
Ship "Explorer" at Sol (node 1), wants Tau Ceti (node 42)
Distance: 11.9 ly
Ship stats: chance=0.8, skill=0.3, efficiency=0.3 (basic nav computer)

1. scan(from: Sol, to: TauCeti)
   ├── First hop: roll 0.6 < chance 0.8 → SUCCESS
   ├── Deterministic generator: Sol↔TauCeti waypoint = W1 at (3.2, 1.1, 0.8)
   ├── Second hop: probability = 0.3 * 0.3 * 0.9^1 = 0.081
   ├── Roll 0.4 > 0.081 → STOP
   └── Result: [W1] revealed, not complete

2. jump(to: W1)
   └── Ship now at W1

3. scan(from: W1, to: TauCeti)
   ├── First hop: roll 0.5 < chance 0.8 → SUCCESS
   ├── Deterministic generator: W1↔TauCeti waypoint = W2
   ├── Second hop: roll > probability → STOP
   └── Result: [W2] revealed

4. jump(to: W2), scan again...
   ├── W2 is close to Tau Ceti
   ├── First hop reveals direct edge to Tau Ceti
   └── Result: [TauCeti] revealed, COMPLETE

5. jump(to: TauCeti) → Arrived!

Total path discovered: Sol → W1 → W2 → Tau Ceti (3 jumps)
```

### First Exploration (Sol → Tau Ceti) - High Skill

```
Ship "Navigator" at Sol (node 1), wants Tau Ceti (node 42)
Distance: 11.9 ly
Ship stats: chance=0.95, skill=0.8, efficiency=0.9 (advanced nav computer)

1. scan(from: Sol, to: TauCeti)
   ├── First hop: roll 0.3 < chance 0.95 → SUCCESS
   ├── Deterministic generator: Sol↔TauCeti waypoint = W1 (SAME as before!)
   ├── Second hop: probability = 0.8 * 0.9 * 0.9^1 = 0.648
   ├── Roll 0.4 < 0.648 → CONTINUE
   ├── Deterministic generator: W1↔TauCeti waypoint = W2 (SAME as before!)
   ├── Third hop: probability = 0.8 * 0.9 * 0.9^2 = 0.583
   ├── Roll 0.3 < 0.583 → CONTINUE
   ├── W2↔TauCeti: close enough for direct edge
   └── Result: [W1, W2, TauCeti] revealed, COMPLETE!

Entire route discovered in ONE scan!
Same waypoints as low-skill ship - just revealed all at once.
```

### Using Known Edges (Partial Route Suggestion)

```
1. Ship "Trader" at Sol, wants Epsilon Eridani (node 50, 10.5 ly)

2. NavigationService.suggestPartialRoutes(from: 1, to: 50)
   ├── Find all edges from node 1
   ├── Found: 1 ↔ 1001 (toward Tau Ceti, discovered earlier)
   ├── Calculate: Is 1001 "on the way" to node 50?
   │   ├── Sol (1) → Eps Eri (50): bearing 045°
   │   ├── Sol (1) → W1001: bearing 062°
   │   └── Angle diff: 17° → YES, roughly on the way
   ├── Distance Sol→1001→Eps Eri vs Sol→Eps Eri:
   │   └── Via 1001: 4.76 + 8.2 = 12.96 ly (longer but easier)
   └── Return: Suggestion {useExisting: [1, 1001], remainingTo: 50, savings: "known path gets you 40% there"}

3. Trader can:
   a) Use suggestion: Jump to 1001, then compute from there (easier)
   b) Try direct: Attempt Sol → Eps Eri computation (harder, might fail)
```

### Edge Becomes Well-Traveled

```
Edge: Sol (1) ↔ Waypoint (1001)
Created by: Ship "Explorer"
Traversal count: 1

Ship "Trader" uses it:      count = 2
Ship "Miner" uses it:       count = 3
Ship "Courier" uses it:     count = 4
...
Ship "Pilgrim" uses it:     count = 10 → THRESHOLD REACHED

Edge is now "well-known":
- Appears on star maps as a known safe passage
- Any ship can see this edge exists
- Still need to compute routes using it, but it's visible
```

## Coordinate System

**Origin**: Sol at (0, 0, 0)

**Units**: Light-years

**Star positions**: Derived from RA/Dec/Distance in catalog
```php
// RA is in hours (0-24), Dec is in degrees (-90 to +90)
$raRadians = deg2rad($star->ra * 15);  // Convert hours to degrees, then radians
$decRadians = deg2rad($star->dec);

$x = $star->distanceLy * cos($decRadians) * cos($raRadians);
$y = $star->distanceLy * cos($decRadians) * sin($raRadians);
$z = $star->distanceLy * sin($decRadians);
```

**Waypoint positions**: Generated along vector toward destination with perpendicular scatter
```php
// Waypoint at ~40% of the way from A to B, with some scatter
$t = 0.4; // How far along (deterministic from seed)
$scatter = 0.1; // Perpendicular offset (deterministic from seed)

$waypoint = lerp($nodeA, $nodeB, $t) + perpendicularOffset($scatter);
```

## Constants (Tunable)

```php
const DRIVE_RANGE_LY = 15.0;           // Max distance ship can attempt
const EDGE_PUBLIC_THRESHOLD = 10;      // Traversals before edge is "well-known"
const ROUTE_PUBLIC_THRESHOLD = 5;      // Traversals before route is public

// Success rate curve for direct jumps
const SUCCESS_RATE = [
    0.25 => 0.95,  // < 25% of range: 95% success
    0.50 => 0.70,  // 25-50% of range: 70% success
    0.75 => 0.40,  // 50-75% of range: 40% success
    1.00 => 0.15,  // 75-100% of range: 15% success
];
```

## Notes

- **Nodes vs Stars**: Nodes are geometry (points in space). Stars are data (celestial objects). A star EXISTS at a node.
- **Waypoints are permanent**: Once generated and stored, they never change. Algorithm version is locked.
- **Edges are the key**: You can only travel where edges exist. Discovering edges IS the exploration.
- **Routes are convenience**: A saved path through known edges. Multiple routes can share edges.
- **Bidirectional edges**: If you can go A→B, you can go B→A. Store once with lower ID first.
- **Two layers**: Deterministic (where are waypoints?) is separate from Gameplay (can you find them?).
- **Same waypoints, different discovery**: A skilled navigator reveals the same waypoints as a novice - just more of them at once.
- **Corridor-based**: Waypoints belong to node-pair corridors. Sol→W1→TauCeti has different waypoints than W1→Proxima.
- **Generic variables**: `chance`, `skill`, `efficiency` are abstract. The game layer decides what feeds into them.

## Implementation Plan

### Phase 1: Schema & Core Classes
1. Create `Navigation/Schema.php` with table definitions
2. Create value objects: `Node.php`, `Edge.php`, `Route.php`
3. Create repositories: `NodeRepository.php`, `EdgeRepository.php`, `RouteRepository.php`
4. Register tables on plugin activation
5. Write tests for repositories

### Phase 2: Star Node Integration
1. Update `wp helm star seed` to create nav_nodes for each star
2. Add coordinate calculation to star seeding
3. Verify stars exist in both helm_star CPT and nav_nodes table
4. Write tests for star node creation

### Phase 3: Navigation Computer

**Deterministic Layer:**
1. Create `ScanInput.php` DTO (from, to, chance, skill, efficiency)
2. Create `ScanResult.php` DTO (nodes[], edges[], complete)
3. Create `NodeGenerator.php` - pure waypoint positioning
   - `computeNextNode(Node $from, Node $to): Node`
   - `computeWaypointHash(int $fromId, int $toId, int $index): string`
   - Deterministic: same inputs = same waypoint position, always
4. Write snapshot tests for determinism (same A↔B = same waypoint, always)
   - Uses `lucatume/codeception-snapshot-assertions`
   - Snapshots stored in `tests/__snapshots__/`
   - Update with `--update-snapshots` when algorithm version bumps

**Gameplay Layer:**
5. Create `NavComputer.php` - scan logic
   - `scan(ScanInput $input): ScanResult`
   - First hop uses `chance` variable
   - Subsequent hops use `skill * efficiency * diminishing_factor`
   - Calls NodeGenerator for actual positions
6. Write tests for multi-hop discovery
7. Write tests for diminishing returns curve

### Phase 4: Navigation Service
1. Create `NavigationService.php` as high-level API
2. Implement `computeRoute()` - scan toward destination
3. Implement `executeJump()` - move ship, consume fuel, update edges
4. Implement `suggestPartialRoutes()` - find helpful known edges
5. Write integration tests

### Phase 5: CLI Commands
1. `wp helm nav compute <from> <to>` - test route computation
2. `wp helm nav jump <ship> <to>` - execute a jump
3. `wp helm nav edges [--from=<node>]` - list known edges
4. `wp helm nav routes [--ship=<id>]` - list routes

### Phase 6: Polish & Balance
1. Tune constants (drive range, success rates, thresholds)
2. Add fuel consumption mechanics
3. Add time passage mechanics
4. Performance optimization for graph queries
