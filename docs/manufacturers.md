# Manufacturers

The companies and labs that build ship components. Each has a history, a philosophy, and a product line that reflects both.

## Why Manufacturers Matter

Components aren't generic. A drive made by a defense contractor feels different from one made by a startup. The manufacturer's identity shapes the product's personality — its strengths, its quirks, what it prioritizes and what it sacrifices.

Manufacturer identity also creates the foundation for crossover products — components made outside a company's core competency that carry unexpected properties from their home domain.

## The Founding Manufacturers

These are the companies whose Mk I products ship with every Pioneer frame. They defined the first generation of interstellar hardware.

### Epoch Labs (Cores)

*"Reliable power for unreliable space."*

Epoch Labs is the oldest name in warp core technology. They grew out of the CERN Subspace Research Division — the same lab where the first wormhole was accidentally opened. When the military wanted warp cores, they contracted the people who understood the physics. When the civilian market opened up, Epoch was the only company with a proven design.

Their philosophy is conservative engineering with well-understood tradeoffs. Every Epoch core ships with complete performance documentation — no hidden failure modes, no marketing optimism. The E/S/R variants aren't different products; they're the same core with different tuning. Epoch trusts the pilot to choose the tradeoff that matches their mission.

**Product line:**
- Epoch-E (Endurance): Cold, patient, long-lived
- Epoch-S (Standard): The baseline everyone benchmarks against
- Epoch-R (Rapid): Hot, fast, short-lived

**Design language:** Industrial. Function over form. Their cores look like they were designed by physicists who don't care what things look like (because they were).

**Personality:** The dependable choice. Boring, in the best way. When your core matters — and your core always matters — you want Epoch.

### DR-Series Propulsion (Drives)

*"Get there."*

DR-Series — officially "Deep Range Systems" but nobody calls them that — builds drives. Just drives. They've never made anything else, and they're loudly proud of this fact. Their marketing is aggressively blue-collar: "We make the thing that moves you. Buy a good one."

Founded by a collective of drive engineers who left a megacorp to build drives without the committee-designed compromises. Every DR drive is named by its power class — the number tells you everything. Higher number, more thrust, more stress.

**Product line:**
- DR-305 (Economy): Sips power, long range, patient
- DR-505 (Standard): Fleet standard for a reason
- DR-705 (Boost): Fast, hungry, lives in the moment

**Design language:** Utilitarian. Exposed thrust assemblies, visible fuel routing. They look like what they are.

**Personality:** No-nonsense engineers who think sensor manufacturers are overpaid and shield manufacturers are paranoid. Good at one thing.

### Deep Scan Dynamics / Versa Instruments / Acuity Systems (Sensors)

Three competing sensor manufacturers, each with a different philosophy:

**Deep Scan Dynamics (DSC)**
*"What's out there?"*

The frontier company. Founded by scouts who got tired of not seeing far enough. DSC arrays are enormous — antenna farms, signal processors, shielded receivers — because distance requires aperture. Their products are physically large, slow to process, but see further than anything else.

- DSC Mk I: 20 ly range, 2.0x survey time, 0.6 accuracy

**Versa Instruments (VRS)**
*"Everything. Adequately."*

The generalist. Versa builds sensors that don't embarrass themselves at anything. Their engineering philosophy is "good enough at both jobs is better than amazing at one." Pilots who can't decide between range and resolution buy Versa and don't regret it.

- VRS Mk I: 12 ly range, 1.0x survey time, 0.7 accuracy

**Acuity Systems (ACU)**
*"What's down there?"*

The detail company. Acuity builds sensors for people who want to know everything about what's in front of them, not what's far away. Their arrays are compact, fast-cycling, and produce survey data that other sensors can't match. Limited range, but within that range, nothing hides.

- ACU Mk I: 6 ly range, 0.5x survey time, 0.85 accuracy

**Personality as a group:** The sensor market is the most competitive vertical. DSC, VRS, and ACU genuinely dislike each other's marketing. This is good for pilots.

### Aegis Foundry (Shields)

*"Between you and the void."*

Aegis started as a military contractor building hull plating for naval vessels during the Internet Wars. When warp technology democratized and civilian ships needed protection, Aegis pivoted to energy shields — same defense philosophy, new medium. They think about protection in terms of layers, coverage, and recovery time.

**Product line:**
- Aegis Alpha: Small emitter, fast recovery. For pilots who expect to take hits often.
- Aegis Beta: Balanced coverage. The "you probably want this one" shield.
- Aegis Gamma: Heavy capacitor banks, massive absorption, slow to recharge. For pilots who expect to take one big hit.

**Design language:** Military heritage. Clean lines, redundant systems, overbuilt. Aegis products are heavier than they need to be because Aegis doesn't trust "just enough."

**Personality:** The defense contractor that remembers the Internet Wars. Slightly paranoid. Builds things to survive things that probably won't happen. Pilots love them when those things happen.

## Crossover Products

Manufacturers sometimes release products outside their core competency. This isn't a company "expanding into new markets" — it's engineers who understand one domain deeply applying that understanding to a different problem. The results are always weird, usually worse on paper, and occasionally brilliant in ways nobody expected.

### Why Companies Cross Over

- **Engineering curiosity** — "What if we applied our shield harmonics research to drive field geometry?"
- **Customer requests** — "Our Epoch cores would work better with a sensor that talks to the core directly."
- **Competitive pressure** — Showing breadth to attract contracts
- **Accidents** — Sometimes R&D produces something that doesn't fit the product line but clearly works

### What Crossover Products Look Like

A crossover product is objectively worse in its adopted category on standard metrics. An Aegis drive is a bad drive by every normal measurement — slower, less range, less efficient than a DR-series at the same mark. But it has some capability that *cannot exist* in a native product because it comes from the manufacturer's home domain.

The benefit has to be mechanical, not just numerical. Not "slightly better shields" but "shields regenerate during warp transit" — something that only makes sense because a shield company designed a drive and thought about the problem differently.

```
CROSSOVER EXAMPLES (conceptual, not final)

Aegis Drive
├── Speed: 0.6x (worse than DR-305)
├── Range: 6 ly (worse than DR-305)
├── Consumption: 1.2x
├── BUT: shields regenerate at 50% rate during jumps
└── "They built a drive that thinks it's a shield emitter."

Epoch Sensor
├── Range: 4 ly (worse than ACU)
├── Survey speed: 1.5x (worse than VRS)
├── Accuracy: 0.5 (worse than everything)
├── BUT: scans draw from core life instead of power
└── "Leave it to Epoch to make a sensor that eats your core."

DSC Shield
├── Capacity: 30 (worse than Alpha)
├── Regen: 8/hr (worse than Alpha)
├── BUT: passive sensor range +40% while shields are active
└── "They couldn't stop thinking about range."
```

### When Crossovers Appear

Crossover products don't appear at Mk I. The first generation is each manufacturer sticking to what they know. Crossovers start showing up at **Mk II**, when companies have had time to experiment. By **Mk III**, every major manufacturer has at least one crossover product, and some have become notorious for them.

This means the early game has clean, predictable choices. The mid-game introduces "what if?" components that reward experimentation. The late game has a rich ecosystem of standard and crossover parts that create builds nobody designed on purpose.

## Product Releases and the `released_at` Timeline

Products don't all exist from day one. Each product has a `released_at` timestamp that gates when it becomes available in-game. This serves several purposes:

- **Content cadence** — new products are game events. "Epoch just released their Mk II core line" is news worth logging in for.
- **Staggered meta** — the optimal loadout changes over time as new products drop.
- **Manufacturer storytelling** — a company releasing a crossover product is a lore event with in-game consequences.
- **Balance iteration** — new firmware versions (v2, v3) can be released to tune products without changing existing installed hardware.

The database tracks this with the `version` column (firmware) and a `released_at` timestamp. A product that hasn't been released yet doesn't appear in station inventories or manufacturing recipes.

## Future Manufacturers

The founding manufacturers aren't the only ones. As the game evolves:

- **Startup labs** — small companies with one weird product that does something nobody else thought of
- **Megacorp divisions** — the infrastructure sovereignty providers (hosting companies) start manufacturing ship components to vertically integrate
- **Salvage-derived** — engineers who reverse-engineer alien or ancient tech from deep-space derelicts and produce components with properties that don't follow normal physics
- **Player-founded** — endgame manufacturing, where veteran players establish their own brands with custom stat profiles

The manufacturer ecosystem grows with the game. New names appear. Old names release new marks. Crossover products get weirder. The market gets deeper.
