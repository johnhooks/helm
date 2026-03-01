# Weapon Systems

## Design Philosophy

Combat in Helm is an issued action, like scanning or jumping. There is no grid, no positioning, no transversal velocity, no manual piloting. "Attack that ship" resolves over hours, not seconds. The player commits to an engagement and checks back for results.

This means weapon design is about **resource tradeoffs and detection risk**, not twitch mechanics. The two questions that matter:

1. What does firing cost you? (power, ammo, stealth)
2. What can the target do about it? (detect, evade, outlast)

Weapons are equipment — they slot into standard equipment slots on any hull. There are no dedicated weapon mounts until the heavy combat hull (Mk II generation). The constraint that limits weapon use is the power budget, not the slot system.

## Phasers

Directed energy weapon. Sustained shield drain over time.

### Mechanics

- **Draw**: 0.35 per phaser array (constant while firing)
- **Damage**: Continuous shield drain, low per-tick but relentless
- **Ammo**: None — draws power only
- **Lock**: Requires maintained sensor lock on target
- **Footprint**: 15 m³
- **Emission**: `continuous` spectral type, high base power (~5.0)

### Power Interaction

Phaser draw adds to total component draw and reduces `perfRatio` while firing:

```
perfRatio = min(1.0, coreOutput / totalDraw)

Example — Pioneer with Epoch-S core (output 1.0):
  Base draw (drive + shield + sensor):  ~0.65
  + 1 phaser firing:                    +0.35
  Total draw:                           1.00
  perfRatio:                            1.0  (barely viable)

  + 2 phasers firing:                   +0.70
  Total draw:                           1.35
  perfRatio:                            0.74 (everything suffers)

Example — Striker hull (0.6× weapon draw) with Epoch-R (output 1.1):
  Base draw:                            ~0.65
  + 2 phasers firing:                   +0.42 (0.70 × 0.6)
  Total draw:                           1.07
  perfRatio:                            1.0  (functional warship)
```

The Striker's weapon draw multiplier (0.6×) is what makes dual-phaser loadouts practical. On any other hull, two phasers devastate the power budget. On a Striker, it's the intended loadout.

### Detection Profile

Phasers produce a `continuous` EM emission while active. This is easy to detect and track:

- DSC sensors (continuous specialists) build confidence quickly on a firing phaser boat
- The emission persists for the entire engagement — hours of sustained signal
- A phaser boat in combat is the loudest thing in the system
- There is no way to fire phasers stealthily

This is the fundamental phaser tradeoff: unlimited ammo and sustained damage, but you're lit up the entire time.

### Time to Effect

Phasers deal damage **immediately on sensor lock**. There is no travel time, no delay — the moment lock is established, shields start draining. This makes phasers the fastest weapon to effect. The only delay is the time to establish lock itself (minutes to hours depending on sensor quality, target signature, and range).

This is the phaser's key advantage over torpedoes: no window for the target to react between "weapon fired" and "damage applied."

### Counters

- **Break sensor lock**: Jump out, activate ECM, or Veil Array. Damage stops immediately. Re-establishing lock takes time.
- **Outlast**: If your shield regen exceeds the phaser's drain rate, the attacker is wasting power. Heavy shields (Aegis Eta) with high capacity can outlast a single phaser easily.
- **Return fire**: Phasers make the attacker easy to find. Counter-attack while they're locked in.
- **Point Defense System** (equipment): No effect on phasers — they're energy weapons, nothing to intercept.

## Torpedoes

Physical munition. Fire-and-forget burst damage.

### Mechanics

- **Draw**: Power spike on launch only (single firing cycle), then recovery
- **Damage**: Massive burst alpha — highest single-hit damage in the game
- **Ammo**: Physical torpedoes, 4–6 per launcher. Each torpedo consumes cargo space. Resupply at stations.
- **Lock**: Requires sensor lock at time of firing. Torpedo is autonomous after launch.
- **Travel time**: Minutes to reach target. Target may evade.
- **Hit probability**: Based on range, target drive state, and sensor accuracy. Component experience on sensors improves targeting.
- **Footprint**: 25 m³ per launcher, plus cargo space for ammo
- **Emission**: Brief `pulse` at launch, then silent. The torpedo itself is a cold, unpowered projectile.

### Power Interaction

Torpedoes draw power only during the firing cycle — a spike, not a constant drain:

```
Firing cycle:
  1. Power spike (brief, high draw)
  2. Torpedo away
  3. Power recovers immediately
  4. perfRatio returns to baseline

Between shots: zero weapon draw
```

This means a torpedo boat's perfRatio is only degraded during the firing moment. The rest of the time, the ship runs clean. This is the opposite of phasers, where the power cost is continuous.

### Detection Profile

Torpedoes are the covert weapon:

- **Launch pulse**: A brief `pulse` emission spike at the moment of firing. Short-lived and easy to miss.
- **Torpedo in flight**: Cold, unpowered, no emission. Effectively invisible to passive sensors.
- **Post-launch**: The firing ship goes quiet immediately. No sustained emission to track.

A good torpedo boat fires from the dark. The target's first warning may be the impact. If a sensor does catch the launch pulse, it's a single data point — not enough for a confident detection track unless the observer has a specialized pulse sensor (ACU) with good integration time.

This makes torpedoes the natural weapon for scouts and ambush builds. Fire, go silent, reposition.

### Time to Effect

Torpedoes have a **travel time delay** between launch and impact — minutes, not hours, but enough to matter. This window is the fundamental balancing factor against their massive alpha damage:

```
Launch → Travel (minutes) → Impact
         ↑
         This window is where countermeasures work
```

During the travel window, the target can:
- Detect the incoming torpedo (if they have good sensors)
- Activate countermeasures (Point Defense System, ECM)
- Spool drive and jump out (if they react fast enough)
- Do nothing (if they never detected the launch)

The travel time scales with range — point-blank torpedoes arrive faster, long-range torpedoes give more reaction time. This creates a range vs. stealth tradeoff: fire from close for a guaranteed hit but risk detection, or fire from far to stay hidden but give the target time to react.

### Counters

- **Detect the launch**: ACU sensors (pulse specialists) are the best early warning system. If you catch the launch pulse, you know someone fired. But a brief pulse in a noisy system may not give you enough confidence to identify or locate the attacker.
- **Evade**: If you detect an incoming torpedo (or suspect one), spool your drive and jump. The torpedo has travel time — minutes of window to escape. A ship already in drive spool is harder to hit.
- **Point Defense System** (equipment): Automated close-range interception. Doesn't guarantee a kill — effectiveness depends on the PDS quality and the torpedo's approach vector. A PDS gives you a percentage chance to destroy the torpedo before impact. Consumes power while active. This is the hard counter to torpedoes and useless against phasers.
- **ECM** (equipment): Electronic countermeasures can confuse torpedo guidance during the travel phase, reducing hit probability. Also degrades the attacker's sensor lock if they're running phasers.
- **Survive the hit**: Heavy shields can absorb torpedo damage. An Aegis Eta at full capacity may survive a single hit. But the alpha is designed to be devastating — most shields won't tank it cleanly.

## Weapon Experience

Weapons follow the same paired buff/nerf experience curve as all components.

### Phaser Array

```
Buff: drain efficiency   +0% → +15% → +25% → +30%
Nerf: power draw         1.0× → 1.1× → 1.3× → 1.5×
At 10,000 uses: devastating drain rate, but power hungry
```

A veteran phaser drains shields faster but costs more power. The Striker's hull bonus partially offsets the draw increase, which is why experienced phaser boats are so dangerous on a Striker — the hull absorbs the nerf.

### Torpedo Launcher

```
Buff: hit probability    +0% → +10% → +20% → +25%
Nerf: reload time        1.0× → 1.1× → 1.2× → 1.3×
At 10,000 uses: almost never misses, but slow to reload
```

A veteran torpedo launcher rarely wastes a shot but takes longer between firings. Since ammo is limited, accuracy matters more than fire rate — the buff is worth more than the nerf costs.

## Countermeasure Equipment

Defensive equipment that occupies standard equipment slots. Like weapons, these compete for the limited slot budget — every countermeasure installed is a mining laser or cargo expander you don't have.

### Point Defense System (PDS)

Automated close-range interception of physical munitions.

- **Effective against**: Torpedoes (percentage chance to destroy before impact)
- **Useless against**: Phasers (energy weapons, nothing to intercept)
- **Draw**: Low constant draw while active (~0.1)
- **Footprint**: 10 m³
- **Mechanic**: When a torpedo enters terminal approach, PDS rolls interception. Higher-quality PDS = higher intercept chance. Multiple PDS stack diminishingly.

The PDS is the hard counter to torpedo boats. A hauler running a PDS in one equipment slot turns a torpedo ambush from "guaranteed kill" into "maybe." This forces torpedo boats to either fire multiple torpedoes (burning through limited ammo) or accept that some targets are too well-defended.

### ECM (Electronic Countermeasures)

Broadband signal jamming that degrades enemy sensor effectiveness.

- **Effective against**: Both weapons (degrades targeting lock quality)
- **Against phasers**: Reduces drain efficiency by degrading lock precision
- **Against torpedoes**: Confuses guidance during travel phase, reducing hit probability
- **Draw**: Moderate constant draw while active (~0.2)
- **Footprint**: 15 m³
- **Emission**: `ecm` spectral type — ECM is itself detectable. Running ECM announces "I know you're here."

ECM is the generalist defensive option. Less effective than PDS against torpedoes, but it also works against phasers. The tradeoff: ECM draws more power and makes you detectable (your own EM emission increases while jamming).

### Defensive Loadout Tradeoffs

A ship has limited equipment slots. Every defensive slot is an offensive or economic slot you don't have:

| Loadout | Offense | Defense | Economy |
|---------|---------|---------|---------|
| 2× Phaser | Maximum | None | None |
| 1× Phaser + PDS | Moderate | Anti-torpedo | None |
| 1× Phaser + ECM | Moderate | General defense | None |
| 1× Torpedo + PDS | Ambush | Anti-torpedo | None |
| 1× Mining Laser + PDS | None | Anti-torpedo | Mining |
| PDS + ECM + Mining Laser | None | Maximum | Mining |

The Striker with 2 equipment slots faces this choice starkly: 2 phasers (all offense, no defense), or 1 phaser + countermeasure (balanced but less lethal). A Pioneer with 3 equipment slots has more flexibility but worse power economics for weapons.

## Combat Flow

A combat engagement follows this pattern:

```
PHASER ATTACK                     TARGET
────────────                      ──────
1. Detect target                  (unaware)
2. Jump to system
3. Establish sensor lock          1. Detect attacker's emission (passive)
4. Phasers fire — INSTANT EFFECT     OR detect active scan ping
   └── Shield drain begins        2. Shields draining — respond NOW
5. Sustained engagement              ├── Return fire?
   ├── Shield drain vs regen         ├── ECM to degrade lock?
   └── Power budget pressure         ├── Spool drive to escape?
6. Shields fail OR target escapes    └── Call for help?

TORPEDO ATTACK                    TARGET
──────────────                    ──────
1. Detect target                  (unaware)
2. Position at range
3. Establish sensor lock
4. Fire torpedoes                 1. Maybe detect launch pulse
   └── Brief pulse, then silent      └── ACU sensor catches it? Maybe not.
5. Torpedoes in flight (minutes)  2. REACTION WINDOW
   └── Attacker can go dark          ├── PDS activates (if installed)
                                     ├── ECM confuses guidance
                                     ├── Spool drive to jump out
                                     └── Or: unaware, no reaction
6. Impact                         3. Torpedo hits (or misses/intercepted)
   └── Massive burst damage          └── Shields cracked or down
7. Fire again? (if ammo remains)
   └── Or disengage while dark
```

Key timing:
- Establishing sensor lock: minutes to hours (depends on sensor, target signature, range)
- **Phaser time-to-effect: instant on lock** (damage begins immediately)
- Phaser engagement duration: hours (sustained drain vs shield capacity + regen)
- **Torpedo time-to-effect: minutes** (travel time after launch)
- Torpedo reaction window: the travel time IS the counter window
- Drive spool to escape: 2–4 minutes (depends on drive class)

The defender always has a window. Combat is never instant. The attacker's advantage is initiative — they chose when and where. The defender's advantage is that escape is always possible if they detect the threat early enough.

## Hull Interaction Summary

| Hull | Weapon Viability | Why |
|------|-----------------|-----|
| Pioneer | 1 weapon, strained | 0.35 draw is manageable but tight with 3 equipment slots competing |
| Scout | 1 weapon, awkward | Only 2 equipment slots, low integrity means you die fast in a fight |
| Surveyor | 1 weapon, suboptimal | 3 slots but the hull is built for scanning, not fighting |
| Striker | 2 phasers, intended | 0.6× weapon draw makes dual phasers viable; the glass cannon |
| Specter | Torpedo + Veil, intended | 0.5× stealth draw makes Veil + torpedo viable; the submarine |
| Heavy Combat (future) | 2-3 weapons, dedicated | Weapon mounts don't consume equipment slots; dual shields survive return fire |

### The Striker vs. Specter Split

Two combat hulls, two philosophies. They share a role (combat) but nothing else:

| | Striker | Specter |
|---|---|---|
| Identity | Destroyer | Submarine |
| Weapon | Phasers (sustained drain) | Torpedoes (burst alpha) |
| Stealth | Loud (1.3× signature) | Silent (0.5× signature + Veil Array) |
| Engagement | Visible pursuit | Invisible ambush |
| Duration | Hours of sustained fire | Seconds of impact, then gone |
| Counter | Break lock, outlast | Detect before launch, PDS |
| Weakness | Easy to find and counter-attack | If found, dies immediately (60 integrity) |
| Power trick | 0.6× weapon draw | 0.5× stealth systems draw |

A Striker and a Specter in the same system are terrifying: the Striker forces the target to deal with visible sustained pressure while the Specter lines up the kill shot from the dark. But they're also each other's natural counter — the Striker's loud emissions feed the Specter's sensors, and the Specter's torpedoes can ambush the Striker while it's locked in a phaser engagement.

### Veil Array

EM emission suppression field. The core stealth equipment.

- **Draw**: 0.40 (base) — crippling on most hulls
- **Specter hull**: 0.20 (0.40 × 0.5 stealth draw bonus)
- **Pioneer hull**: 0.40 — leaves almost no power for anything else
- **Effect**: Suppresses the ship's EM signature, reducing detectability across all spectral types
- **Footprint**: 20 m³
- **Incompatible with phasers**: Phasers produce continuous EM emission that defeats the Veil's suppression. Mechanically possible to equip both, but firing phasers while veiled negates the stealth. The game should warn but not prevent this combination.

The Veil Array is nearly unequipable on non-Specter hulls because the 0.40 draw competes directly with weapons, shields, and sensors. A Pioneer running a Veil has perfRatio problems before it even adds a weapon. The Scout could technically run one (low base draw components), but with only 2 equipment slots, a Veil + any weapon leaves no room for mining or utility — and the Scout doesn't have the stealth draw bonus, so it's paying full price.

The Specter's stealth draw bonus (0.5×) is what makes the Veil practical. At 0.20 draw, it fits comfortably alongside a torpedo launcher and leaves the ship with a functional power budget for jumping and scanning.

### The NPL Sensor — Built for the Hunt

Null Point Labs' crossover sensor is the natural complement to the Specter/torpedo playstyle. Where DSC, VRS, and ACU are built to find celestial bodies, the NPL sensor is built to find *ships*.

- **Passive affinity: 1.8** (best in game, far beyond DSC's ~1.4)
- **Active affinity: 0.3** (nearly useless — Null Point doesn't believe in broadcasting)
- **Exploration stats are terrible**: 3 ly range, 2.5× survey time, 0.4 accuracy
- **Ship detection is unmatched**: identifies drive class, weapon type, and shield state from passive data alone

The NPL sensor on a Specter creates the ultimate submarine: passively detect targets with extreme sensitivity, identify what they're running, position with the Veil Array active, fire torpedoes, and vanish. The target never gets an active scan ping to warn them.

The weakness is absolute: the NPL sensor is useless for exploration. A Specter running NPL sensors can hunt pilots but can't find planets, can't survey systems, can't do any of the economic activities that fund a ship. It's a pure combat loadout with zero economic utility. You need someone else to find the targets — you just kill them.
