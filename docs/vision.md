# Helm Vision: Space Exploration on WordPress

## The Concept

Helm is a slow, asynchronous space exploration game built on WordPress. Your Origin server runs the game - tracking ships, processing work, managing the economy. Players connect their WordPress sites as ships, issuing commands and viewing results.

The game can be federated in the future. Multiple Origins could negotiate trade deals, share discovery data, and allow ship transfers. But we start with single Origins, designing APIs that don't block future federation.

## Core Principles

### Space is Huge

You are alone. Your ship drifts through void, scanning, searching. Days pass between discoveries. When you find something - or someone - it matters.

The loneliness is the feature. Encounters are rare and therefore meaningful.

### Time is Real

Nothing is instant.

| Action | Duration |
|--------|----------|
| Scanning a sector | 2-8 hours |
| Traveling between nodes | 1-24 hours |
| Mining resources | 4-12 hours |
| Processing discoveries | 1-4 hours |

Your ship works while you sleep. You check in to see results, make decisions, set new courses. This is not a game that demands your attention. It rewards patience.

### The Universe Doesn't Wait

Actions are not guaranteed to resolve in the order they were issued. The game state can change between when you give a command and when it executes.

- Tried to fire on a player who already jumped out? Failure.
- Tried to dock at a destroyed station? Failure.
- Tried to buy cargo someone else bought? Failure.

Every action is re-validated at execution time. The command you gave says "I want to do this." The universe decides if it's still possible. Timing matters. This creates emergent gameplay.

### Discovery is the Gameplay

The universe is a graph of nodes connected by edges.

```
    [Station]
        │
        │ (6 hours)
        │
    [Asteroid Field] ─────── [Gas Giant]
        │                         │
        │ (3 hours)              │ (12 hours)
        │                         │
    [Your Ship]                [Unknown Signal]
        │
        │ (scanning...)
        │
       ???
```

Nodes are:
- Stations and outposts
- Planets and moons
- Asteroid fields
- Derelicts and wrecks
- Anomalies and signals
- Other ships
- The unknown (until scanned)

Edges are:
- Travel time
- Fuel cost
- Hazard level

You start knowing only your origin point. Everything else must be discovered.

## Scanning

Scanning is how the universe expands.

```
Initiate scan
    │
    ▼
Origin processes (hours pass)
    │
    ▼
Discovery: new node revealed
    │
    ▼
Added to your map
    │
    ▼
Recorded in Origin's database
```

### What Scanning Finds

- **New nodes**: Previously unknown locations
- **Existing nodes**: Places others have found (if in known space)
- **Connections**: Routes between nodes
- **Resources**: What's at a location
- **Signals**: Other ships, anomalies, events

### Scan Depth

Longer scans reveal more:

| Duration | Reveals |
|----------|---------|
| 2 hours | Immediate connections |
| 4 hours | Secondary connections |
| 8 hours | Deep scan, hidden nodes |

Origin does the work. You decide how deep to look.

## Your Map

Every ship maintains a view of discovered nodes and edges.

```javascript
{
  "nodes": {
    "node-a1b2c3": {
      "type": "asteroid_field",
      "name": "Kepler's Drift",
      "discovered_by": "ship:enterprise",
      "discovered_at": 1706472000,
      "resources": ["iron", "nickel", "ice"]
    }
  },
  "edges": {
    "a1b2c3:d4e5f6": {
      "travel_time": 14400,
      "fuel_cost": 12
    }
  }
}
```

Your map is:
- **Private by default**: Only you know what you've found
- **Shareable**: You can publish or sell discoveries
- **Cumulative**: It only grows

## Origin Server

Origin is the game server. It holds all truth.

### What Origin Does

```
┌─────────────────────────────────────────────────┐
│                    ORIGIN                       │
│                                                 │
│  - Processes all work units (scans, mining)     │
│  - Stores all game state (ships, items, maps)   │
│  - Manages the economy (credits, trades)        │
│  - Runs world generation                        │
│  - Tracks discoveries and ownership             │
│  - Provides API for ship clients                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Ships are Clients

Ships (WordPress instances) are the player interface:

```
┌─────────────────────────────────────────────────┐
│                     SHIP                        │
│                                                 │
│  - Displays game state (cached from Origin)     │
│  - Sends commands to Origin                     │
│  - Shows work unit progress                     │
│  - May compute pathfinding locally (navmaps)    │
│  - Provides player dashboard                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Discovery Economics

### Publishing (Free)

Share your discovery with the network:

```
- Your name attached as discoverer
- Added to known space
- Everyone's maps can include it
- Fame, but no exclusive advantage
```

### Selling (Profitable)

Trade discovery data to specific ships:

```
- Negotiate price (credits, goods, other data)
- Transfer node data
- You profit, they get the intel
```

### Hiding (Strategic)

Keep discoveries private:

```
- Only you know
- Exclusive access to resources
- Risk: someone else finds it, gets credit
- Advantage: first mover on valuable nodes
```

### Routes as Trade Assets

Charted routes have economic value beyond the nodes they connect:

```
- A safe path between markets (no ambushes, cleared hazards)
- Fuel-efficient routes (fewer jumps, shorter distances)
- Exclusive access to chokepoint waypoints
- "Toll road" potential for high-traffic corridors
```

Route ownership creates strategic possibilities:

| Asset | Value |
|-------|-------|
| Trade route | Connects resource-rich and resource-poor systems |
| Clean corridor | Verified safe passage (events cleared) |
| Shortcut | Fewer jumps than public alternatives |
| Chokepoint | Controls access to a region |

Routes can be sold outright, licensed for use, or kept secret for competitive advantage.

## Objects and Ownership

Origin tracks all ownership.

### Object Structure

```javascript
{
  "id": "obj-uuid",
  "type": "cargo:rare_minerals",
  "quantity": 50,
  "location": "ship:enterprise",
  "owner": "ship:enterprise",
  "history": [
    {"event": "mined", "at": 1706472000},
    {"event": "traded", "to": "ship:enterprise", "at": 1706550000}
  ]
}
```

### Scarcity

Resources exist at locations (types determine what CAN be mined). Mining yields quantities. Cargo is limited. Scarcity emerges from:
- Location (rare resources in few places)
- Time (mining takes hours)
- Distance (good stuff far from stations)
- Cargo capacity (can't carry infinite amounts)

## Encounters

Space is vast. Encounters are rare. This makes them meaningful.

### Detection

Your scan reveals another ship:

```
[SCAN COMPLETE]

New contact detected:
- Type: Ship
- ID: RELIANT
- Distance: 4 hours
- Status: Scanning

This is the first ship you've seen in 6 days.
```

### Options

When you encounter another ship:

| Action | Outcome |
|--------|---------|
| Approach | Get within communication range |
| Avoid | Alter course, maintain distance |
| Scan | Learn more about them |
| Hail | Open communication |
| Ignore | Continue your business |

### Value of Encounters

```
Trade
- They have goods from distant systems
- You have goods from your area
- Both profit from exchange

Information
- What have they found?
- Trade routes, hazards, opportunities

Shared Discovery
- Scan together: bonus discovery chance
- "Discovered by ENTERPRISE and RELIANT"
```

## The Feed

You're alone, but aware of a living universe.

### Ambient Updates

```
[10:42] RELIANT discovered mineral deposit
[10:45] Trade completed: ENTERPRISE ↔ DEFIANT
[10:51] New node joined network: gamma-station
[11:02] Anomaly detected in sector 201
[11:15] VIGILANT entered node alpha-7 (you're here!)
```

Events from Origin, showing the universe is alive.

## Technical Foundation

### WordPress as Infrastructure

Every ship is a WordPress instance:

```
WordPress
├── REST API (communication with Origin)
├── Action Scheduler (local scheduling)
├── Custom post types (cached state)
├── Admin dashboard (game UI)
└── Helm plugin (game client)
```

### The Origin Server

Origin is also WordPress:

```
WordPress
├── REST API (game API)
├── Action Scheduler (work unit processing)
├── Custom tables (game state)
├── Admin dashboard (game management)
└── Helm Origin plugin (game server)
```

### Async Everything

```php
// Player sets course
$ship->setCourse($destination);

// Ship sends to Origin
$origin->submitWorkUnit([
    'type' => 'travel',
    'destination' => $destination,
]);

// Origin schedules completion
as_schedule_single_action(
    time() + $travel_time,
    'helm_work_complete',
    ['unit_id' => $unit->id]
);

// Hours later, Origin processes
// Ship checks in, sees results
```

## Future: Federation

The architecture supports future federation:

```
Origin Alpha                    Origin Beta
    │                               │
    │◄──────── TRADE DEAL ─────────►│
    │                               │
    │  - Negotiate tariffs          │
    │  - Allow ship transfers       │
    │  - Share discovery data       │
    │                               │
```

Each Origin is a sovereign economy. Federation happens through negotiated trade deals, not global consensus.

But this is future work. For now: single Origin, solid foundation.

## Deferred: Multi-Crew Ships

The architecture supports multiple users operating a single ship—WordPress roles map to crew positions, the Abilities API could handle crew actions, async state means crew don't need to be online simultaneously.

Whether this is *fun* gameplay is unknown. Multi-crew games face hard problems:

- **Coordination tax**: Getting people online together
- **Role asymmetry**: Is every station equally engaging?
- **Pacing**: Someone's always waiting on someone else
- **Solo fallback**: What happens when you're alone?

**Current goal**: Playable solo ship. The backend supports crew interaction, but we're not designing for it yet. If multi-crew emerges, it might be AI crew members (using the Abilities API) rather than human players.

This is a design bet we're deferring until we have something playable.

## Development Philosophy

We're building something weird. On purpose.

Helm isn't optimized for player count or market fit. It's optimized for being fascinating to build and run. The goal is a system where the constraints force creative solutions, where the architecture teaches you things, where "that's a terrible idea" is often followed by "...but what if it worked?"

### Tech Used Sideways

| Tool | Intended Use | Our Use |
|------|--------------|---------|
| WordPress | Publishing platform | Game server |
| wp_options | Site configuration | Ship and economy state |
| Action Scheduler | Background jobs | Work unit processing |
| REST API | Content delivery | Game API |
| Custom Tables | Plugin data | Universe state |
| Capabilities | User permissions | Crew clearance levels |
| Abilities API | AI integrations | AI economic agents |
| Webhooks | Site notifications | Ship event callbacks |

Every WordPress feature becomes game infrastructure. The weirder the mapping, the more interesting the problems.

### Anti-Goals

Things we're explicitly NOT optimizing for:

- **Mass market appeal** - This is for WordPress devs who think it's funny that it exists
- **Competitive balance** - AI agents and player skill differences are features, not bugs
- **Hiding complexity** - The simulation has no secrets. Transparency builds trust and enables contribution
- **Traditional game design** - We follow "what's interesting to build?" not conventional wisdom

### Success Metrics

- Are people excited to work on this?
- Are the constraints producing novel solutions?
- Is the codebase fun to explore?
- Is "slow-paced Eve on WordPress with AI agents" a sentence that makes people smile?

### The Thesis

WordPress is a terrible choice for a space economy MMO.

That's what makes it perfect.

The constraints force creativity. The problems teach skills. The architecture reveals how the web actually works.

*"The best way to learn is to build something slightly too ambitious with tools slightly too limited."*

## The Vision

A quiet game about patience and discovery.

Your ship drifts through procedural space, scanning, finding, cataloging. You check in between meetings, before bed, over morning coffee. "What did my ship find?"

The universe is vast and mostly empty. But it's persistent, tracked, real. When you find something, it's recorded. When you meet someone, it matters. When you trade, both parties profit.

Origin runs the game. Ships are the interface. The economy works. The exploration is meaningful.

This is not a game about grinding or competing. It's about exploring, trading, and being part of something larger.

Check in when you can. Space will be here.
