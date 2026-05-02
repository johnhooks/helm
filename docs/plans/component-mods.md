# Component Modifications

One-time permanent upgrades applied directly to a component. A mod doesn't sit next to your sensor — it's installed inside it, changing how the hardware operates. Once applied, the mod is part of that component's identity. Removing it destroys the mod.

## Design Principles

1. **Mods are not buffs.** Experience makes a component better at what it already does (paired with a nerf). Mods change _how_ the component works — they shift behavior, unlock capability, or alter tradeoffs. A correlator doesn't make your sensor "stronger." It changes what information your sensor extracts from the same signal.

2. **Mods are permanent and costly.** Applying a mod requires station time (hours, async), materials, and credits. The mod bonds to the component. Removing it destroys the mod — you can replace it with a different mod, but the old one is gone. This makes modding a real commitment, not a slot you swap freely.

3. **Mods travel with the component.** Sell the sensor, the correlator goes with it. Salvage a drive from a wreck, its emission filter is still installed. Mods add to the component's provenance and market value. A veteran DSC Mk I with a correlator and 10,000 uses is a genuinely rare artifact.

4. **Mods don't scale stats.** They don't increase damage, range, or capacity. They modify the component's interaction with other systems — the DSP pipeline, the power budget, the information tier system. They're lateral, not vertical.

5. **Mod slots are limited.** Each component has 1–2 mod slots depending on type and mark. You can't stack everything. Choosing which mod to install is a build decision that sticks.

## How Mods Differ from Experience

|              | Experience                                   | Mods                                                    |
| ------------ | -------------------------------------------- | ------------------------------------------------------- |
| Source       | Accumulated through use                      | Purchased/crafted, applied at station                   |
| Effect       | Paired buff + nerf (logarithmic)             | Behavioral shift (no paired nerf)                       |
| Nature       | Makes component better/worse at existing job | Changes how component interacts with other systems      |
| Permanence   | Permanent, grows over time                   | Permanent until replaced (replacement destroys old mod) |
| Reversible   | Never — usage only goes up                   | Replaceable, but old mod is destroyed                   |
| Stacking     | Scales with usage count                      | Fixed effect per mod, doesn't scale                     |
| On component | Always present from first use                | Explicitly installed, costs time and resources          |

## Mod Slots

| Component Type | Mk I Slots | Mk II Slots | Mk III Slots |
| -------------- | ---------- | ----------- | ------------ |
| Core           | 1          | 1           | 2            |
| Drive          | 1          | 1           | 2            |
| Sensor         | 1          | 2           | 2            |
| Shield         | 1          | 1           | 2            |
| Nav Computer   | 0          | 1           | 1            |

Higher marks gain mod slots because the hardware has more internal headroom for modifications. A Mk I sensor has one slot — choose carefully. A Mk III has two — you can specialize further.

## Sensor Mods

Sensors interact with the DSP pipeline. Sensor mods change how the pipeline processes information, not how strong the signal is.

### Correlator Module

Installs a signal template library that sharpens passive pattern matching. The sensor doesn't hear louder — it recognizes patterns faster.

-   **Effect:** Shifts information tier thresholds down by a fixed amount (e.g., 0.05–0.08 depending on correlator quality). At the same confidence level, a correlated sensor extracts more information than a stock one.
-   **DSP interaction:** Feeds into `adjustedThresholds(base, equipmentBonus)` — the `equipmentBonus` parameter.
-   **Practical impact:** The difference between "anomaly detected" and "class identified" at 35% confidence. You don't detect more — you understand more from what you detect.
-   **Crafting cost:** Rare signal processing components + station installation time (4–8 hours).

### Matched Filter Tuner

Recalibrates the sensor's spectral filters for a specific emission type. Trades generalist capability for specialist precision.

-   **Effect:** Increases matched filter gain for one spectral type (pulse, continuous, or sweep) by 0.15–0.20. Decreases gain for the other two types by 0.05–0.10.
-   **DSP interaction:** Modifies the sensor's `pulseGain` / `continuousGain` values directly.
-   **Practical impact:** A VRS with a pulse tuner becomes better at catching drive spools and torpedo launches than stock, approaching ACU-level pulse detection — but worse at tracking miners and shield cycling. You're choosing a hunting specialty.
-   **Design note:** This interacts with DSP identity floors. A DSC sensor with a continuous tuner can't exceed the DSC's uncapped continuous gain (no floor), but an ACU with a continuous tuner is still limited by ACU's continuous gain floor (0.85). Floors apply after mods.

### Noise Reduction Filter

Installs a hardware filter that suppresses the ship's own EM emission from the sensor's noise floor. Your own drive and weapons blind your sensors less.

-   **Effect:** Reduces `selfInterferenceMod` — your own emissions contribute less to your perceived noise floor.
-   **DSP interaction:** The `selfInterferenceMod` parameter in noise floor calculation.
-   **Practical impact:** A Striker firing dual phasers has massive self-emission. Without a filter, their own sensor is partially blinded by their own weapons. With a filter, the sensor can still track targets while firing. Essential for phaser boats that need to maintain lock during combat.
-   **Particularly valuable on:** Striker (phaser self-noise), Surveyor running active scans while mining (mining emission blinds sensor).

## Drive Mods

Drives interact with the DSP pipeline through their emission envelope. Drive mods change the shape of the envelope, not the drive's base stats.

### Emission Dampener

Installs thermal shielding and EM baffling around the drive's thrust assembly. Reduces the drive's peak emission power across all phases.

-   **Effect:** Reduces the drive envelope's peak power values by 15–25%. Spool, sustain, and cooldown all emit less.
-   **DSP interaction:** Directly modifies the `DriveEnvelope` phase peak powers.
-   **Practical impact:** A DR-705 with a dampener is still the loudest drive, but its spool peak drops from 2.5 to ~1.9. On a Specter, this is the difference between "detectable during spool if someone is listening" and "barely detectable." On a civilian hauler, it means less noise added to busy systems.
-   **Tradeoff:** None mechanical — but the mod slot is occupied. You can't also install a spool optimizer.

### Spool Optimizer

Reshapes the drive's spool curve to front-load power delivery. Faster effective spool at the cost of a louder initial burst.

-   **Effect:** Changes the spool phase `curve` exponent — shifts from back-loaded (curve > 1) toward front-loaded (curve < 1). Drive reaches effective thrust faster.
-   **DSP interaction:** Modifies `DriveEnvelope.spool.curve`.
-   **Practical impact:** The DR-305's gentle civilian spool becomes more aggressive — useful for escape situations where seconds of spool time matter. But the front-loaded curve means a louder initial burst, which is easier for pulse sensors to catch.
-   **Tradeoff inherent:** Faster spool = louder initial signature. The mod doesn't add a nerf — the physics of the envelope shape IS the tradeoff.

## Shield Mods

Shields don't interact with DSP directly, but they interact with the power budget and the combat system.

### Harmonic Stabilizer

Tunes the shield emitter harmonics to reduce interference with other shipboard systems.

-   **Effect:** Reduces the shield's power draw by 10–15% without affecting capacity or regen rate.
-   **Practical impact:** On a power-starved ship (Striker running dual phasers, Surveyor with full sensor suite), the draw reduction frees up perfRatio headroom. Small but meaningful.
-   **Why this isn't a buff:** It doesn't make the shield stronger. It makes it play nicer with other systems. The shield itself is unchanged — same capacity, same regen, same protection.

### Rapid Cycle Capacitor

Replaces the standard capacitor bank with a fast-discharge variant. Shields recover faster from hits but the total energy stored is reduced.

-   **Effect:** Increases regen rate by 15–20%. Decreases capacity by 10–15%.
-   **Practical impact:** Turns any shield toward the Alpha's "fast regen, low capacity" profile. On an Aegis Eta (200 cap, 5/hr regen), this mod creates a 170 cap / 6/hr regen variant — still high capacity but no longer glacially slow to recover. Against sustained phaser fire, the faster regen offsets more drain per hour.
-   **Tradeoff inherent:** More regen, less capacity. The mod reshapes the shield's character rather than improving it.

## Core Mods

Cores are the most sensitive components — mods here have the highest impact and the highest risk.

### Thermal Regulator

Installs active cooling that reduces heat-related capacity degradation.

-   **Effect:** Reduces the core consumption rate (`mult_b`) by 5–10%. Each jump costs slightly less core life.
-   **Practical impact:** On an Epoch-R (500 ly life, 1.5× consumption), this extends effective lifespan by 25–50 ly. Not transformative, but meaningful over a long expedition. On an Epoch-E (1000 ly, 0.75× consumption), the benefit is smaller in absolute terms.
-   **Why this isn't a buff:** The core's output doesn't change. It just burns slower. The tradeoff is opportunity cost — the mod slot could hold something else.

### Resonance Amplifier

Overdrives the core's harmonic output at the cost of increased thermal stress.

-   **Effect:** Increases core output (`mult_a`) by 5–8%. Increases consumption rate (`mult_b`) by 10–15%.
-   **Practical impact:** Boosts perfRatio on power-starved builds. An Epoch-S goes from 1.0 to ~1.06 output — enough to push a marginal loadout past the 1.0 perfRatio threshold. But the core dies faster.
-   **Tradeoff inherent:** More power, shorter life. The mod makes the Epoch-R's "hot and fast" philosophy even more extreme, or gives the Epoch-S a taste of that aggression.

## Installation

### Process

1. **Acquire the mod** — manufactured at stations, purchased on the market, or salvaged from modded components in wrecks (salvaging a mod from a component has a chance to recover it intact based on component condition).
2. **Dock at station** — mods can only be installed at stations with the appropriate facility.
3. **Queue installation** — takes 4–12 hours depending on mod complexity and component type. Core mods take longest (12 hrs). Sensor and drive mods take 4–8 hours.
4. **Component is offline during installation** — the component cannot be used while being modded. If it's your only drive, you're grounded.

### Removal

Removing a mod destroys it. The component returns to stock configuration for that slot. This is intentional:

-   It prevents free experimentation — you commit to a mod choice
-   It creates demand for replacement mods (economic sink)
-   It makes well-modded components more valuable on the market (the mod is "free" when you buy a pre-modded component)

Replacing a mod (installing a new one over an existing one) destroys the old mod as part of the installation process. Same time, same cost as a fresh install.

### Salvage Recovery

When salvaging a component from a wreck, installed mods have a chance to survive:

-   Component condition > 0.7: 80% mod survival
-   Component condition 0.3–0.7: 50% mod survival
-   Component condition < 0.3: 20% mod survival
-   Component condition < 0.05 (scrap threshold): 0% — mod is gone

A recovered mod can be installed on a different component. This creates a secondary market for salvaged mods and makes high-condition wrecks even more valuable.

## Economy Impact

Mods create several economic layers:

-   **Manufacturing demand** — mods require specialized materials, creating new resource chains
-   **Station services** — installation is a station revenue stream, incentivizing station infrastructure
-   **Component market depth** — "DSC Mk I with correlator" is a different market listing than "DSC Mk I stock." Modded components command a premium.
-   **Salvage value increase** — wrecks with modded components are worth significantly more, making the salvage loop more rewarding
-   **Commitment cost** — choosing wrong is expensive (mod destroyed on removal), which creates demand for information and planning tools

## Open Questions

-   **Should mods have quality tiers?** (e.g., basic correlator = 0.05 threshold shift, advanced = 0.08). This adds crafting depth but also complexity.
-   **Can mods be crafted by players, or station-only?** Player crafting adds an economic role but requires a crafting system.
-   **Should some mods be mark-restricted?** (e.g., Resonance Amplifier only installable on Mk II+ cores). This gates power behind progression.
-   **Nav computer mods** — the nav computer has no obvious mod candidates yet. Mk II nav computers gaining a mod slot creates design space for route optimization mods, discovery bonus mods, etc.
-   **Equipment mods** — should equipment items (Mining Laser, Phaser Array, Torpedo Launcher) have mod slots? A modded phaser with a focus lens (tighter beam, more drain, less spread) is interesting but adds another layer.
