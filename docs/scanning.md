# Scanning and Detection

How ships perceive the universe, detect each other, and fight for information dominance.

Scanning is the most important system in Helm. Every other mechanic — mining, combat, navigation, trade — depends on what you can see. The submarine warfare model (see `gameplay.md`) means ships are blind by default. Scanning is how they stop being blind. And every act of scanning changes the electromagnetic landscape of the system, affecting what everyone else can see.

## The Electromagnetic Environment

A star system isn't silent. It has a baseline noise floor from stellar radiation, planetary magnetospheres, asteroid collisions, and cosmic background. This noise floor varies by system (see `stellar-effects.md` — stellar effects modify baseline conditions).

Every ship action adds signal to this environment:

-   **Mining** produces extraction emissions (moderate)
-   **System scanning** produces sweep emissions (moderate)
-   **Jumping** produces drive spool/sustain/cooldown signatures (high during spool, moderate during sustain, tapering during cooldown)
-   **PNP scanning** produces active search pulses (very high)
-   **Salvaging** produces extraction emissions (moderate)
-   **Weapons fire** produces combat signatures (very high)
-   **Idle** produces nothing. The ship is indistinguishable from background noise.

The total electromagnetic activity in a system at any moment is the sum of all these sources plus the baseline. This is the environment every sensor operates within.

## Scan Types

### System Survey

Broad scan to discover what's in a system — planets, belts, stations, anomalies. See `system-scanning.md` for the full discovery mechanics (privacy, trading, first-surveyor credit). This is the exploration loop.

System surveys produce moderate emissions. A ship surveying a system is detectable, but the signal is weaker than active PNP scanning.

### Planet Scan

Detailed scan of a specific planet — resources, habitability, moons, anomalies. Requires a completed system survey first. See `system-scanning.md`.

Planet scans are focused and directional. Lower emission than a system survey because the sensor is pointed at a specific target, not broadcasting omnidirectionally.

### PNP Scan (Player-to-Player)

Active search for other ships in open space. The sensor broadcasts high-energy sweep pulses looking for ship signatures — drive emissions, shield harmonics, power plant output.

PNP scanning is the **loudest** thing a ship can do. Every sweep peak is a beacon that says "someone is looking for ships here." Any ship in the system running passive detection has a chance to pick up the PNP emission.

**PNP scans cannot find ships in asteroid belts.** A belt's natural electromagnetic noise — metallic reflections, thermal radiation, collision signatures — masks any ship operating within it. The PNP scan sees the belt as a noisy region, not as "belt + one ship." The miner's extraction emissions are indistinguishable from the belt itself.

To find a ship in a belt, the wolf needs a **belt scan** — a focused, targeted scan of a specific belt. This changes the hunting math:

-   A system with 4 belts means 4 possible hiding spots. The wolf has to pick one.
-   Each belt scan takes time and produces emissions. The miner might detect the wolf's scan and flee before the wolf finishes.
-   The miner might be in belt 3, but the wolf started with belt 1. By the time they scan belt 3, the miner has moved.
-   Or the miner isn't in any belt — they're at a waypoint, or already gone.

This makes hunting miners dramatically harder than hunting ships in open space. The wolf can't just sweep the system. They have to commit to specific locations, one at a time, each attempt burning time and producing detectable emissions. The belt is the miner's fortress.

See `docs/plans/envelopes.md` for sweep mechanics (cumulative probability, sweep peaks, effort scaling).

### Passive Detection

Not a scan the pilot initiates — it's always on. The ship's sensors continuously monitor the system's electromagnetic environment for anomalous signals. Passive detection picks up emissions from other ships' activities.

What passive detection can find:

-   PNP scan emissions (high chance — they're loud)
-   Drive spool signatures (moderate chance — distinctive pattern)
-   Weapons fire (high chance — very energetic)
-   Mining emissions (low chance — similar to natural background)
-   System scan emissions (low chance — moderate energy, common pattern)
-   Salvage emissions (low chance — similar to mining)

What passive detection cannot find:

-   Idle ships (no emissions)
-   Ships running passive detection only (no emissions)

Passive detection chance is affected by:

-   The target's emission strength (louder = easier to detect)
-   The system's noise floor (noisier = harder to distinguish signal from background)
-   The detecting ship's sensor quality and passive affinity
-   Stellar effects (ion storms increase noise, nebulae reduce detection range)
-   Signal processor addon (if equipped — see below)

### Passive Belt Scan

A PNP scan can't find ships in belts, but passive detection can — it just takes much longer. Mining operations produce steady, repetitive emissions that a patient sensor can eventually distinguish from the belt's natural noise. The belt camouflages the miner, but camouflage isn't invisibility.

Passive belt scanning isn't a separate action. It's passive detection applied to a specific belt. The pilot says "watch that belt" and the sensor integrates over time, slowly building a signal profile. Over hours, the repeating pattern of mining equipment becomes distinguishable from random belt noise.

How long this takes depends on the sensor:

-   **DSC** — naturally suited to passive belt scanning. Long integration time pulls weak signals out of noise. Can distinguish a miner from belt noise in hours.
-   **VRS** — moderate passive capability. Takes longer, but workable.
-   **ACU** — poor at passive scanning. Rapid sweep style doesn't integrate well. Could take much longer or simply fail against a dense belt's noise floor.

The wolf running a passive belt scan produces **no emissions**. They're just listening. The miner has no way to know they're being watched. This is the patient predator's tool — sit outside a belt for hours, listening, invisible, until the signal resolves.

But it's slow. And the wolf has to choose a belt — they can't passively monitor all belts simultaneously. If the system has 4 belts, they're gambling on which one the miner is in. And if the miner finishes and leaves before the signal resolves, the wolf spent hours watching an empty belt.

## Sensor Affinity and the Signal Processor

### Active vs Passive Affinity

Each sensor has a natural affinity — a balance between active scanning (emitting energy and reading the returns) and passive detection (listening for emissions from other sources).

| Sensor | Active Affinity | Passive Affinity | Character                                                   |
| ------ | --------------- | ---------------- | ----------------------------------------------------------- |
| ACU    | High            | Low              | Loud hunter. Finds targets fast, broadcasts its presence.   |
| VRS    | Moderate        | Moderate         | Balanced. Adequate at both, optimal at neither.             |
| DSC    | Low             | High             | Patient listener. Quiet operation, slow but deep detection. |

Active affinity affects: PNP scan effectiveness, system survey speed, belt scan speed (active mode).

Passive affinity affects: passive detection probability, passive belt scan integration time, ability to distinguish signals from noise.

### Signal Processor (Equipment Addon)

The signal processor is an equipment slot module that modifies a sensor's detection profile. It shifts the sensor's capabilities without replacing it.

**Why it exists.** The base sensors are designed for exploration — survey systems, scan planets, find resources. PVP detection is a secondary use. The signal processor is purpose-built for detection: amplifying the sensor's ability to find or avoid being found.

**What it does.** Each signal processor variant adjusts the sensor's active/passive balance:

-   **Correlator.** Boosts passive affinity. Better signal integration, faster passive belt scans, higher passive detection probability. Reduces active scan effectiveness slightly. The bounty hunter's tool.
-   **Amplifier.** Boosts active affinity. Louder, more effective PNP scans and active belt scans. Reduces passive sensitivity. The aggressive hunter's tool.
-   **Filter.** Reduces the ship's own emission signature across all actions. Doesn't improve scanning — improves hiding. The prey's tool. A miner with a filter is harder to find even outside a belt.

**Who equips it.** PVP players — hunters, bounty hunters, pirates, and the experienced frontier miners who've been ganked before and decided awareness is worth more than yield. The explorer surveying systems doesn't need it. The hauler on a trade route doesn't need it. The miner in hisec doesn't need it.

The signal processor in your equipment slot _is_ the tell. A ship carrying one has committed to a playstyle where detection matters. Their loadout says what they're here for before they do anything.

### Wreck Scan

Specialized scan for debris and wreckage. Wrecks are passive — they emit nothing. Finding them requires active scanning. But the scan itself is moderate emission, making the salvager detectable while they search.

## The Noise Floor

The system's electromagnetic noise floor is dynamic. It's the sum of:

**Baseline (constant).** Derived from stellar properties. An O-type star system is electromagnetically violent. A brown dwarf system is nearly silent. See `stellar-effects.md`.

**Random events.** Ion storms spike the noise floor system-wide. Solar flares create burst noise. These are temporary conditions that make detection harder for everyone.

**Activity (dynamic).** Every active ship adds to the noise floor. A system with 10 miners all running extraction equipment is noisier than a system with one idle ship. This has two effects:

1. **Harder to detect specific targets.** More noise means any individual signal is harder to distinguish. The PNP scanner trying to find one specific ship in a busy mining system has worse odds than in an empty system.

2. **Easier to hide in crowds.** A ship salvaging wreckage during a siege is hard to spot because the siege is producing enormous electromagnetic noise. The vulture's emissions get lost in the background.

This is why scavenging during a siege works — and why it stops working after the siege ends and the system goes quiet.

## Emission Profiles

Each action produces a characteristic emission pattern. The pattern matters because different sensors are better at detecting different patterns.

### Drive Emissions

The drive envelope (see `docs/plans/envelopes.md`) produces a distinctive three-phase signature:

-   **Spool:** Sharp spike. Highly detectable. A drive spooling up is an unmistakable signal — something is about to jump.
-   **Sustain:** Steady emission during transit. Detectable but less distinctive than the spool spike.
-   **Cooldown:** Tapering emission. A ship that just arrived is still electromagnetically "hot." This is why scanning during drive cooldown is degraded — the ship's own residual drive emissions interfere with its sensors.

Drive emissions matter for detection because:

-   A spool spike tells everyone "a ship is about to leave"
-   A cooldown signature tells everyone "a ship just arrived"
-   Both are involuntary — the pilot can't suppress them

### Scan Emissions

Each sweep peak is an emission event (see `docs/plans/envelopes.md`). The emission strength scales with scan type and effort:

| Scan Type     | Emission per Sweep | Effort Scaling                             |
| ------------- | ------------------ | ------------------------------------------ |
| System survey | Moderate           | More effort = more sweeps = more emissions |
| Planet scan   | Low                | Focused, directional                       |
| PNP scan      | Very high          | More effort = significantly louder         |

Sensor character affects emission pattern:

-   **ACU (rapid sweeps):** Frequent, short emission bursts. Easy to detect because of repetition.
-   **VRS (moderate sweeps):** Balanced emission cadence.
-   **DSC (long dwell):** Infrequent, longer emission events. Harder to distinguish from background because they're spaced further apart.

This means the DSC is the quietest hunter. Fewer emissions per hour, harder to detect. But slower to find anything.

### Combat Emissions

Weapons fire produces very high emissions — energy weapons, shield impacts, drive maneuvering. A combat engagement is visible to the entire system. This is why sieges are "the loudest thing in the game" — sustained weapons fire plus multiple drive signatures plus shield interactions create a massive electromagnetic event.

### Mining and Salvage Emissions

Moderate, steady emissions from extraction equipment. Similar to natural background — asteroid collisions, thermal radiation, metallic reflections all produce signatures that overlap with mining equipment output. A miner in an asteroid belt is naturally camouflaged by the belt itself.

This scales with belt density. A rich, active belt produces more natural noise than a depleted one. A miner in a dense belt is well concealed. A miner in a picked-over belt has less cover — the noise floor has thinned with the resources. So the safest place to mine is the busiest belt, which is also the one depleting fastest. Concealment and returns diminish together.

A miner outside a belt — refining ore, transferring cargo at a waypoint, sitting in open space — has no natural cover. The belt isn't just the resource. It's the terrain. Leaving it is exposure. This creates a reason to stay in the belt even when efficiency might argue for moving: the belt is where you're hardest to find.

## Electronic Warfare

Active disruption of the electromagnetic environment. This is the intentional counterpart to the natural noise floor.

### ECM (Electronic Countermeasures)

A ship or station can run ECM to degrade scanning in its vicinity:

-   **Noise generation.** Flood the local EM environment with false signals, raising the noise floor artificially. Every scan in the system becomes less effective — including the ECM operator's own scans.
-   **Signature spoofing.** Generate false ship signatures. PNP scans return ghost contacts that aren't real. The scanner wastes time investigating phantoms.
-   **Scan disruption.** Targeted interference with a specific ship's sensor sweeps. Degrades their detection probability per sweep without affecting other ships. Requires knowing the target is there.

### ECCM (Electronic Counter-Countermeasures)

Defensive measures against ECM:

-   **Signal filtering.** Better sensors can distinguish real signals from ECM noise. High-experience sensors with drift toward detection are better at filtering.
-   **Pattern recognition.** ECM noise has patterns that differ from natural noise. A skilled sensor (high usage, detection drift) can learn to ignore them. This is a concrete benefit of component drift — a veteran sensor has "seen" ECM before.
-   **Frequency hopping.** Change sweep parameters to avoid targeted disruption. Costs scan efficiency but resists targeted ECM.

### Station ECM

Stations can run ECM as part of their security policy. A station projecting ECM makes the entire system harder to scan, protecting ships docked or operating nearby. This is a defensive measure — it helps the station's residents by making them harder to find, but also makes it harder for residents to scan for threats.

### ECM as Equipment

ECM and ECCM would be equipment slot items — a ship choosing to carry ECM gives up another equipment option. A dedicated electronic warfare ship is a support role: no weapons, no extra cargo, just the ability to blind the enemy's sensors.

In a wolf pack, the ECM ship is the force multiplier. It degrades the prey's passive detection, making the pack's PNP scans less likely to trigger a flee response. In a station defense, the ECM ship disrupts the attackers' coordination.

## How the Engine Handles This

The scanning and detection model is a core responsibility of the engine layer (see `docs/plans/simulation-testing.md`). The engine computes the electromagnetic environment before any action resolves:

### Per-Tick Computation

```
1. Calculate baseline noise floor (stellar effects)
2. Add random event noise (ion storm, solar flare)
3. Add all active ship emissions in the system
   - Each ship's current action produces an emission value
   - ECM sources add artificial noise
4. Sum to total system noise
5. For each ship with passive detection:
   - For each emission source:
     - Signal strength vs noise floor → detection probability
     - Roll against probability
     - If detected: fire detection event
6. For each ship with active scan running:
   - Apply noise floor to scan effectiveness
   - Apply ECM degradation if targeted
   - Compute adjusted sweep chance
   - Continue normal sweep/checkpoint resolution
```

This computation happens at every checkpoint. The electromagnetic environment is recalculated because it changes — ships arrive, leave, start actions, stop actions. The environment at the start of a scan might be different from the environment at sweep 4.

### Interactions That Emerge

The engine doesn't need special-case logic for these scenarios. They emerge from the general computation:

**Siege cover for vultures.** During a siege, combat emissions + weapon fire + multiple drive signatures = massive noise floor. Vulture's salvage emissions / high noise floor = low detection probability. No special "siege stealth" mechanic — just math.

**Drive cooldown degrading scans.** Ship arrives, drive in cooldown. Ship's own cooldown emissions add to the noise its sensors have to filter. Scan effectiveness reduced not by a special rule but because the ship is contributing to its own noise floor.

**ECM protecting a mining operation.** Station runs ECM, raising the system noise floor by 40%. A wolf's PNP scan in the system has detection probability degraded by 40%. The miners are safer. But the miners also can't detect the wolf as easily — ECM is indiscriminate.

**Quick-scan spam detection.** A ship running rapid low-effort scans produces frequent emissions. Each scan individually is hard to detect, but the pattern — regular, repeating emission bursts — is distinctive. Passive detection accumulates evidence across multiple emissions. Ten quick scans might be individually quiet but collectively unmistakable.

**Wolf pack coordination problem.** Three wolves scanning simultaneously triple the emission load. A miner's passive detection probability against the pack is much higher than against a solo wolf. The pack finds targets faster but is much more likely to trigger flee automation. The math naturally produces the stealth-vs-power tradeoff.

## Sensor Specialization for Detection

Each sensor type has a different detection profile, adding to their existing exploration character:

**ACU (Acoustic Correlation Unit).** Best at detecting repetitive patterns — scan emissions, mining cycles, regular activity. The ACU's rapid sweep style is tuned for high-frequency signals. Good at finding active ships. Poor at finding subtle, infrequent signals.

**VRS (Variable Resonance Scanner).** Balanced detection across signal types. Not the best at anything, competent at everything. The generalist sensor for both exploration and detection.

**DSC (Deep Space Cartographer).** Best at detecting faint, infrequent signals against high noise. The DSC's long dwell time integrates signal over longer periods, pulling weak signals out of noise. Good at finding ships trying to be quiet. Poor at quickly identifying strong, obvious contacts (wastes its integration time on signals the ACU would catch instantly).

This means sensor choice affects PVP beyond just scan range:

-   The ACU is the aggressive hunter — finds active targets fast, but loud and obvious
-   The DSC is the patient hunter — finds hidden targets, quiet operation, but slow
-   The VRS is the balanced choice — adequate at both, optimal at neither

## What Scanning Reveals

Detection isn't binary. The quality of information depends on the detection method:

**Passive detection.** Minimal information. "Emission detected — possible ship activity." No identity, no location within the system, just awareness that something is there. Enough to trigger a flee script or raise alertness.

**PNP scan hit.** More information. Ship type (hull class), approximate loadout signature (combat-fitted vs cargo-fitted), activity state (mining, scanning, idle, jumping). Not identity — you know _what_ is there, not _who_.

**Sustained contact.** Multiple scan hits on the same target build a profile. After several sweep detections, you can identify the ship. Name, owner, possibly bounty status. This takes time and multiple successful sweeps — quick identification requires aggressive scanning, which means more emissions.

**Station records.** If you're in a system with a player station, the station may track ship arrivals and departures. Station intel is separate from scanning — it's information the station infrastructure provides. A station with good sensors might provide real-time system awareness to docked ships.

## Open Questions

-   **Emission values.** What are the actual numbers? Each action type needs an emission strength value, and the noise floor calculation needs to produce meaningful detection probabilities. Too easy and nobody is safe. Too hard and PVP is impossible.

-   **Passive detection frequency.** How often does the engine evaluate passive detection? Every checkpoint? A separate tick? Continuous (computed from timestamps like power)?

-   **ECM balance.** ECM that's too strong makes scanning useless. ECM that's too weak isn't worth the equipment slot. The balance needs simulation testing.

-   **Detection range within a system.** The current model treats a system as a single location. Should some emissions have "range" within the system abstraction? (e.g., mining on the far side of the system is harder to detect than mining near you.) This adds complexity but might be worth it for tactical depth.

-   **Information decay.** Once you detect a ship, how long is that information valid? Ships move, change activity, jump out. Stale contacts create false confidence. Some decay mechanism prevents "I scanned 2 hours ago so I know everything."

-   **Scan data as tradeable commodity.** System survey data is already tradeable. Should real-time detection data be tradeable? "I'll sell you the current ship contacts in this system." Creates an intelligence market.
