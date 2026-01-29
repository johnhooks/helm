# Federation Protocol

How Origins can connect in the future. Designed for, not implemented yet.

## Current Model: Single Origin

For now, Helm runs as a single Origin server.

```
                    ┌─────────────┐
                    │   ORIGIN    │
                    │             │
                    │ - All state │
                    │ - All logic │
                    │ - All truth │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │ Ship A  │       │ Ship B  │       │ Ship C  │
    │  (WP)   │       │  (WP)   │       │  (WP)   │
    └─────────┘       └─────────┘       └─────────┘

    Ships are clients. Origin is the server.
```

## Future Model: Federated Origins

Multiple Origins, each sovereign, connected by trade deals.

```
    ┌─────────────┐                    ┌─────────────┐
    │  ORIGIN A   │◄── TRADE DEAL ────►│  ORIGIN B   │
    │             │                    │             │
    │ Own economy │                    │ Own economy │
    │ Own ships   │                    │ Own ships   │
    └──────┬──────┘                    └──────┬──────┘
           │                                  │
      ┌────┴────┐                        ┌────┴────┐
      │ Ships   │                        │ Ships   │
      └─────────┘                        └─────────┘
```

## API Design Principles

We design APIs now that don't block federation later:

### Ship Identity

```php
// Ship IDs include origin (future-proof)
'ship_id' => 'origin-alpha:ship-enterprise'

// For now, origin prefix is implicit/default
// Later, allows cross-origin identification
```

### Work Unit Submission

```php
// Work units reference origin
[
    'origin' => 'origin-alpha',
    'ship_id' => 'ship-enterprise',
    'type' => 'mine',
    'params' => [...],
]

// For now, origin is always "self"
// Later, could process work from federated ships
```

### Discovery Registration

```php
// Discoveries tagged with origin
[
    'node_id' => 'HIP_8102:planet_3',
    'discovered_by' => 'origin-alpha:ship-enterprise',
    'origin' => 'origin-alpha',
    'timestamp' => 1706472000,
]

// For now, all discoveries are local
// Later, could sync discoveries across origins
```

## What Federation Enables (Future)

### Shared Discovery Data

Origins could share what's been discovered:

```
Origin A discovers HIP_8102 system
    ↓
Origin A publishes discovery hash
    ↓
Origin B verifies (re-generates, same result)
    ↓
Both origins know what's at HIP_8102
```

The universe is deterministic. Same generation algorithm + same seed = same content. Origins can verify each other's discoveries.

### Ship Transfers

With a trade deal, ships could emigrate:

```
Ship on Origin A wants to move to Origin B
    ↓
Check trade deal terms (tariffs, limits, requirements)
    ↓
Ship meets requirements? Proceed
    ↓
Origin A: Remove ship, deduct assets
Origin B: Create ship, credit assets (minus fees)
    ↓
Ship now exists on Origin B
```

### Cross-Origin Trading

With a trade deal, items could transfer:

```
Ship on A wants to sell platinum to ship on B
    ↓
Trade deal allows platinum? Check quota?
    ↓
Calculate tariff
    ↓
Execute trade across origins
```

## What Stays Local

Even with federation, some things stay per-Origin:

```
ALWAYS LOCAL:
├── Credit balances (origin's economy)
├── Work unit processing (origin computes)
├── Inventory tracking (origin's database)
├── Market prices (local supply/demand)
└── Trust/reputation (origin's players)

COULD FEDERATE:
├── Discovery data (the map)
├── Ship transfers (with deals)
├── Item transfers (with deals)
└── Reputation portability (maybe)
```

## Trade Deals (Future)

See `federation-trade.md` for detailed trade deal mechanics.

Summary:
- Origins negotiate bilateral agreements
- Deals specify: tariffs, quotas, limits, requirements
- Transfers happen within deal bounds
- No deal = no transfers

## Deterministic Generation

For federation to work, generation must be deterministic:

```
Same seed + same algorithm = same content

Origin A generates HIP_8102 → gets specific planets, resources
Origin B generates HIP_8102 → gets SAME planets, resources

This allows verification without trust.
```

See `determinism.md` for implementation details.

This is why we maintain determinism even in single-Origin mode - it's the foundation for future federation.

## Current Implementation

### What We Build Now

```
PHASE 1 (Current):
├── Single Origin server
├── Ships as clients
├── Full game loop (explore, mine, trade)
├── APIs with origin prefixes (ready for federation)
├── Deterministic generation (verifiable)
└── No cross-origin features

PHASE 2 (Future):
├── Multiple Origins can exist
├── Discovery sharing protocol
├── Trade deal negotiation
├── Ship transfer mechanics
└── Cross-origin verification
```

### API Endpoints (Current)

```
# Ship → Origin
POST /helm/work              - Submit work unit
GET  /helm/work/{id}         - Get work status
GET  /helm/ship/state        - Get ship state
POST /helm/trade             - Execute trade
GET  /helm/map               - Get known map

# Future: Origin → Origin
POST /federation/discover    - Share discovery
POST /federation/transfer    - Transfer ship/items
POST /federation/deals       - Negotiate trade deals
```

## Summary

Federation is a future capability, not current scope.

**Now:**
- Single Origin holds all truth
- Ships are clients
- APIs designed for future federation
- Deterministic generation maintained

**Later:**
- Multiple Origins with trade deals
- Shared discovery data
- Ship/item transfers with tariffs
- Political/economic gameplay between Origins

The architecture supports it. We just don't build it yet.
