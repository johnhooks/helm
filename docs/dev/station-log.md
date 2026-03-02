# Station Log

How stations record what happens to them without being actors themselves.

## Stations Are Not Ships

Ships have action slots, timelines, locks, and deferred resolution. Stations don't. A station is an environmental entity at a node — it has state (defenses, allegiance, services) and it modifies the environment for ships operating nearby. It never initiates actions.

Everything in the station log traces back to a ship_action or a system event. The station is always the object, never the subject.

## Log vs Actions

| | Ship Actions | Station Log |
|---|---|---|
| **Role** | Event system — drives state changes | Ledger — records consequences |
| **Initiator** | Ship (player or system) | Always external |
| **Lifecycle** | Phases, locks, deferred resolution | Immediate — written during ship action resolution |
| **State changes** | Mutates ship state | Mutates station state |
| **Source of truth** | Yes — what happened and why | Projection — what happened to this station |

## Schema

```
station_log:
  id
  station_id
  event_type        // what kind of effect
  ship_action_id    // what caused this (nullable — system events have no parent)
  detail            // result data (damage, state change, etc.)
  created_at
```

## Event Types

| Type | Trigger | Example |
|------|---------|---------|
| `siege_damage` | Ship siege action resolves | Shields reduced by 12%, hull hit for 5 |
| `covert_op` | Ship covert action resolves | Intel extracted, sabotage applied |
| `intervention` | PVP engagement near station | Defense guns fired on aggressor, shield extended to defender |
| `service_used` | Ship uses station service | Repair, refuel, trade |
| `trade` | Ship buys/sells at station market | 50 titanium sold, refs ledger entry |
| `docking_fee` | Ship docks at station | 200 credits collected, refs ledger entry |
| `tax` | Tax applied to transaction | Sales tax on trade, refs ledger entry |
| `state_change` | Cumulative damage threshold | Station enters damaged state, services degraded |

New event types added as station interactions expand.

## How It Works

### Ship Actions Against Stations

A ship submits a `siege` or `covert_op` action targeting a station. The action follows the normal ship_action lifecycle — phases, locks, deferred resolution. When it resolves:

1. Handler calculates the outcome (ship loadout, crew skill vs station defenses)
2. Station state is updated (damage applied, defenses reduced)
3. Station log entry written with `ship_action_id` reference
4. All within the same transaction as the ship_action result

The station doesn't "respond" as a separate action. The response (defense guns, damage resistance) is part of the ship action's resolution math.

### Station Intervention in PVP

When a PVP engagement (fire_torpedo, fire_phaser) resolves near a station, the handler checks for station presence and allegiance. The station's effect is a modifier on the engagement result:

- Defense guns add damage to the aggressor
- Station shields extend to allied defenders
- Penalties applied based on station allegiance

The intervention is recorded as a station log entry referencing the PVP ship_action. The ship's action result includes the station modifier. Neither side submits a separate action — the station's influence is baked into the resolution.

### Trade and Economy

Trade transactions at a station write to the station log, but the station log is not the financial ledger. A separate ledger system tracks the authoritative record of credits, items, and ownership. The station log records that a trade happened and its effect on the station — the ledger records the actual transfer.

A ship sells cargo at a station market:

1. Ship submits a trade action (or interacts with a station service)
2. Handler resolves the transaction
3. Ledger entries created — credits transfer, inventory transfer (authoritative)
4. Station log: `trade` entry referencing the ledger transaction and ship_action
5. Station log: `tax` entry if applicable, referencing the ledger
6. Station state updated (treasury, market inventory)

```
station_log (trade example):
  event_type: trade
  ship_action_id: <ship's trade action>
  detail: { ledger_id: 4821, summary: '50 titanium sold for 12,000 credits' }

station_log (tax on that trade):
  event_type: tax
  ship_action_id: <same trade action>
  detail: { ledger_id: 4822, tax_type: 'sales', amount: 600 }
```

The station log links to the ledger for financial detail. It doesn't duplicate amounts or try to be the source of truth for money. Its job is "what happened to this station" — the ledger's job is "who owns what."

Multiple log entries per ship_action is expected. A single trade can produce a `trade` entry, a `tax` entry, and potentially a `state_change` if the transaction triggers an inventory threshold.

### System Events

Some station log entries have no ship_action parent:

- Scheduled maintenance cycles
- Economy ticks (resource generation, price updates)
- Decay from neglect (undefended station degrades over time)

These are system-driven, written by background jobs. `ship_action_id = NULL`.

## Station State

Stations have persistent state that ship actions and system events modify:

- **Defenses** — shield strength, gun emplacements, repair capacity
- **Allegiance** — faction ownership, player reputation effects
- **Services** — what the station offers (repair, trade, intel) and current availability
- **Condition** — cumulative damage affects service availability and defense capability
- **Treasury** — accumulated credits from taxes, fees, trade margins
- **Market** — inventory, prices, supply/demand state

State is modified during ship action resolution or system ticks. The station log records each change for auditability.

## Relationship to Broadcasting

Station log entries are not ship_actions — they don't flow through the ship action broadcast pipeline. Stations need their own notification path:

- Ships docked or near a station may subscribe to station updates
- Station state changes (damage, service outage) broadcast to nearby/docked ships
- Same transport-agnostic approach as ship action broadcasting — REST polling now, WebSocket push later

## Not in Scope

- Station construction or ownership transfer mechanics
- Ledger system design (credits, items, ownership transfers, inventory)
- Price determination mechanics (supply/demand curves, NPC vs player markets)
- Tax rate governance (who sets rates — faction, player owner, system)
- Station-to-station interactions (supply lines, trade routes)
- Autonomous station behavior (self-repair is a system tick, not station agency)
