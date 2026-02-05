# Conflict

How combat works, why griefing doesn't pay, and where aggression belongs.

## Design Philosophy

Combat exists but the game doesn't reward predation on other players. Being a pirate is possible — it's just hard, expensive, and mostly not worth it compared to building. The game channels aggression toward the Others (see `others.md`) where fighting is necessary and rewarding.

The goal: a universe where cooperation and construction are the path of least resistance, and predators exist but live a tenuous, difficult life.

## Why Griefing Doesn't Pay

Every mechanic in Helm conspires to make player-on-player violence unprofitable.

### Combat Is Mutually Destructive

Attacking a ship damages YOUR components too. Shields absorb hits on both sides. Drives burn core life maneuvering. Sensors take wear from targeting. Every fight ages both ships.

```
ATTACKER COSTS (per engagement)
├── Shield damage:        condition loss on shield component
├── Core life:            burned during combat maneuvers
├── Weapon wear:          usage count + condition damage
├── Hull damage:          integrity loss from return fire
└── Component wear:       all active systems accumulate usage
```

You don't walk away clean. Even a "winning" fight leaves you worse off than before it started.

### Loot Is Damaged

When you destroy a ship, the wreck's components have heavily reduced condition from the destruction. The cargo scatters — some is lost. What remains is damaged goods.

```
TARGET SHIP (before attack)
├── DSC Mk I sensor:     condition 0.8, usage 8400
├── Cargo:                200 m³ of platinum ore

WRECK (after destruction)
├── DSC Mk I sensor:     condition 0.2, usage 8400
├── Cargo:                ~120 m³ of platinum ore (rest lost)
└── Everything else:      condition reduced by 0.4-0.6
```

That scanner you wanted? It'll cost nearly as much to repair as buying a new one. And a new one would have had full condition — just no usage buffs. The economic case for stealing components is thin.

### Cargo Hold Limits

A combat-oriented ship has small cargo capacity. The scout loadout gives you 125 m³. You destroy a hauler carrying 300 m³ of ore and... you can carry less than half. The rest sits in the wreck for a salvager who did no fighting.

The pirate often creates more value for salvagers than they capture for themselves.

### Reputation Costs

Attacking other players near stations tanks your reputation. Stations track aggression.

```
REPUTATION CONSEQUENCES
├── Attack near station:      major reputation loss
├── Destroy player ship:      reputation loss with all stations in sector
├── Repeated aggression:      flagged as hostile
│
├── At "hostile" standing:
│   ├── Station refuses docking
│   ├── No repairs available
│   ├── No market access
│   ├── No refueling
│   └── No component purchases
│
└── Recovery:
    ├── Slow — requires trade, delivery, constructive actions
    ├── Takes weeks of real time
    └── Other stations in the sector also know
```

A pirate who burns their reputation has to travel further and further for basic services. Eventually they can't repair their own combat damage. That's unsustainable.

### Security Zones

The core ~10 systems have station security. Attack someone there and security responds — your ship is destroyed. Your components become salvage for the person you tried to grief.

```
CORE SYSTEM SECURITY
├── Attack detected → security engages immediately
├── Security ships are overwhelming (not a fair fight)
├── Attacker ship destroyed → becomes wreck
├── Attacker's components salvageable by victim
├── Victim's ship may survive (shields, hull)
└── Attacker respawns at nearest station in a starter ship
```

New players are safe in the core. They can learn, trade, and get established without fear. The frontier is where risk begins.

### Time Is the Real Cost

The biggest cost of piracy is opportunity cost. Time spent hunting, fighting, and repairing is time not spent mining, trading, or exploring.

```
PIRACY (8 hour operation)
├── Travel to target system:    4 hours
├── Find and engage target:     2 hours
├── Loot wreck:                 30 minutes
├── Travel to fence goods:      4 hours
├── Repair own damage:          2 hours + resources
├── Net haul:                   ~100 m³ of damaged goods
└── Profit:                     maybe 3000 credits after repairs

MINING (8 hours)
├── Travel to belt:             2 hours
├── Mine:                       6 hours
├── Net haul:                   full cargo of ore
├── Component wear:             generates buffs
├── Reputation:                 maintained
└── Profit:                     5000+ credits, no repair costs

PIRACY PROFIT:     ~375 credits/hour, reputation damage, component damage
MINING PROFIT:     ~625 credits/hour, buff generation, reputation maintained
```

Piracy is a lifestyle choice, not an optimization strategy.

## When Combat Matters

### Vs. The Others

Fighting Others is necessary and rewarding. They compete for your resources, threaten your platforms, and carry alien components worth salvaging.

```
FIGHTING OTHERS
├── Defending your platforms:       protects your investment
├── Clearing Others from a sector:  restores resource access
├── Salvaging Other ships:          alien components (unique, valuable)
├── Alien materials:                needed to repair alien gear
├── Community standing:             respected for defending shared space
└── No reputation penalty:          stations reward Other kills
```

The same combat mechanics that make piracy costly make fighting Others rewarding. The mutual damage still applies — but the loot is alien tech you can't get any other way, and stations reward you for it.

### Platform Defense

Your mining platform is threatened — by another player or by Others. Combat to defend your investment is rational.

```
PLATFORM DEFENSE
├── Defender advantage:   you're already in the system
├── Attacker traveled:    they burned core life getting here
├── Platform is valuable: days/weeks of accumulated resources
├── Defender reputation:  maintained (you're defending property)
├── Attacker reputation:  damaged (aggression against infrastructure)
└── Asymmetric:           defender has more to gain than attacker
```

### Wreck Disputes

Two salvagers find the same wreck. Both want the 8,000-use scanner inside. Combat is technically an option — but the fight damages both ships, and neither might end up with a working scanner afterward.

More likely outcome: negotiation. "You take the scanner, I take the drive." The mechanics push toward cooperation even in competitive moments.

## Ship-to-Ship Combat

### How It Works

Combat is async, like everything else. It's not real-time dogfighting — it's decisions made and outcomes resolved over time.

```
ENGAGEMENT
├── Attacker initiates:     queues attack action
├── Defender notified:      notification system alerts them
├── Resolution window:      hours (not seconds)
│
├── If defender is online:
│   ├── Can choose to fight, flee, or negotiate
│   ├── Flee burns core life but avoids combat
│   └── Fight resolves based on loadouts + component stats
│
├── If defender is offline:
│   ├── Ship auto-defends (shields + basic response)
│   ├── Attacker has advantage but still takes damage
│   └── Defender returns to find wreck or damaged ship
│
└── Resolution:
    ├── Both ships take damage (component condition reduced)
    ├── Loser's ship may be destroyed (wreck)
    ├── Winner may be too damaged to continue operating
    └── Neither side walks away clean
```

### Combat Stats

Derived entirely from components and their wear:

```
OFFENSIVE
├── Weapons:          equipment slot (if installed)
├── Targeting:        sensor accuracy (worn sensors = better targeting)
├── Power:            core output (affects weapon cycling)
└── Maneuver:         drive speed (evasion)

DEFENSIVE
├── Shields:          capacity + regen (from shield component)
├── Hull:             integrity (base + repair module)
├── Evasion:          drive speed + sensor awareness
└── Escape:           drive range (can you jump out?)
```

No separate combat stats. Everything comes from the same components used for exploration, mining, and hauling. A scout with a DSC Mk I sensor and DR-705 drive is actually decent in a fight — good targeting, high evasion — but has no dedicated weapons and light shields.

## The Predator's Life

Being a pirate IS a valid playstyle. It's just hard.

```
THE PIRATE'S CHALLENGES
├── Where to repair?
│   └── Reputation too low for most stations
│       └── Must find remote stations or pay premium
│
├── Where to sell loot?
│   └── Known pirates can't use normal markets
│       └── Black market? Player-to-player trades?
│
├── How to survive?
│   └── Every fight damages your ship
│       └── Components degrade, repair resources scarce
│
├── Where to hide?
│   └── Core systems kill you on sight
│       └── Frontier stations may refuse you
│           └── Deep space is lonely
│
└── Is it worth it?
    └── Honestly? Probably not financially
        └── But some people want to be space pirates
            └── And that's their choice
```

The game doesn't forbid it. It just makes the math clear. A pirate is choosing a harder path because they want to, not because the game rewards it. And their existence creates content for everyone else — bounty hunting (future), wreck salvage, cautionary tales.

## Conflict Escalation Ladder

Most conflicts resolve without combat because the mechanics push toward alternatives:

```
1. AVOIDANCE
   └── Cloaking device, different routes, timing

2. DETERRENCE
   └── Heavy shields, defensive loadout, group presence

3. NEGOTIATION
   └── Split resources, trade, share intel

4. COMPETITION
   └── Mine faster, deploy more platforms, out-produce

5. HARASSMENT
   └── Steal from platforms (risky, reputation cost)

6. COMBAT
   └── Last resort — expensive for both sides

Each step up costs more and gains less.
Most interactions never get past step 4.
```

## Summary

Conflict in Helm:

1. **PvP is possible** but mechanically expensive and socially punished
2. **PvE (Others) is necessary** and well-rewarded with unique loot
3. **Defense is rational** — protecting platforms and territory makes sense
4. **Predation is tenuous** — pirates exist but live a hard, unsustainable life
5. **Combat is mutual** — both sides take damage, no clean wins
6. **The game nudges cooperation** — the math always favors building over destroying
7. **Aggression has a target** — the Others provide a worthy, escalating threat
8. **Security zones protect new players** — the core is safe, the frontier is your choice

The universe has predators. They eat the young sometimes. But their existence is tenuous, and the game doesn't pretend otherwise.
