# Drives

## Overview

The drive enables interstellar jumps. While the warp core provides the energy (and degrades with use), the drive determines **how fast** you travel and **how hard** each jump is on your core.

Drives create a fundamental tradeoff: **speed vs longevity**.

## The Tradeoff

A drive can be tuned for speed or efficiency, but not both.

**Fast drives** push the warp core harder:
- Jumps complete quickly
- More stress on the core (higher decay per jump)
- Good for impatient pilots, time-sensitive missions

**Efficient drives** are gentle on the core:
- Jumps take longer
- Less core decay per jump
- Good for patient pilots, long expeditions

This isn't about "better" drives - it's about matching your equipment to your playstyle.

## Why Speed Matters

Helm is designed for asynchronous play. You issue commands, then check back later. Time is a real resource.

When you initiate a jump:
- The ship enters transit
- Arrival time is calculated
- You wait (or do other things)
- The ship arrives when the timestamp says it does

A fast drive means less waiting. An efficient drive means your core lasts longer. You can't have both.

## Drive Types

The first generation of warp drives are the **DR series** - rugged, proven designs with different tuning for different needs.

| Model | Speed | Power Appetite | Character |
|-------|-------|----------------|-----------|
| DR-7 Boost | 2x | 1.5x (hungry) | *"Running hot."* |
| DR-5 Standard | 1x | 1.0x | *"Fleet standard."* |
| DR-3 Economy | 0.5x | 0.6x (efficient) | *"She sips, not gulps."* |

The number indicates power output - higher means more thrust, more speed, more stress on the core.

*Starting values subject to balancing.*

### DR-7 Boost

For pilots who value their time over their credits.

- Jumps complete in half the normal time
- Core decays 50% faster per jump
- Pairs well with cheap cores you plan to replace often
- Good for: Scouts, couriers, impatient players

### DR-3 Economy

For pilots who value longevity over speed.

- Jumps take twice as long
- Core decays 25% less per jump
- Pairs well with expensive cores you want to preserve
- Good for: Traders, deep-space explorers, patient players

### DR-5 Standard

The baseline. No bonuses, no penalties.

- Normal jump duration
- Normal core decay
- Good for: New players, general purpose

## Combined with Core Type

Drive and core choices multiply together, creating distinct ship personalities.

**The Sprinter** (DR-7 Boost + Epoch-R)
- Jumps complete quickly (boost drive)
- Power regenerates quickly (hot core)
- But: Core burns at 1.5x × 1.5x = 2.25x rate
- *"Lives fast, dies young, leaves a beautiful derelict."*

**The Endurance Runner** (DR-3 Economy + Epoch-E)
- Jumps take a while (economy drive)
- Power regenerates slowly (cold core)
- But: Core burns at 0.6x × 0.75x = 0.45x rate
- *"Still running when everyone else is space dust."*

**The Balanced Build** (DR-5 Standard + Epoch-S)
- Normal everything
- No extremes
- *"Sensible. Reliable. Gets the job done."*

## Route Planning Implications

Drive choice affects how you think about routes.

**With a DR-7 Boost:**
- Multiple short hops aren't so bad (each is quick)
- You might prefer discovered routes with more waypoints
- Core replacement is a regular expense

**With a DR-3 Economy:**
- Fewer hops is better (each takes a while)
- Direct routes are valuable (less total time)
- Core replacement is rare

## Automation

Since jumps take real time, automation becomes essential:

- Queue a multi-hop route
- Ship executes each jump in sequence
- Check back when the journey is complete

The drive determines how long that journey takes. A 5-hop route with a DR-7 might take 2 hours. The same route with a DR-3 might take 8 hours.

Neither is wrong - it depends on whether you're actively playing or checking in once a day.

## Jump Range

Drives determine maximum jump distance through their **sustain** rating - how far the drive can push the ship in a single jump.

| Model | Sustain | Effective Range |
|-------|---------|-----------------|
| DR-7 Boost | 5 ly | Short sprints |
| DR-5 Standard | 7 ly | Balanced |
| DR-3 Economy | 10 ly | Long hauls |

Effective range scales with core output. A hot core (high output) extends range; efficiency mode reduces it. This creates interesting decisions:

- DR-7 on overdrive: Fast jumps, but limited range
- DR-3 on normal: Slow jumps, but reaches distant stars
- Any drive on efficiency: Reduced range, but no core decay

There's no arbitrary "max range" limit. The practical limit emerges from economics - longer jumps cost more core life.

## Future Considerations

### Drive Damage

Could drives be damaged separately from cores?
- Misjumps that stress the drive
- Repair vs replace decisions
- Emergency "push it" options that risk damage

### Beyond the DR Series

Future drive lines might offer different tradeoffs:
- **Stealth drives** - Slower but harder to detect
- **Survey drives** - Bonus to scanning during transit?
- **Emergency drives** - One-time boost, then damaged
