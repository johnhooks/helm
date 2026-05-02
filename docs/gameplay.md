# Gameplay

How Helm actually plays. The loops, the progression, the feel.

## The Setting

This is the early days of interstellar exploration. Ships are barely equipped to handle the journey between stars. Everything degrades, nothing is permanent, and the void is vast. You check in between meetings, before bed, over morning coffee. "What did my ship find?"

## Submarine Warfare in Space

All gameplay in Helm follows the logic of submarine warfare. This isn't a metaphor bolted onto space combat — it's the fundamental model for how ships interact with space and each other.

**You are blind by default.** Space is dark. You know nothing about a system until you actively scan it. Other ships are invisible unless they're doing something that produces emissions. Sitting idle in a system is sitting silent — undetectable.

**Action creates signal.** Every active operation — scanning, mining, jumping, salvaging — produces emissions that can be detected by other ships. The more aggressively you act, the louder you are. A ship running a deep scan at high effort is broadcasting its presence to anyone listening. A ship sitting dark is a ghost.

**Active sonar reveals your position.** PNP scanning (looking for other ships) is the loudest thing you can do. You find targets by broadcasting sweep pulses — and every pulse tells everyone in range that you're hunting. The hunter has to howl to find the prey.

**Patience is a tactic.** Sitting still, listening, waiting — these are valid and powerful strategies. The wolf who parks near a wreck and waits for a salvager to light up is using silence as a weapon. The miner who scans for PNP emissions before starting extraction is using patience as defense.

**Position is abstract.** A system is a location, not a coordinate space. You're _in_ a system — mining its belts, scanning its space, docked at its station. You don't navigate within a system. This is like a submarine operating in a patrol zone, not a specific GPS coordinate. The abstraction keeps the game simple while preserving all the interesting detection and engagement dynamics.

This model unifies everything:

-   **Mining:** You're in a system, extracting resources, creating emissions. Detectable.
-   **Scanning:** You're in a system, sweeping for contacts. Very detectable.
-   **Station building:** You're in a system, constructing. Detectable during active construction.
-   **Siege:** Multiple ships in a system, all acting aggressively. The loudest event possible.
-   **Lying in wait:** You're in a system, doing nothing. Invisible.
-   **Interdiction:** You detect a target, engage. The engagement creates emissions visible to everyone else in the system.

**No visual space.** There's no 3D world because there shouldn't be. In real space, you'd never _see_ another ship. Distances are too vast, objects are too small, and combat happens across millions of kilometers. The fantasy of two ships shooting at each other through a cockpit window is pure fiction. What's real is the data — power levels, sweep patterns, detection probabilities, shield state, envelope phases. The LCARS interface _is_ the game, just like a submarine crew reads sonar displays and instrument panels, not the ocean. The instruments tell the story. A bearing change on a readout is more tense than any rendered explosion.

The submarine model is why detection is hard, why idle ships are safe, why wolf packs are loud, why scavengers work during sieges for cover noise, and why the game feels like a slow, tense ocean instead of a frantic battlefield. Every design decision flows from this premise.

## The Core Loop

```
EXPLORE → MINE → MAINTAIN → EXPAND → REPEAT

1. Scan systems, find asteroid belts
2. Mine belts for resources
3. Use resources to keep your ship running
4. Build infrastructure for bigger operations
5. Push further out as local belts deplete
```

Everything takes real time. Scans take hours. Mining takes hours. Travel takes days. The game fits around your life, not the other way around.

## Resource Extraction

### Belts First, Planets Later

Asteroid belts are the entry point. Your ship pulls up, deploys mining equipment, and extracts ore directly. No infrastructure required, no landing, no gravity wells to fight.

Planets are the long game. A spaceship can't just land there. Mining a planet means bootstrapping — orbital platforms, then shuttles, then surface extractors. Each step requires resources from the previous step, most of which came from belt mining.

This is the Bobiverse model: start with nothing, mine what's easy, build up capability, tackle what's hard.

### Belt Depletion

Every asteroid belt has a resource count — a single number that decrements as anyone mines it. The count is shared across all players. When someone mines, the number goes down.

Belts never hit zero. Instead, extraction time scales inversely with remaining count:

```
extraction_time = base_time * (initial_count / current_count)
```

A fresh belt yields a cargo load in 4 hours. The same belt at 10% capacity takes 40 hours. It's never empty — just increasingly not worth your time.

This means:

-   **Early discoverers get the richest belts** — your scan wasn't just cataloging, it was staking a claim
-   **Systems have a lifecycle** — rich, busy, depleted, abandoned
-   **Exploration never stops** — even veteran players need fresh belts
-   **Desperation mining works** — stranded and low on fuel? A depleted belt can still save you, slowly

### Ship Mining vs. Platform Mining

**The Smuggler** — cloak in, fill the cargo hold, cloak out. You get one load. Safe, simple, small. Perfect for solo players or quick maintenance runs.

**The Industrialist** — drop a mining platform, let it run for days, come back to collect. Much higher yield over time, but you've planted a flag. The platform is visible, needs defending, and the output needs hauling to somewhere useful.

The tension between these two modes creates natural multiplayer dynamics without requiring formal PvP mechanics. Someone finds your platform. Do they raid it? Negotiate? Report its location to someone else?

## Ship Degradation

### Wear as Progression

Everything on a ship degrades with use. But degradation isn't purely negative — it's a tradeoff curve. Use shapes function.

**Scanner** — More use means better accuracy, but draws more power. A well-worn scanner is actually _better_ at finding things. It's just hungry.

**Warp Core** — Degrades over jumps. See `warp-core.md`. A worn core is less fuel-efficient but you've learned its quirks.

**Mining Equipment** — Worn gear extracts slower but wastes less material. You've dialed it in.

**Shields** — Degraded shields recharge slower but the frequency has settled into a stable harmonic.

Every system becomes a personality. Two ships with the same loadout play differently because of their wear patterns. Your ship _is_ your history.

### Maintenance Loop

Resources from belts map to ship systems:

```
MINERALS (iron, nickel, copper)
└── Hull repair, structural maintenance

METALS (titanium, platinum, rare_earth)
└── Replacement parts, system components

ICE (water, hydrogen)
└── Coolant, fuel processing, life support

RARE MATERIALS (from special belts, rogue planets)
└── Calibration materials, degradation curve resets
```

Maintenance isn't "go to station, click repair." It's sourcing specific materials from specific belt types. You plan routes around what your ship needs, not just what pays best.

The rare stuff — materials that let you reset a system's degradation without losing the earned buffs — comes from the hard-to-reach places. Special belts, rogue planets, deep void finds.

### Ship Age

A ship's age — real time since creation — affects its capabilities. A veteran ship that's been through hundreds of jumps has systems that a new ship literally can't match. The scanner has been calibrated through thousands of scans. The drive has been pushed and adapted.

This isn't a level system. There's no XP bar. Time played _is_ the progression. A player who's been around for a year has a ship that can plot a 60 ly jump that a new player's ship can't handle — not because they bought an upgrade, but because their ship has _become_ capable of it through use.

## The Void Between Stars

### Waypoints

Ships travel between stars through waypoints — intermediate nodes in the void. See `navigation.md` for the full system. The key insight for gameplay: waypoints aren't just rest stops. They're scanning opportunities.

### Rogue Planets

At any waypoint, you can choose to scan the surrounding void. Most of the time: nothing. But occasionally, you find a rogue planet — a world ejected from its home system, drifting in the dark.

A rogue planet spawns as its own hidden node, off the waypoint:

```
Star A ──── Waypoint ──── Star B
                │
                └── (hidden) Rogue Planet
```

That hidden node is yours alone. It doesn't appear on anyone else's map. You can:

-   Go back and mine it (ancient ices, exotic materials, untouched resources)
-   Share coordinates with someone you trust
-   Sell the location data
-   Leave it as a personal stash

Finding a rogue planet requires a deliberate choice: stop mid-transit, spend hours scanning, and risk finding nothing. Most players fly right past. The curious ones, the patient ones, are rewarded with secret space.

### Scanning Cost

Scanning at waypoints costs time — hours you could spend continuing your journey. With 4000 stars and millions of possible routes, the void between them is vast. You can't scan every waypoint you pass through. You choose: keep flying, or stop and look?

The well-traveled routes between popular stars near Sol? Probably scanned already. But a 40 ly jump through empty space that nobody's ever plotted? That void is untouched.

## Security Zones

### The Core (~10 Systems)

A cluster of systems around the Origin where station security keeps order. This is where new players start, where trade happens, where you dock and feel safe.

```
CORE SYSTEMS
├── Patrolled by station security
├── Hostile actions punished
├── Trade hubs, refitting, social space
├── Belts: mostly depleted (settled for years)
├── Safe for new players
└── Boring for veterans
```

### The Frontier (Everything Else)

Beyond the core, you're on your own. No security response, no guarantees. But that's where the fresh belts are, the undiscovered planets, the rogue planets, the real finds.

```
FRONTIER
├── No security presence
├── Platforms can be raided
├── Fresh, undepleted belts
├── Undiscovered systems
├── Rogue planets in the void
└── The actual game
```

The core exists to give new players safety and a marketplace. The frontier exists to give everyone a reason to leave.

### The Gradient

Risk and reward scale with distance from the core:

-   **Core**: Safe, depleted, busy. Good for trading, refitting, socializing.
-   **Near frontier**: Some risk, moderate resources. Most players operate here.
-   **Deep frontier**: Real risk, rich belts, rare finds. Expeditions, not commutes.
-   **The void**: Unknown. Waypoint scanning, rogue planets, secret space.

## Resource Geography

### Natural Scarcity

With 4000 stars and random resource distribution, natural clusters and dead zones emerge without any hand-crafting. The universe is big enough that pure random dispersal creates its own stellar geography.

Some sectors end up resource-rich by chance — three or four systems with high-quality metallic belts clustered together. Other sectors are dead stretches where you jump through system after system of thin, picked-over rocky belts.

Nobody placed these clusters. They emerged from the seed, just like real stellar distribution. Players gradually map them out, and that knowledge becomes valuable. "There's a rich metallic cluster about 40 jumps rimward" is the kind of intel that drives expeditions.

### Strategic Implications

-   **Rich sectors are contested** — worth fighting over, worth building platforms in
-   **Chokepoints emerge** — if a rich sector is only reachable through one or two systems, those systems become strategically important
-   **Dead zones are safe** — nobody cares about sparse sectors, making them good hiding spots
-   **Knowledge is tradeable** — knowing where the rich sectors are is itself an asset

## Automation

### Built-In

Since actions take real time, some automation is built into the game:

-   Queue multi-hop routes (ship executes each jump automatically)
-   Set mining cycles (mine, fill cargo, repeat)
-   Platform collection schedules

Without basic automation, the async model breaks — nobody wants to log in every 4 hours to start the next mining cycle.

### Webhook Integration

Power players can connect external systems via webhooks. When an action completes, the Origin fires a webhook to the player's configured endpoint. Their system can then choose the next action via the REST API.

```
ORIGIN fires webhook:
├── "Mining complete, cargo full"
├── Player's server receives webhook
├── Logic: if cargo full, travel to station
├── API call: initiate jump to nearest station
└── Player checks in tomorrow: cargo sold, ship re-deployed
```

This means the game's API surface _is_ the gameplay for a certain type of player. The person writing webhook handlers to optimize their mining empire is playing a completely different game than the person manually flying belt to belt — and they're both having fun.

Client sites running on their own WordPress instances could receive these webhooks, building sophisticated automation chains. The game encourages this — it's the Helm equivalent of Eve's spreadsheet players.

## Salvage Economy

### Nothing Disappears

Every ship ever created persists in the universe until it's scrapped for parts. A destroyed ship becomes a wreck. A wreck sits at coordinates until someone finds and salvages it. Components inside retain their usage history and buffs.

This means the universe accumulates history. Popular routes collect derelicts. Contested sectors become graveyards. Deep space hides ships that ran out of core life mid-jump, drifting until someone scans the right waypoint years later.

### The Salvage Loop

```
WRECK DISCOVERED (via scanning)
    │
    ├─→ Assess components (usage, condition, value)
    │
    ├─→ REPAIR path
    │   ├── High usage + repairable → spend resources to restore
    │   ├── Buffs preserved — a 10,000-use scanner is worth 10x new
    │   └── Repair cost scales with damage
    │
    ├─→ SCRAP path
    │   ├── Low usage or too damaged → melt for materials
    │   ├── Returns ~30% of manufacturing inputs
    │   └── Buffs lost permanently
    │
    └─→ SELL path
        ├── Sell damaged component as-is on market
        └── Let someone else decide repair vs. scrap
```

### Worn Equipment as Treasure

High-usage components are the most valuable items in the game. A scanner with 10,000 scans has accuracy buffs that took someone months to build. You can't buy time. You can't shortcut the usage curve. So a well-worn component found in a wreck is genuine treasure.

This creates a secondary market more interesting than raw materials:

-   New components from manufacturers (baseline)
-   Recovered components from salvagers (damaged but experienced)
-   Veteran gear sold by upgrading players (premium)
-   Legendary finds from ancient wrecks in deep space (priceless)

### Partial Salvage

A ship can only take what fits in its cargo hold. A raider grabs the high-value pieces and leaves. A salvager comes later for the rest. Multiple players might pick over the same wreck. What's left gets less valuable each time until someone scraps the hull for raw materials.

### Wreck Discovery

Wrecks are passive — they sit at coordinates emitting nothing. Finding them requires active scanning, which means the salvager has to look. But different contexts create different discovery dynamics:

**Peaceful salvage.** Scan a system, find an old wreck, salvage at leisure. Nobody around, no pressure. The standard loop. Most salvage happens this way — old wrecks from core life failures, abandoned ships, ancient derelicts in deep space.

**Post-battle salvage.** After a station siege or major engagement, the system is littered with fresh wrecks from both sides. These contain high-value components — combat-fitted ships carry expensive gear with deep usage history. The system becomes a salvage rush.

**Salvage during combat.** The most interesting scenario. During an active siege, both sides are scanning aggressively — PNP scans for reinforcements, system scans for tactical awareness. The system is loud with emissions. A salvager working during the chaos benefits from the noise — their salvage emissions get lost in the background. But they're operating in an active combat zone. Stray interdiction fields, combat ships looking for soft targets, and the risk of being mistaken for a combatant.

The optimal scavenger play is to work _during_ the siege, not after. During the siege, the noise covers you. After the siege, the system goes quiet, the scanning stops, and the lone salvager is the only emission source — suddenly exposed. But working during the siege means accepting real danger for better cover.

**The covert salvager's dilemma.** A wreck is passive and undetectable. A ship _salvaging_ a wreck is active — running extraction equipment, creating emissions, just like mining creates a signature. The salvager is invisible while traveling and scanning. The moment they start extracting, they light up. Grab and run, or take time to strip the wreck properly? Every minute extracting is a minute broadcasting your position.

This creates a natural food chain around major events. The siege commanders fight over the station. The scavengers fight over the scraps. The scouts sell intel on wreck locations. The haulers move recovered components to market. A single siege generates gameplay for dozens of players who never fired a shot.

## Player Progression

Player experience is separate from ship/component state. It persists across ships. Lose your Pioneer, grieve, commission a new one — but you're not starting from zero.

### Experience Counters

Every successful action increments a counter on the player. These translate to small buffs via a logarithmic curve — early actions matter most, veterans plateau.

```
PLAYER BUFFS (persist forever)
├── Scans completed     → scan success bonus
├── Mines completed     → yield reading bonus
├── Jumps completed     → fuel efficiency bonus
├── Routes discovered   → nav computation bonus
├── Trades completed    → market insight bonus
└── Salvages completed  → condition assessment bonus
```

The difference between 0 and 100 scans is huge. Between 1000 and 2000 is marginal. Veterans are better, not untouchable.

### Layered Progression

Player buffs and component wear stack:

-   **Veteran pilot + veteran ship** — formidable, peak performance
-   **Veteran pilot + fresh ship** — competent, gear needs breaking in
-   **Rookie pilot + veteran ship** — benefits from the gear, still learning
-   **Rookie pilot + fresh ship** — baseline, everything ahead of them

Losing a ship means losing component buffs until you find or buy replacements. But player buffs carry over instantly. The pain is real but not fatal.

## Player Archetypes

These aren't classes — they're emergent roles based on how people choose to play:

**The Explorer** — Pushes into unknown space, scans waypoints, finds rogue planets. Sells location data or keeps secrets. Ship is old, worn, accurate.

**The Miner** — Works belts efficiently, knows which types yield what, moves on when returns diminish. Might run a fleet of platforms across multiple systems.

**The Hauler** — Moves resources from platforms to markets. Knows the trade routes, the price differences, the arbitrage opportunities. Big cargo, slow ship.

**The Homesteader** — Picks a system, builds infrastructure, defends it. Platform mining, orbital stations, the long game. Rarely leaves their system.

**The Smuggler** — Cloaked ship, quick mining runs into other people's territory. Grabs a load and vanishes. Low overhead, high agility.

**The Salvager** — Scans for wrecks, assesses component value, repairs and resells. Knows the repair math cold. Haunts old battlefields and deep space routes where ships ran out of core life.

**The Vulture** — A specialized salvager who follows conflict. Monitors siege broadcasts, tracks pirate activity, and shows up where ships are being destroyed. Works during active combat for the cover of scan noise. Knows the risk calculus: how long to extract before the emissions give them away. Lives on the edge of someone else's fight.

**The Automator** — Webhook handlers, API scripts, optimized logistics chains. Plays the game through code. Their WordPress instance is their bridge. May run bot fleets that grind component usage — and that's fine.

## Summary

Helm gameplay emerges from:

1. **Real time** — Actions take hours and days, not seconds
2. **Finite resources** — Belts deplete, ships degrade, cores burn out
3. **Bootstrapping** — Start small (belt mining), build up (platforms), go big (planet mining)
4. **Secret space** — Rogue planets, hidden nodes, private knowledge
5. **Natural scarcity** — Random distribution creates geography worth fighting over
6. **Two mining modes** — Solo ship runs vs. persistent infrastructure
7. **Degradation as progression** — Components gain buffs through use, creating unique ships
8. **Persistent universe** — Wrecks accumulate, nothing disappears, history is physical
9. **Layered progression** — Player experience persists, component experience transfers with the part
10. **Automation as gameplay** — Webhooks and APIs for players who think in systems

The game rewards patience, curiosity, and planning. Check in before bed. See what your ship found. Plan tomorrow's route over coffee. That's Helm.
