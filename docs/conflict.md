# Conflict

How combat works, why space is dangerous but not cruel, and where aggression belongs.

## Design Philosophy

Space is wild. Players in a space MMO expect that. But Helm is async — you check in over morning coffee, not during a raid timer. Combat has to respect that. The pilot who logs off for the night shouldn't come back to a destroyed ship.

The answer isn't making space safe. It's making destruction rare, expensive, and socially punished — while making the _threat_ of encounter ever-present. There are more bison than wolves for a reason. It's hard to be a predator.

Combat channels through three tiers:

1. **The Others** — PvE. Necessary, rewarding, the primary combat content.
2. **Interdiction** — PvP. The wolf catches prey, takes cargo, both ships survive.
3. **Destruction** — PvP escalation. Deliberate, taboo, comes with a bounty.

---

## Detection: The Hard Part

Space is huge. Finding another player is the real challenge. The detection model is built on the sensor sweep system (see `docs/plans/envelopes.md`).

### Passive vs Active Scanning

**System scanning** is what players normally do — scanning for resources, anomalies, points of interest. This is the core gameplay loop.

**PNP scanning** (player-to-player) is different. It's a distinct scan type that searches for other ships. And it's detectable — every sweep peak emits a signature that other ships can pick up.

The hunter has to howl to find the bison. Every bison hears it.

### Detection Rules

**Idle ships are invisible.** A ship that isn't actively scanning or jumping produces no emissions. It cannot be found by passive detection. A player who logs off in open space is safe. This is non-negotiable for the async model to work.

**Active ships emit.** A ship running a PNP scan broadcasts its presence on every sweep peak. The more aggressively it scans (higher effort = more sweeps), the louder it is.

**Passive detection is unreliable.** Detecting another ship's emissions requires being in range, listening, during the brief window their sweep peaks fire. The math almost guarantees misses. Two ships in the same region usually never know the other exists.

**System scanning is quieter.** Normal resource/anomaly scans produce weaker emissions than PNP scans. Detectable in theory, but the range is much shorter and the chance much lower. A miner scanning asteroids isn't broadcasting their position to the whole system.

### The Typical Outcome

Most of the time: nothing. The pirate scans, finds nothing, moves on. The explorer was there the whole time, oblivious. The wolf burns core life jumping between systems hoping to get lucky.

But occasionally — rarely — it lines up. "Contact detected" in a PNP context means something completely different than finding an asteroid. That rarity is what makes it exciting.

### Sensor Character in PVP

Each sensor type has a different PNP profile based on its sweep period:

-   **ACU (rapid sweeps):** Finds targets faster but broadcasts more frequently. Loud hunter, quick results.
-   **VRS (moderate sweeps):** Balance of detection speed and stealth.
-   **DSC (long dwell):** Fewer emissions per hour. Quieter hunting, but much slower to find anything.

---

## Interdiction

Interdiction is the default combat interaction. A wolf catches prey and takes cargo. Both ships survive.

### How It Works

1. **Detection.** The attacker finds a target through PNP scanning (rare, expensive).
2. **Interdict.** The attacker initiates interdiction. If the target is mid-jump, this pulls them out at the next waypoint checkpoint. If stationary, an interdiction field prevents jumping.
3. **Shield drain.** The attacker's weapons drain the target's shields. This takes real time — hours, not seconds. The envelope/checkpoint system handles resolution.
4. **Shields down → cargo transfer.** When shields drop, the attack automatically halts. The attacker doesn't keep firing. Cargo transfer begins.
5. **Both ships survive.** The target's shields are depleted and their cargo is gone. The attacker's components took wear from the engagement. Nobody's ship is destroyed.

### The Cargo Window

When shields drop, there's a **cargo transfer window** — a time frame (hours) during which the loot is accessible. This matters because the defender might not be online.

-   If the **defender is online:** they can choose which cargo to jettison and which to try to protect. Maybe they dump the cheap ore and keep the rare find. Negotiation is possible — "take the platinum, leave the alien salvage."
-   If the **defender is offline:** the attacker gets access to the full hold, limited by their own cargo capacity. The defender comes back to find their hold lighter but their ship intact.
-   If **neither acts** before the window closes: the interdiction field collapses, remaining cargo stays with the defender.

### The Attacker's Constraints

Interdiction isn't free:

-   **PNP scanning cost:** Core life and power burned finding the target.
-   **Engagement wear:** Weapons, shields, and core all take condition damage during the shield drain.
-   **Time:** Hours spent draining shields is hours not spent mining or exploring.
-   **Cargo capacity:** A combat-fitted ship has limited cargo space. You can't take everything.
-   **Reputation hit:** Minor, but logged. Frequent interdictions stack up.

The pirate often creates more value for salvagers (who find the scattered leftovers) than they capture for themselves.

### Automation and Interdiction

Both sides can use ship automation (see `docs/ideas/automation-compute.md`) to handle interdiction:

**Prey automation:** `onEvent('pnp_scan_detected') → cancel mining → spool jump → flee`. The bison doesn't need to be online. Their flee script fires, and by the time the wolf's next sweep peaks, the target is gone.

**Predator automation:** `onEvent('passive_contact') → interdict → engage`. But the trigger event is so rare that the script sits idle for days. Automation doesn't make hunting easy — it makes the wolf's reaction instant on the rare occasion something lines up.

Neither side gets an unfair advantage from automation. The bison's flee script is simple and reliable. The wolf's hunt script is sophisticated but starved of triggers. The asymmetry isn't in the code — it's in the frequency of events.

### Wolf Packs

A solo pirate has a cargo problem. A PVP-fitted ship is loaded with weapons and shields, not cargo space. You interdict a hauler carrying 300 m³ and you can carry maybe 100 m³. The rest floats in space.

The wolf pack solves this through division of labor:

-   **The interceptor:** Combat-fitted. Scans, interdicts, drains shields. Carries almost nothing.
-   **The haulers:** Lightly armed or unarmed. Show up after shields drop with empty cargo holds. Strip the target clean.

The interceptor is the tool, not the hauler. It's there to crack the shell. The pack carries the meat. Just like actual wolves — the kill is shared because no single wolf can consume it alone.

**But packs are loud.** More ships scanning means more emissions. More emissions means more chances for prey to detect the pack and flee before interdiction. The pack trades stealth for cargo capacity. A solo wolf is quiet but wastes most of the loot. A pack can strip a hauler clean but announces itself to the whole system.

This creates a natural tension for pirates: operate alone and waste cargo, or pack up and risk detection. There's no right answer — it depends on the target, the system, and how alert the prey is.

### The Aftermath

After interdiction, the target's ship is alive but vulnerable. Shields depleted, capacitor near zero, drive in cooldown. The drive envelope's spool phase requires a large upfront power draw — with an empty capacitor, the ship literally can't jump until it regenerates enough power to survive the spool spike.

This recovery window is the most dangerous moment. Not from the original attacker — they got what they wanted and left. But a second opportunist could find a shieldless, grounded ship. That's where real destruction risk lives.

How long the ship is grounded depends on the ship, not a rule. A strong core recharges the capacitor faster. A DR-305's gentle spool spike lets you limp out sooner. A DR-705's aggressive spike keeps you grounded longer. The envelope math handles the punishment naturally.

For wolf packs, this window is also where the haulers are most exposed. They're sitting in space transferring cargo with minimal defenses. If the prey's allies show up, the haulers scatter or get caught. The pack is powerful during the interdiction but fragile during the looting.

### Wrecks as Bait

A smart wolf never destroys a wreck. The wreck is passive — it emits nothing, just floats at known coordinates. But eventually a salvager shows up to strip the components. The moment they start extracting, they light up with emissions. Now the wolf has a second target without spending any resources on PNP scanning.

The wolf doesn't need to hunt. They already know where the bait is. They sit dark, invisible, and wait. The salvager comes to them.

And it cascades. The second interdiction leaves another looted ship. More bait. A system with multiple wrecks becomes a trap field — each one a potential lure for the next curious salvager. The wolf farms a position instead of hunting across systems.

This is why destruction is almost always wrong from the wolf's perspective:

-   **Destroying costs resources** — component wear, power, time
-   **Destroying generates bounty** — reputation damage, station exile
-   **Destroying eliminates the bait** — no wreck, no salvager, no second target
-   **Looting is the profit, the wreck is the infrastructure**

The wolf who understands this never destroys anything. They interdict, loot, leave, and wait. The wreck does the recruiting. The salvager's greed does the rest.

Counter-play exists: salvagers who scout before extracting, who scan for nearby ships before committing, or who bring escorts. A wolf sitting dark near a wreck is invisible — but the moment they interdict the salvager, they become detectable too. The predator's patience is their strength, but it only works once per position before word gets out.

---

## Destruction

Destruction is possible. The threat is real. But it's taboo.

### Two Separate Actions

Interdiction and destruction are distinct actions. When shields drop and cargo transfers, the engagement is **over**. The attacker's weapons stop firing. To destroy the ship, the attacker must initiate a **second, deliberate attack** on a shieldless, already-looted target.

This is never accidental. The game makes you choose it explicitly. There's no loot left to take — the cargo is already gone. Destruction is purely punitive.

### Why Would Anyone Do It?

-   **Grudge.** Personal vendetta. Expensive revenge.
-   **Territory.** Sending a message: "don't come back here."
-   **Griefing.** Some players just want to destroy things.

All of these are valid player motivations. The game doesn't prevent them. It just makes the cost enormous.

### The Bounty

Destroying a player ship triggers an automatic bounty from the Origin. This isn't a minor reputation hit — it's a material consequence.

**First destruction:**

-   Large bounty placed on the attacker, visible to all players
-   Reputation hit with all stations in the sector
-   The victim's ship record (name, loadout, age) is attached to the bounty — everyone knows what was lost

**Escalating destructions:**

-   Bounty multiplies with each kill
-   Station access degrades: higher prices → refused service → refused docking
-   The attacker's ship signature becomes flagged — easier to detect on passive scans
-   Other pirates distance themselves (association draws heat)

**At the extreme:**

-   Effectively exiled from the economy. Can't dock, can't trade, can't resupply.
-   The bounty is large enough that hunting the destroyer becomes profitable for other players.
-   The wolf that kills for sport becomes prey.

### The Bounty Hunter

Escalating bounties create a third player archetype: the bounty hunter. A wolf that hunts wolves.

Their detection problem is easier than a pirate's — the target has a flagged signature and a known record. Their engagement is socially rewarded — stations welcome them, reputation improves. And the payout is real: the bounty covers their operational costs.

The bounty hunter exists because the destroyer created them. The ecosystem self-corrects.

### Destruction Isn't Deletion

A "destroyed" ship doesn't vanish. It becomes a wreck — disabled, adrift, but physically present with all its components inside. Nothing disappears from the universe.

The hull is damaged but potentially salvageable. The components inside — drive, sensor, shield, core — are damaged but retain their usage history, drift, and experience buffs. A 10,000-use scanner with deep sensor drift is still in that wreck. It needs repair, but the months of accumulated experience aren't gone.

This matters in several ways:

-   **The victim can recover.** Allies retrieve the wreck, repair the components, rebuild. The investment isn't zeroed out — it's set back. Expensive and painful, but not starting from scratch.
-   **Salvagers move in.** A wreck is a salvage opportunity. Experienced components are the most valuable items in the game. Someone will come for them.
-   **The attacker gains nothing extra.** Destruction doesn't drop loot beyond what interdiction already took. The cargo was transferred during the shield drain. What's left in the wreck is damaged components — useful to a salvager, worthless to the attacker who's already moving on.
-   **Post-battle salvage events.** A station siege leaves the system littered with wrecks from both sides. Salvagers converge. The winning side might not collect their own losses before scavengers pick through the debris. Major battles create economic events that draw players from across the region.

Ship destruction is a state change, not an erasure. The universe accumulates history. See `gameplay.md` for the full salvage economy.

### Bounties and Territory

The bounty system doesn't prevent destruction. It gates it behind infrastructure.

**The solo griefer** destroys a ship and gets exiled from the economy. No station will dock them, no market will serve them, no repair bay will touch their ship. Their career is over in a handful of kills. The bounty system works as intended.

**The faction predator** is different. A group with their own stations can sustain players with high bounties. Their stations dock them, repair their ships, fence their loot. The bounty is meaningless when you never need to visit a public station. The group absorbs the social cost because the predator serves a strategic purpose — territorial control, deterrence, power projection.

This creates the bison/wolf ecosystem naturally:

-   **Wolves need dens.** Destruction as a lifestyle requires territory. Building and defending that territory is expensive. The group pays for its predators through infrastructure investment.
-   **The bison know where the wolves live.** Faction territory is visible — their stations, their security policy, their reputation. Pilots learn which systems to avoid. "Don't jump through Kepler corridor, that's Razor territory." The danger is legible, not random.
-   **The wolves are still constrained.** They can only operate near their own territory for resupply. Ranging deep means a long trip home with a damaged ship. The further from the den, the more vulnerable the wolf.
-   **The bison are generally safe.** Most of space has no wolf packs. Most interactions are peaceful. But the possibility exists, and that background awareness is what makes space feel alive.

The result: organized PVP destruction happens in specific, known areas of space. It's a regional threat, not a universal one. A new player in hisec never encounters it. A miner in neutral frontier space rarely encounters it. A hauler who routes through wolf territory? That's a choice, and the game made the risk legible before they jumped.

### Recovery

A destroyer can work their bounty off, but it takes a long time:

-   Constructive actions (trading, hauling, defending against Others) slowly reduce the bounty
-   Weeks or months of real time to clear a serious bounty
-   Stations have long memories — access returns gradually, not all at once
-   The record never fully disappears — other players can always see that it happened

---

## Why Griefing Doesn't Pay

Every mechanic conspires to make player-on-player violence unprofitable.

### Combat Is Mutually Destructive

Attacking a ship damages YOUR components too. Shields absorb hits on both sides. Drives burn core life maneuvering. Sensors take wear from targeting. Every fight ages both ships.

You don't walk away clean. Even a "winning" interdiction leaves you worse off than before it started.

### The Math Doesn't Work

```
PIRACY (8 hour operation)
├── Travel to hunting grounds:   4 hours
├── PNP scanning (find target):  2 hours (if lucky)
├── Interdiction + shield drain: 1-2 hours
├── Cargo transfer:              limited by your hold
├── Travel to fence goods:       4 hours
├── Repair own damage:           2 hours + resources
├── Net haul:                    ~100 m³ of cargo
└── Profit:                      maybe 3000 credits after repairs

MINING (8 hours)
├── Travel to belt:              2 hours
├── Mine:                        6 hours
├── Net haul:                    full cargo of ore
├── Component wear:              generates buffs (drift)
├── Reputation:                  maintained
└── Profit:                      5000+ credits, no repair costs

PIRACY PROFIT:   ~250 credits/hour, reputation damage, component wear
MINING PROFIT:   ~625 credits/hour, buff generation, reputation maintained
```

Piracy is a lifestyle choice, not an optimization strategy.

### Cargo Hold Limits

A combat-oriented ship has small cargo capacity. You interdict a hauler carrying 300 m³ of ore and you can carry maybe 125 m³. The rest floats in space for a salvager who did no fighting.

### Time Is the Real Cost

Time spent hunting, fighting, and repairing is time not spent mining, trading, or exploring. The opportunity cost is the biggest deterrent — not rules, not restrictions, just math.

---

## When Combat Matters

### Vs. The Others

Fighting Others is necessary and rewarding. They compete for your resources, threaten your platforms, and carry alien components worth salvaging.

-   Defending your platforms protects your investment
-   Clearing Others from a sector restores resource access
-   Salvaging Other ships yields alien components (unique, valuable)
-   Community standing improves — stations reward Other kills
-   No reputation penalty

The same combat mechanics that make piracy costly make fighting Others rewarding. The mutual damage still applies — but the loot is alien tech you can't get any other way, and stations reward you for it.

### Platform Defense

Your mining platform is threatened — by another player or by Others. Combat to defend your investment is rational. The defender has the advantage: already in system, no travel cost, protecting something valuable. The attacker burned core life getting here.

### Station Siege

If ship-to-ship PVP is hard, taking down a station should be _much_ harder. A station is a permanent structure — someone spent weeks building it. Destroying one requires a coordinated group, sustained commitment, and enormous cost. A solo pirate can't even scratch a station. A small group can harass it. Only a serious fleet can threaten it.

**Sieges take time.** Days, not hours. A station has shields, hull, and infrastructure that dwarf anything a ship carries. The attackers have to maintain pressure across multiple real-time sessions. They can't just show up, blow it up, and leave. It's a campaign.

**Attackers are exposed.** A siege fleet is the loudest thing in the game. Multiple ships running weapons, PNP scanning for defenders, holding position for days. Every ship in the region knows something is happening. The attackers can't hide — they're broadcasting their presence continuously. This makes them vulnerable to third-party intervention, bounty hunters, or allied reinforcements.

**The defender has advantages.** They're already there. They have the station's defenses. They have resupply. They can call for help. The attackers burned core life getting there, are operating far from their own resupply, and every hour on station is component wear they can't easily repair.

**Sieges change ownership, not existence.** The typical outcome of a successful siege isn't a pile of rubble — it's a change of hands. Stations are too valuable to destroy. Someone spent weeks building it, and the attackers want to _use_ it, not delete it. A successful siege forces a transfer of ownership. The old owner loses their station. The new owner inherits the infrastructure, the docking fees, the market, the security policy decisions.

Actual destruction of a station would require sustained effort well beyond what it takes to seize control — and for what? You'd be destroying the very thing that makes the system valuable. It's possible, but it's almost never the goal. A group that destroys a station instead of taking it is making a statement so expensive that the entire server notices.

**The cost question.** Why siege a station? To control territory, claim a rival's infrastructure, or force a political outcome. Never for profit — the resources burned in a siege exceed the short-term value of the station. Sieges are strategic investments. The payoff is owning the system long-term, not looting and leaving.

### Wreck Disputes

Two salvagers find the same wreck. Both want the rare component inside. Combat is technically an option — but the fight damages both ships, and the interdiction model means the winner gets the salvage, not a kill.

More likely outcome: negotiation. "You take the scanner, I take the drive." The mechanics push toward cooperation even in competitive moments.

---

## Security Zones

Not all space is equal. Security scales with proximity to civilization.

### High-Security (Core Systems)

The core ~10 systems have active station security. In hisec, even **running a PNP scan** is treated as hostile intent. Security detects it and responds.

-   PNP scan detected → security flags the ship immediately
-   Continued scanning → security engages (interdiction, impound)
-   Actual attack → overwhelming response, ship seized
-   New players are safe in the core — not just from combat, but from being hunted at all

You can't even _look_ for targets in hisec without drawing security. The wolf has to leave civilized space to hunt.

### Low-Security (Player Stations)

Lowsec systems have player-owned stations. There's no NPC security — the station owner sets the policy. This is a political decision with no right answer.

**Counter PVP.** The station actively responds to interdictions in its system. PNP scanning is flagged. Aggressors are engaged. This attracts traders and miners — good for the station's economy, more docking fees, a thriving market. But it also puts a target on the station's back. Pirates see an active counter-PVP station as a threat to their operations. Enough pirates, and that station gets sieged.

**Allow PVP.** The station doesn't intervene. Scan all you want, interdict whoever you find — the station stays out of it. This keeps the station off pirate hit lists. No reason to siege a station that doesn't interfere with your business. But peaceful players avoid the system. Why mine here when the station won't protect you? The market thins, docking fees drop, the system empties out.

**Tax PVP.** The middle ground. The station doesn't counter piracy — it takes a cut. "Hunt here, but we get a percentage of whatever you loot." The station profits from piracy without being a target. Pirates tolerate it because it's cheaper than a siege. But word gets around. Miners know this station profits from their losses. They trade somewhere else. The station's reputation becomes... complicated.

**Selective enforcement.** The station owner picks favorites. Allies are protected, strangers aren't. Docking privileges are conditional. This creates a faction dynamic — the station becomes a base of operations for a group, hostile territory for outsiders. Powerful but politically expensive.

Every choice shapes who shows up in the system. A station's security policy is its most important economic decision. And it can change — a station that allowed PVP might start countering it when the owner gets tired of empty docks. A station that countered PVP might go neutral after surviving a siege and not wanting another one.

### Null-Security (Deep Frontier)

No stations. No security. No witnesses. No reputation consequences beyond the Origin's global bounty system. PNP scanning is free and unmonitored.

This is where pirates operate. It's also where the best resources are. Risk and reward scale together. The pilot who pushes into null-sec for rare deposits accepts that they're in wolf territory.

### The Gradient

The security model pushes predators outward. You can't hunt in hisec. You can hunt in lowsec but it's logged and punished. Nullsec is open season — but it's far from stations, far from markets, and far from resupply. The wolf has to range deep to operate freely, and ranging deep costs core life and time.

---

## Combat Stats

Derived entirely from existing components and their wear:

**Offensive:**

-   Weapons: equipment slot (if installed)
-   Targeting: sensor accuracy (worn sensors with drift = better targeting)
-   Power: core output (affects weapon cycling)
-   Maneuver: drive speed (evasion, pursuit)

**Defensive:**

-   Shields: capacity + regen + harmonic state (see `docs/plans/envelopes.md`)
-   Hull: integrity (base + repair module)
-   Evasion: drive speed + sensor awareness
-   Escape: drive range + current power (can you spool and jump out?)

No separate combat stats. Everything comes from the same components used for exploration, mining, and hauling. A scout with a DSC Mk I and DR-705 is actually decent in a fight — good targeting, high evasion — but has no dedicated weapons and light shields.

---

## The Predator's Life

Being a pirate IS a valid playstyle. It's just hard.

-   **Where to repair?** Reputation too low for most stations. Remote stations or premium prices.
-   **Where to sell?** Known pirates can't use normal markets. Player-to-player trades, black markets.
-   **How to sustain?** Every engagement damages your ship. Components degrade, repair resources are scarce.
-   **Where to hide?** Core systems have security. Frontier stations may refuse you. Deep space is lonely.
-   **Is it worth it?** Probably not financially. But some people want to be space pirates. And that's their choice.

The game doesn't forbid it. It just makes the math clear. A pirate is choosing a harder path because they want to, not because the game rewards it. Their existence creates content for everyone else — bounty hunting, cautionary tales, the background tension that makes space feel wild.

---

## Conflict Escalation Ladder

Most conflicts resolve without combat because the mechanics push toward alternatives:

```
1. AVOIDANCE       — Run dark, different routes, timing
2. DETERRENCE      — Heavy shields, defensive loadout, group presence
3. NEGOTIATION     — Split resources, trade, share intel
4. COMPETITION     — Mine faster, deploy more platforms, out-produce
5. INTERDICTION    — Catch and loot (both ships survive)
6. DESTRUCTION     — Taboo. Bounty. Social exile.

Each step up costs more and gains less.
Most interactions never get past step 4.
Step 5 is rare because finding players is hard.
Step 6 is rarer because the cost is enormous.
```

---

## Stealth Is Emergent

There is no stealth toggle. No cloak equipment. No visibility flag. A ship's detectability is the sum of its emissions, and emissions come from what the ship is doing.

**A ship doing nothing emits nothing.** No shields, no active equipment, no actions in progress — the ship is electromagnetically invisible. Passive scanning (listening) produces zero emissions. An idle ship cannot be found by any sensor at any range.

This is the foundation of the async safety model: a player who logs off is safe because their ship is dark. It also creates the ambush predator archetype — a Spectre sitting dark in a system is invisible until it chooses to act.

Each system a ship powers up adds to its emission profile:

| Step                      | What happens         | Emission    | Detectable?                              |
| ------------------------- | -------------------- | ----------- | ---------------------------------------- |
| Idle / passive scan       | Listening only       | 0           | No                                       |
| Engage shields            | Shield power-up ramp | 0.2 (faint) | Barely — DSC with long integration might |
| Arm weapons / active scan | Targeting lock       | 5.0+ (loud) | Yes — this is the commitment point       |
| Fire                      | Weapons discharge    | 6.0         | Very                                     |

The reveal is gradual and player-driven. Each step up the ladder trades stealth for capability. The ambush predator must sacrifice information asymmetry to engage.

---

## Actions vs State

Ship behavior falls into two categories, distinguished by whether it occupies the action slot.

### Actions (async, one-at-a-time)

Actions block the ship's action slot. A ship can only perform one at a time. They go through the handler lifecycle: validate, handle, defer, resolve. They produce results the player sees.

-   **jump** — multi-phase travel (spool / cooldown), emits drive envelopes
-   **scan_route** — discover navigation routes, emits pnp_scan
-   **passive_scan** — listen for emissions over integration period, emits nothing
-   **pvp_scan** — targeting lock on a detected contact, emits loudly
-   **fire_phaser / fire_torpedo** — combat, emits weapons_fire
-   **Mining / Salvaging** — resource extraction, emits faintly

### State (timestamp-based, runs in parallel)

State transitions are instant mutations that start a timestamp clock. Formulas compute current values on demand. These do NOT occupy the action slot — a ship can engage shields while running a passive scan.

-   **Shield engagement** — `shields_engaged_at`, power-up curve formula gives current strength
-   **Shield regen** — `shields_full_at`, regen rate fills shields after damage
-   **Weapon arming** — `weapons_armed_at`, readiness ramp
-   **ECM activation** — `ecm_activated_at`, warm-up period
-   **Power regen** — `power_full_at`, capacitor refill

The pattern is always: `current_value = formula(now - timestamp, max, rate)`.

This distinction matters for engagement: the Spectre can toggle shields and arm weapons (state, parallel, instant) while its action slot is occupied by a passive scan (action, blocking). The moment it switches from passive scan to targeting lock, it loses listening capability AND starts emitting loudly.

---

## The Engagement Chain

Detection feeds targeting. Targeting gates firing. Firing creates impact events on the target. Each step is connected through confidence values and action relationships.

```
passive_scan → detection result (confidence 0.0–1.0)
    → confidence >= lock_threshold?
        → fire action (multi-phase):
            phase 1: targeting lock (uses detection confidence + weapon system + pilot skill)
            phase 2: lock acquired → fire
            phase 3: engagement result → child action on target ship
```

### Sensor Role Ends at Detection

The sensor determines detection quality — how well you see things, how early, what confidence. Once a detection exceeds the lock threshold, the sensor's job is done.

**Targeting lock speed comes from the weapon system and pilot skill, not the sensor.** A DSC and ACU that both produce a 0.7 confidence detection feed into the same lock mechanics. The sensor choice is purely about detection quality:

-   **DSC:** Better passive ears. Sees faint continuous emissions earlier. The scout sensor, the miner's early warning.
-   **ACU:** Better pulse matching. Catches transient events (drive spools, scan sweeps). The combat awareness sensor.

### Parent-Child Actions

When an attacker's action produces an effect on a target, the system creates a child action on the target's ship. The parent-child link exists for system analysis; it is never exposed to the other player.

-   `actor = self` — you initiated this (scan, jump, fire)
-   `actor = <ship_id>` — another player caused this (damage, interdiction)
-   `actor = system` — the game caused this (environmental, tick event)

The target's client sees their own action records — some self-initiated, some caused by others. Whether they know _who_ caused it depends on their passive scan detection tier, not the action record.

For gameplay, a ship only needs its current action and its parent. Full chain walking is an analysis concern, never a runtime query.

---

## Scenario Walkthroughs

Detailed mechanical walkthroughs of engagement scenarios live in `docs/dev/scenarios/`:

-   `spectre-vs-striker.md` — Ambush predator vs combat patrol. Covers solo and pair tactics, timing windows, detection chains.

---

## Summary

1. **Finding players is the hard part.** Detection depends on active scanning, which is detectable. Idle ships are invisible. Space is huge.
2. **Stealth is emergent.** No cloak needed. Doing nothing = invisible. Each system powered up adds emissions.
3. **Actions occupy the slot, state runs in parallel.** Shield engagement and weapon arming are timestamp-based. Scanning and firing are actions.
4. **Detection confidence gates targeting.** Passive scan produces confidence. Lock speed comes from weapons and pilot skill, not the sensor.
5. **Parent-child actions link attacker and target.** Same table, same lifecycle. The relationship is for analysis, not client exposure.
6. **Interdiction is the default.** Wolves catch prey, drain shields, take cargo. Both ships survive.
7. **Destruction is deliberate and taboo.** Triggers escalating bounties, station exile, and creates bounty hunters.
8. **PvE (Others) is the primary combat.** Necessary, rewarding, socially valued.
9. **Combat is mutual.** Both sides take damage. No clean wins.
10. **The math favors building.** Piracy is a lifestyle, not an optimization.
11. **Automation helps both sides.** Flee scripts and hunt scripts — the asymmetry is in event frequency, not code.
12. **Security zones protect new players.** The core is safe, the frontier is your choice.
