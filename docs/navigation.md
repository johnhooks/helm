# Navigation System

## Overview

Ships navigate between stars through a network of intermediate waypoints in 3D space. Space is dangerous — blind jumps without computed paths result in navigation failure. Players must scan toward destinations, discover safe waypoints, and build routes to travel reliably.

The journey is the game. Unlike traditional space games where travel is safe and destinations are dangerous, Helm makes the space between stars meaningful. A navigator isn't just plotting courses — they're making risk assessments, building a personal star chart, and discovering paths that have real value.

## Core Concepts

### Two Scales of Travel

**Interstellar** (between stars)
- 3D coordinate space measured in light-years
- Requires scanning and route computation
- Multiple jumps through waypoints
- This document focuses here

**In-System** (within a star system)
- Abstracted for now — ship is simply "at" a system
- Future: system map with planets, stations, points of interest

### The Navigation Graph

```
Star A ───[W1]───[W2]───[W3]─── Star B
              \         /
               [W4]───[W5]
                    \
                     [W6]─── Star C
```

- **Stars** are major nodes — entry/exit points for systems
- **Waypoints** exist in the space between stars (3D coordinates, no celestial content)
- **Edges** connect nodes that are reachable from each other (bidirectional)
- Multiple paths may exist between any two stars
- Waypoints can be shared across different star-pair corridors

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
│   [★]  = node with a star (visible on the map)         │
│   [W#] = waypoint (invisible until discovered)         │
│   ──── = edge (bidirectional connection)               │
└─────────────────────────────────────────────────────────┘
```

### Nodes vs Stars

Nodes and stars are separate concepts:

- **Node** — a point in space (geometry for the graph). Has 3D coordinates.
- **Star** — a celestial object that exists AT a node. Not all nodes have stars.
- **Waypoint** — a node with nothing at it. Just a navigation point in empty space.

A node is a node regardless of what's at it. The graph doesn't care whether you're jumping to a star system or an empty waypoint — the mechanics are the same. What differs is what you find when you arrive.

### Physical Constraints

- **Obstacles** — you can't fly a straight line between stars. Space has hazards (radiation, gravity wells, dark matter). Waypoints chart safe passages through them. This is why the navigation graph exists.
- **Scan range** — the nav computer has a maximum targeting distance, determined by its tier. Better equipment = can scan toward more distant stars, unlocking more direct corridors.
- **Energy** — jumps consume power from the warp core. Longer edges draw more energy. Whether a ship can sustain a jump depends on core output and capacity — not a hard range limit. See [Energy Model](#energy-model).
- The waypoint network is **deterministic** — generated from a master seed
- Waypoints and edges are **permanent** once created
- Algorithm version is locked when waypoints are generated

## Fog of War

Players can look out and see the stars. They're the backdrop — public, known, rendered on everyone's star map. But the space between stars is dark. The waypoints, edges, and routes that connect them are hidden until discovered.

### Visibility Rules

| Data | Default Visibility | Becomes Public |
|------|-------------------|----------------|
| Stars / system nodes | Public | Always visible |
| Waypoints | Global in storage, surfaced only through scans | A player sees a waypoint id once a scan of theirs references it |
| Edges | Hidden per-player | Public after enough traversals |
| Routes | Private | After enough traversals (threshold) |

### Player Knowledge

Edge knowledge is the per-player state. Waypoint nodes live in the global `helm_nav_nodes` table and are fetched by id on demand — a player only ever learns of a waypoint through a scan result that references it, so the global node table does not leak the shape of the corridor network on its own.

- **`helm_user_edge`** — the single per-player join table. Every row is one `(user_id, edge_id)` discovery with a `discovered_at` timestamp. Writes happen in the scan resolver the moment an edge appears in a scan result, so chart state is captured at discovery time and never depends on the action payload surviving.

Discoveries belong to the player, not the ship:

- Switching browsers or devices preserves your edge chart — the server is the source of truth and the client rebuilds its cache from `/helm/v1/edges` on cold load.
- Losing a ship doesn't erase your star charts.
- Public things (stations, anomalies) can be attached to waypoint nodes independently of who discovered them.
- Team/faction sharing is future work.

The client caches the discovered edge graph locally in its datacore for fast rendering, and waypoint coordinates are fetched by id from the global node endpoints as needed. The server remains the source of truth.

### What's Not Exposed

Waypoint coordinates are fetchable by id, but a player only ever learns of a waypoint id through a scan of their own, so the data flows exclusively through gameplay actions. Edges are gated per-player; a cold client rebuilds the graph from `/helm/v1/edges`, which returns only the authenticated user's discoveries.

## Scanning

Scanning is how players discover the space between stars. You point your navigation computer at a destination and it computes a path — or tries to. Like everything in Helm, scanning takes real time. You initiate a scan and check back later for results.

### How It Works

- **Directional** — you scan toward a specific destination (any star or known waypoint)
- **From any known node** — you can scan from your current position, or from any waypoint you've previously discovered. Known waypoints are stepping stones for reaching further into unknown space.
- **Multi-hop** — one scan can reveal 1 to N waypoints based on skill
- **Failure possible** — the nav computer can fail to compute anything
- **Diminishing returns** — each successive waypoint revealed is harder than the last
- **Async** — scanning is a ship action that takes real time. Duration depends on distance, nav computer quality, and ship configuration.

### Scan Variables

Three abstract variables affect scan success. The game layer decides what feeds into them (nav computer tier, crew experience, upgrades, etc.).

| Variable | Range | Role |
|----------|-------|------|
| `chance` | 0.0–1.0 | Base success rate. 1.0 = guaranteed first hop. Safety valve for tuning. |
| `skill` | 0.0–1.0 | Probability of revealing additional hops beyond the first |
| `efficiency` | 0.0–1.0 | Probability of revealing additional hops beyond the first |

### Success Factors

- **Distance** — further targets are harder to compute paths toward
- **Corridor difficulty** — each node pair has a fixed difficulty value (deterministic from seed)
- **Nav computer quality** — better equipment = higher skill and efficiency values

When a scan fails, the player can:
- Try a closer intermediate star (shorter distance = easier)
- Upgrade their nav computer
- Scan from a previously discovered waypoint instead of their current position

### Cooldowns and Retries

Scanning consumes core capacity. Whether you can retry depends on available reserves:

- **Scout ships** — fast cooldown under normal conditions, slow cooldown when pushing range limits
- **Non-specialized ships** — slow cooldown by default
- **Core capacity** — limits how many scans you can attempt before needing to recharge

Ship configuration determines the balance between scan range, cooldown speed, and core drain.

### Scan Results

A successful scan returns:
- **Nodes** — the waypoints discovered along the path
- **Edges** — the connections between discovered nodes
- **Complete** — whether the full path to the destination was found

Discovered waypoints and edges are written to the server (permanent), added to the player's navigation chart (`user_node`, `user_edge`), and sent to the client (cached locally).

On a complete scan, the ship's navigation target is set to the furthest discovered node on the path — but the ship is not automatically navigated there. The player still initiates each jump.

## Routes

A route is a saved path through known edges — a named, ordered sequence of nodes from one star to another.

### Lifecycle

1. **Discover edges** — scan toward a destination, accumulating waypoints and edges
2. **Complete a path** — once edges connect all the way from star A to star B, save it as a route
3. **Travel the route** — each traversal increments the counter on the route and its edges
4. **Route goes public** — after enough traversals, the route appears on everyone's star map
5. **Trade routes** — (future) sell private routes to other players

### Properties

- Start and end nodes must be star systems (not waypoints)
- Path is stored as an ordered list of node IDs
- Private by default, becomes public at traversal threshold
- Can be named by the player
- Multiple routes can exist between the same two stars
- Routes share edges — traveling one route wears in the edges for all routes using them

### Public Routes

Before scanning toward a destination, check for public routes first. A well-traveled route means you might not need to scan at all — the path is already known. This creates a natural progression:

- Early game: everything requires scanning
- Mid game: major routes between popular stars are public
- Late game: the frontier is where discovery still matters

## The Navigation Computer

The navigation computer is the player's primary tool for interstellar travel. It combines scanning and route planning into one interface.

### Player Flow

1. Player is looking at the star map (all stars visible)
2. Player selects a destination star
3. View condenses to show the corridor between current position and target
4. The corridor shows:
   - Current position and destination star
   - Any waypoints the player has previously discovered in this corridor
   - Edges connecting those waypoints (known connections)
   - Public routes from other players (if any)
   - Gaps where scanning is needed
5. Player can scan to discover more of the path, or travel along known edges

This is both a scanning tool and a route planner — it shows what you know and what you don't.

## Deterministic Generation

### Two-Layer Architecture

**Deterministic layer** (locked down, versioned, never changes):
- Given two nodes A and B, the waypoint between them is FIXED
- Waypoint position is pure math from master seed + node IDs
- The path "exists" conceptually — scanning reveals it like fog of war
- Algorithm version is locked when a waypoint is first created

**Gameplay layer** (can evolve):
- Whether you successfully compute the path (chance, skill, efficiency)
- Affected by ship and crew stats
- Future: decorations at waypoints (hazards, resources, encounters)
- Future: fuel and time costs for traversal

### Same Waypoints, Different Discovery

A skilled navigator reveals the same waypoints as a novice — just more of them at once. The waypoint network is deterministic; what varies is how much of it you can see.

### Waypoint Positioning

Waypoints are placed along the vector between two nodes with perpendicular scatter:
- Position: 30–60% of the way from origin to destination (seeded)
- Scatter: offset perpendicular to the path (±10% of distance, seeded)
- Hash: deterministic from master seed + node pair + algorithm version

## Travel

- **Edges only** — you can only jump along edges you know about
- **Time** — each jump takes real time (async — check back later)
- **Traversal counting** — each jump increments the edge's traversal counter

### Energy Model

> **Status: not yet implemented.** The current codebase uses a hard max jump range constant. This section describes the target design.

There is no hard range limit on jumps. Instead, the warp drive has a power draw that scales with edge distance, and whether a ship can sustain the jump depends on its warp core.

- **Jump draw** — power required increases with distance (likely exponential — short hops are cheap, long jumps are brutal)
- **Warp core output** — sustained power generation rate. Determines what the drive can handle continuously.
- **Core capacity** — stored energy. The core can burst above its sustained output by drawing down reserves, enabling occasional long jumps at the cost of needing to recharge afterward.
- **Recharge** — after a jump, the core replenishes over time. A drained core means waiting before the next jump.

This creates a natural ship progression:

- **Nav computer tier** gates strategic range — how far you can scan, which corridors you can discover. A better nav computer means you can target distant stars directly and find shorter overall paths. A weaker one forces you through nearby intermediate stars, chaining corridors.
- **Warp core quality** gates tactical range — how long an edge you can jump in one go. A good core sustains long edges easily. A weak core needs shorter hops and recharge time between them.

Both improve with upgrades, but they gate different things. A ship with a great nav computer but a weak core can *discover* long routes but has to hop slowly along them. A ship with a great core but a basic nav computer can jump far but can only find paths to nearby stars.

Scanning also draws from the core. Deep scans at long range cost energy, creating a shared power budget — scan or jump, plan accordingly.

## Example Flows

### First Exploration — Basic Ship

```
Ship "Explorer" at Sol, targeting Tau Ceti (11.9 ly)
Nav computer: Tier 1 (short scan range, low skill)
Warp core: basic (can sustain short edge jumps)

1. Tau Ceti is beyond scan range — can't target directly
   → Scans toward Alpha Centauri instead (4.4 ly, within range)
   → Reveals W1 and edge Sol↔W1
   → Partial path toward Alpha Centauri

2. Jumps to W1 (short edge, core handles it easily)

3. Scans from W1 toward Alpha Centauri
   → Reveals direct edge to Alpha Centauri
   → Arrives at Alpha Centauri

4. From Alpha Centauri, scans toward Tau Ceti
   → Now close enough to target
   → Reveals W2 and edge AlphaCen↔W2

5. Hops through waypoints toward Tau Ceti...

Total: indirect route through an intermediate star.
Took more hops, more scans, more time — but got there.
```

### First Exploration — Advanced Ship

```
Ship "Navigator" at Sol, targeting Tau Ceti (11.9 ly)
Nav computer: Tier 4 (long scan range, high skill)
Warp core: high-output (can sustain long edge jumps)

1. Tau Ceti is within scan range — targets directly
   → First hop succeeds
   → Reveals W1 (direct corridor Sol↔Tau Ceti)
   → Second hop succeeds (high skill + efficiency)
   → Reveals W2
   → W2 close enough for direct edge to Tau Ceti
   → Result: complete path in ONE scan!

2. Jumps Sol → W1 → W2 → Tau Ceti
   → Core handles the edge distances
   → Arrives quickly

Same deterministic waypoints exist for both ships.
The advanced ship just found a direct corridor and could sustain the jumps.
```

### Using Public Routes

```
Ship "Trader" at Sol, wants Epsilon Eridani (10.5 ly)

1. Check for public routes
   → Found: Sol → W1 → W2 → Epsilon Eridani (traversed 12 times)
   → No scanning needed — path is already known

2. Jump along the route
   → Each jump increments traversal counts
```

### Edge Becomes Public

```
Edge: Sol ↔ W1
Created by: Ship "Explorer"
Traversal count: 1

Ship "Trader" uses it:      count = 2
Ship "Miner" uses it:       count = 3
...
Ship "Pilgrim" uses it:     count = 10 → THRESHOLD

Edge is now public:
- Visible on all star maps
- Any ship can see this connection exists
- Still need to travel it, but it's no longer hidden
```

## Constants (Tunable)

| Constant | Value | Purpose |
|----------|-------|---------|
| Edge public threshold | 10 traversals | When an edge becomes visible to all |
| Route public threshold | 5 traversals | When a route becomes visible to all |
| Discovery decay | 0.85 per hop | Diminishing returns on multi-hop scanning |
| Distance scale | 10.0 | Controls how distance affects scan difficulty |

Scan range and jump capability are no longer hard constants — they emerge from ship configuration (nav computer tier, warp core output/capacity, drive efficiency).

## Open Questions

- [ ] **Waypoint density** — how many waypoints between two stars? Likely based on distance.
- [ ] **Scatter amount** — how far off the direct line? Tunable constant.
- [ ] **Waypoint properties** — types (radiation, asteroids) added via decoration layer later. Don't affect graph structure, only traversal costs.
- [ ] **Nav computer tier values** — specific skill/efficiency per tier (e.g., Tier 1 = 0.3, Tier 5 = 0.9)
- [ ] **Jump time** — how long does a jump take? Real-time waiting based on distance?
- [ ] **Scan duration** — how long does a scan take? Based on distance, nav computer tier, ship config?
- [ ] **Multiple discoverers** — when two ships discover the same edge independently, both contribute to traversal count?
- [ ] **Sharing mechanics** — gifting, selling, or faction-sharing of private routes and waypoint knowledge
- [ ] **Navigation computer UI** — exact interaction design for the corridor view and route planner
- [ ] **Fuel creation** — part of the game economy (refining, stations, trade)

## Discovery Events (Deferred)

Discovery should be gameplay, not a loading screen. Revisit after core navigation works.

### Design Intent

Scanning and traversing unknown space should carry risk and reward. A navigator making first contact with a waypoint might find:

| Event Type | Uses | Risk/Reward |
|------------|------|-------------|
| Derelict ship | 1–3 | Low risk, moderate reward (salvage) |
| Resource cache | 5–10 | No risk, low reward (bonus resources) |
| Pirate ambush | 3–5 | High risk, variable reward (combat) |
| Anomaly | 1 | Unknown risk, high reward (unique discovery) |
| Distress signal | 1 | Time cost, reputation reward (rescue) |
| Sensor ghost | ∞ | Time cost, no reward (false positive) |
| Radiation spike | ∞ | Avoidable with preparation (system damage) |
| Clear space | ∞ | Safe passage (nothing special) |

### Strategic Implications

- **Scouts vs Traders** — some ships optimize for first-contact discovery, others for safe known routes
- **Route value** — a "clean" route (no ambushes) is worth more than an uncleared one
- **Information asymmetry** — knowing what's at a waypoint before others do has value

## Notes

- **Nodes vs Stars** — nodes are geometry (points in space). Stars are data (celestial objects). A star exists AT a node.
- **Waypoints are permanent** — once generated and stored, they never change. Algorithm version is locked.
- **Edges are the key** — you can only travel where edges exist. Discovering edges IS the exploration.
- **Routes are convenience** — a saved path through known edges. Multiple routes can share edges.
- **Bidirectional edges** — if you can go A→B, you can go B→A.
- **Two layers** — deterministic (where are waypoints?) is separate from gameplay (can you find them?).
- **Same waypoints, different discovery** — a skilled navigator reveals the same waypoints as a novice, just more of them at once.
- **Corridor-based** — waypoints belong to node-pair corridors. Sol→TauCeti has different waypoints than Sol→Proxima.
