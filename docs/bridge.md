# Bridge: Application Layer

The glue between UI components, game data, and player interactions.

## Purpose

Bridge is the choreographer. It takes stateless UI components from `@helm/ui` and stateless 3D visuals from `@helm/astrometric`, connects them to game state, and orchestrates the transitions between views.

```
┌─────────────────────────────────────────────────────────┐
│                        Bridge                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Views &    │  │  Animation  │  │  Data Layer     │ │
│  │  Screens    │  │  Orchestra  │  │  (State + Sync) │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└────────┬──────────────────┬──────────────────┬─────────┘
         │                  │                  │
    ┌────▼────┐       ┌─────▼─────┐      ┌─────▼─────┐
    │ @helm/ui │       │ @helm/    │      │  Origin   │
    │         │       │ astrometric│      │  (REST)   │
    └─────────┘       └───────────┘      └───────────┘
```

**UI** provides the visual building blocks (panels, glyphs, indicators).
**Astrometric** provides the 3D star field and canvas.
**Bridge** decides what to show, when to animate, and how data flows.

## Views & Screens

Bridge manages the application's view hierarchy:

```
Bridge
├── Navigation Shell
│   ├── System Overview (star map)
│   ├── Planet Detail
│   ├── Station View
│   ├── Ship Status
│   └── Survey Results
└── Modals & Overlays
    ├── Action Confirmations
    ├── Discovery Notifications
    └── Settings
```

Each view is a composition of UI components + data bindings + transition definitions.

## Animation Orchestration

### Philosophy

Animation is not decoration. It communicates:
- **Relationship**: This glyph *becomes* that header (shared element)
- **Hierarchy**: Parent fades, children stagger in (sequence)
- **State**: Pulsing means active, dim means unavailable (feedback)

The interface stays **quiet by default**. Animation happens in response to user action or significant state change.

### Framer Motion

Bridge uses [Framer Motion](https://motion.dev/) for orchestration:

```tsx
// Shared element transition: planet glyph → detail header
<motion.div layoutId={`planet-${planet.id}`}>
  <PlanetGlyph type={planet.type} size="xl" />
</motion.div>

// In detail view, same layoutId morphs between them
<motion.div layoutId={`planet-${planet.id}`}>
  <PlanetGlyph type={planet.type} size="xxl" />
</motion.div>
```

**Key patterns:**

| Pattern | Use Case |
|---------|----------|
| `layoutId` | Shared element transitions (glyph → header) |
| `AnimatePresence` | Enter/exit animations for views |
| `staggerChildren` | Sequential reveal of list items |
| `spring` | Natural, physical motion feel |

### Transition Definitions

Views define their transitions declaratively:

```tsx
const systemToDetailTransition = {
  systemView: {
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 }
  },
  detailView: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.1, staggerChildren: 0.05 }
  }
};
```

## Data Architecture

### The Problem

The Origin (WordPress server) is the source of truth, but:
- Stars don't move. Fetching 10,000 stars every session is wasteful.
- Ship state changes. Shields recharge, scans complete, position updates.
- Network latency matters. The UI should feel responsive.

### The Solution: Tiered Data

```
┌─────────────────────────────────────────────────────┐
│                   Local Storage                      │
│  ┌─────────────────────────────────────────────┐   │
│  │              IndexedDB / SQLite              │   │
│  │  • Star catalog (static)                     │   │
│  │  • System data (planets, stations)           │   │
│  │  • Discovered routes                         │   │
│  │  • Historical logs                           │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                         │
                         │ populate once, update rarely
                         ▼
┌─────────────────────────────────────────────────────┐
│                 @wordpress/data                      │
│  ┌─────────────────────────────────────────────┐   │
│  │              In-Memory Store                 │   │
│  │  • Current ship state                        │   │
│  │  • Active actions (scans, travel)            │   │
│  │  • Selected entities                         │   │
│  │  • UI state (current view, filters)          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                         │
                         │ sync on action, poll for updates
                         ▼
┌─────────────────────────────────────────────────────┐
│                   Origin (REST)                      │
│  • Ship commands (scan, travel, mine)               │
│  • State updates (action complete, discovery)       │
│  • Economy (trades, prices)                         │
│  • Multiplayer (other ships, messages)              │
└─────────────────────────────────────────────────────┘
```

### Static Data (IndexedDB)

Data that rarely changes lives locally:

```typescript
interface LocalDatabase {
  stars: {
    id: string;
    position: [number, number, number];
    spectralClass: SpectralClass;
    name?: string;
  }[];

  systems: {
    starId: string;
    planets: Planet[];
    stations: Station[];
    lastUpdated: number;
  }[];

  routes: {
    from: string;
    to: string;
    distance: number;
    discovered: boolean;
    traveledAt?: number;
  }[];
}
```

**Sync strategy:**
- On first load: fetch full star catalog from Origin
- On subsequent loads: check catalog version, delta sync if needed
- System details: fetch on first visit, cache indefinitely
- Routes: update when discovered or traveled

### Dynamic State (@wordpress/data)

Ship state and active session data uses WordPress data stores:

```typescript
// Store definition
const shipStore = createReduxStore('helm/ship', {
  reducer,
  actions: {
    setPosition,
    updateShields,
    startAction,
    completeAction,
  },
  selectors: {
    getPosition,
    getShields,
    getActiveAction,
    getActionProgress,
  },
  resolvers: {
    // Fetch from Origin when selector called
    *getShields() {
      const shields = yield fetchFromOrigin('/ship/shields');
      return actions.updateShields(shields);
    },
  },
});

// Usage in components
function ShieldDisplay() {
  const shields = useSelect(select =>
    select('helm/ship').getShields()
  );

  return <BarIndicator level={shields.current / shields.max * 100} />;
}
```

**Sync strategy:**
- Commands: POST to Origin, optimistic update locally
- Polling: Check for action completion every 30s (configurable)
- Push (phase 2): Laravel Reverb for WebSocket real-time updates

### Real-Time Updates (Phase 2)

Polling works but isn't ideal for time-sensitive events (discoveries, encounters). Phase 2 adds WebSocket support via Laravel Reverb:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Origin    │ ───▶ │   Reverb    │ ───▶ │   Client    │
│ (WordPress) │ push │  (Laravel)  │  ws  │  (Bridge)   │
└─────────────┘      └─────────────┘      └─────────────┘
```

- WordPress fires events (action complete, discovery, etc.)
- Events pushed to Reverb server
- Clients subscribe to their ship's channel
- Bridge receives push, updates local state, triggers UI

This keeps WordPress focused on game logic while Reverb handles real-time distribution.

### Bootstrap Sequence

Progressive loading ensures fast initial render:

```
App Launch
    │
    ▼
┌─────────────────────────────────────┐
│ 1. CRITICAL (blocking)              │
│    • Ship state (position, status)  │
│    • Current system data            │
│    • Active actions                 │
└──────────────┬──────────────────────┘
               │
               ▼
        Render game shell
               │
               ▼
┌─────────────────────────────────────┐
│ 2. IMMEDIATE (async, high priority) │
│    • Nearby systems                 │
│    • Known routes from here         │
│    • Recent discoveries             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. BACKGROUND (async, chunked)      │
│    • Full star catalog              │
│    • Historical logs                │
│    • Achievement data               │
└─────────────────────────────────────┘
```

The UI is interactive after step 1. Steps 2-3 happen in the background, populating IndexedDB for future sessions.

### Sync Flow Example

```
User clicks "Start Scan"
         │
         ▼
┌─────────────────────────┐
│ Optimistic UI update    │  ← Immediate feedback
│ "Scan in progress..."   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ POST /ship/actions/scan │  ← Send to Origin
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Origin validates,       │
│ queues work             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Poll for completion     │  ← Every 30s
│ GET /ship/actions       │
└───────────┬─────────────┘
            │
            ▼ (hours later)
┌─────────────────────────┐
│ Action complete!        │
│ • Update local store    │
│ • Cache new discoveries │
│ • Trigger notification  │
└─────────────────────────┘
```

## Package Structure

```
resources/packages/bridge/
├── src/
│   ├── views/
│   │   ├── SystemOverview/
│   │   ├── PlanetDetail/
│   │   ├── ShipStatus/
│   │   └── ...
│   ├── transitions/
│   │   ├── shared-elements.ts
│   │   ├── view-transitions.ts
│   │   └── motion-config.ts
│   ├── data/
│   │   ├── local/
│   │   │   ├── database.ts      # IndexedDB setup
│   │   │   ├── stars.ts         # Star catalog
│   │   │   └── systems.ts       # System cache
│   │   ├── stores/
│   │   │   ├── ship.ts          # Ship state store
│   │   │   ├── actions.ts       # Active actions
│   │   │   └── session.ts       # UI state
│   │   └── sync/
│   │       ├── origin-api.ts    # REST client
│   │       └── polling.ts       # Background sync
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Dependencies

```json
{
  "dependencies": {
    "@helm/ui": "workspace:*",
    "@helm/astrometric": "workspace:*",
    "@wordpress/data": "^10.0.0",
    "framer-motion": "^11.0.0",
    "idb": "^8.0.0"
  }
}
```

- **@wordpress/data**: State management, REST integration
- **framer-motion**: Animation orchestration
- **idb**: IndexedDB wrapper for local storage

## Decisions

**Polling → WebSockets**: Start with polling for simplicity. Phase 2 adds Laravel Reverb for real-time push. WordPress fires events, Reverb distributes to subscribed clients.

**No offline mode**: There is no gameplay without an Origin. If you want to play locally, you run a local Origin (your own WordPress instance). The Origin *is* the game server - it processes time, validates actions, generates content. The client is just a viewport.

**Progressive loading**: Load critical shell data first (current ship state, immediate surroundings), render the UI, then async pull static data (star catalog, system details) in chunks. User sees a working interface immediately while background sync populates the cache.

## Open Questions

- Chunk size for star catalog sync? (1000? 5000?)
- Reverb channel structure? (per-ship? per-system? per-origin?)
- Delta sync format for catalog updates?
- How to handle Origin version mismatches?
