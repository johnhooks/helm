# System Scanning

How ships discover what's in a star system.

## The Problem

A ship arrives at a new star system. What does the crew know?

From Earth, we've found roughly 5,000 exoplanets after decades of effort with specialized telescopes. Being in-system makes detection far easier, but even then, surveying a solar system takes real work. You can't just arrive and instantly know everything.

We want exploration to feel meaningful:

-   Arriving somewhere new should require effort to understand
-   First explorers should get recognition
-   Information should be valuable and tradeable
-   The moment of discovery should have tension

## Two Types of Scanning

### System Survey (Broad Scan)

When you arrive at an uncharted system, you know nothing except the star exists (and maybe a few confirmed exoplanets from Earth-based astronomy).

To learn what's actually there, you run a system survey:

-   Detects all planets and asteroid belts
-   Maps orbital positions
-   Identifies basic planet types (rocky, gas giant, ice world)
-   Generates the system content deterministically

**The surprise:** You don't know if someone else already surveyed the system until you complete your own scan. You might race to a distant star, spend time scanning, excited to be first... only to see "First surveyed by Captain Chen, 3 days ago." Or you see your own name. That moment of tension is part of the fun.

### Planet Scan (Detailed Scan)

Once you have the system survey, you can select individual planets for detailed analysis:

-   Resource deposits
-   Habitability assessment
-   Moons and rings
-   Atmospheric composition
-   Anomalies and points of interest

You choose which planets to scan. Each takes time. A thorough explorer might scan every world; someone passing through might just scan the one that looks promising.

## Scan Time

Scan duration depends on ship sensors, not fixed timers.

**Scout ships** with advanced sensor arrays scan faster. **Haulers** and **combat ships** have basic sensors - they can scan, but it takes longer.

This creates meaningful ship choice:

-   Racing to claim discoveries? Fly a scout.
-   Planning to mine what you find? Different loadout.
-   Passing through hostile space? Maybe accept slower scans for better weapons.

Ship classes and sensor loadouts are defined elsewhere. The scanning system just reads the ship's sensor rating.

## Privacy and Trading

### Everything is Private

Both system surveys and planet scans are private to the player who did them:

-   You can't see someone else's scan data
-   You don't know a system was surveyed until you survey it yourself
-   Your detailed planet scans are yours alone

### Trading Maps

Scan data is tradeable:

-   Sell your system survey to another player
-   Sell detailed planet scans (individually or bundled)
-   Buy maps for systems you haven't visited

When you buy a map, you get a copy of that scan data. The seller keeps theirs too. Information can spread, but it costs something.

### Discovery Credit

First surveyor gets permanent credit:

-   "Tau Ceti - First surveyed by USS Enterprise"
-   "Tau Ceti III - First detailed scan by Captain Kirk"

This credit is visible to anyone who later scans (or buys a map). Your name is on your discoveries forever.

## What Gets Stored

Two pivot tables track scan ownership:

```
helm_player_system_scans
├── player_id
├── star_id
├── acquired_at     (when this player got access)
└── acquired_from   (null = self-scanned, player_id = bought from)

helm_player_planet_scans
├── player_id
├── planet_post_id
├── acquired_at
└── acquired_from
```

If `acquired_from` is null, then `acquired_at` is when you scanned it yourself.

### Queries

First surveyor:

```sql
SELECT player_id FROM helm_player_system_scans
WHERE star_id = X AND acquired_from IS NULL
ORDER BY acquired_at LIMIT 1
```

When was system first scanned:

```sql
SELECT MIN(acquired_at) FROM helm_player_system_scans
WHERE star_id = X AND acquired_from IS NULL
```

Did I scan this myself:

```sql
SELECT * FROM helm_player_system_scans
WHERE player_id = me AND star_id = X AND acquired_from IS NULL
```

### Trading

Selling a map creates a new row for the buyer:

-   `acquired_at` = purchase timestamp
-   `acquired_from` = seller's player_id

Seller keeps their row. Buyer gets a copy. Both now have access.

### Deterministic Generation

Planet properties, resources, etc. are generated from seeds. We don't store "planet 3 has iron" - we store "player X has scanned planet 3" and compute the resources from the seed when displaying.

## Consistency with Navigation

Navigation routes are private and tradeable. System scans follow the same model:

| Data Type     | Private? | Tradeable? | First Credit? |
| ------------- | -------- | ---------- | ------------- |
| Route to star | Yes      | Yes        | Yes           |
| System survey | Yes      | Yes        | Yes           |
| Planet scan   | Yes      | Yes        | Yes           |

Information is valuable. Exploration is rewarded. The economy includes knowledge.

## User Experience

### Arriving at Uncharted System

```
You arrive at Tau Ceti.

[!] No survey data for this system.
    Run a system survey to detect planets and map orbits.

[Begin Survey] [Continue Journey]
```

### Completing Survey (First!)

```
System survey complete.

★ FIRST SURVEY ★
You are the first to survey Tau Ceti!

Detected:
• 6 planets
• 1 asteroid belt

Select a planet to view details or begin detailed scan.
```

### Completing Survey (Not First)

```
System survey complete.

First surveyed by: Captain Chen (3 days ago)

Detected:
• 6 planets
• 1 asteroid belt

Select a planet to view details or begin detailed scan.
```

### Planet Selection

```
Tau Ceti System

① Tau Ceti I    - Rocky     - 0.4 AU  [Not Scanned]
② Tau Ceti II   - Rocky     - 0.8 AU  [Not Scanned]
③ Tau Ceti III  - Ocean     - 1.1 AU  [Not Scanned]
④ Tau Ceti IV   - Gas Giant - 5.2 AU  [Not Scanned]
⑤ Tau Ceti V    - Ice       - 12 AU   [Not Scanned]
⑥ Tau Ceti VI   - Ice       - 28 AU   [Not Scanned]
◎ Asteroid Belt            - 2.8 AU  [Not Scanned]

[Scan Selected] [View Market] [Depart]
```

### After Detailed Scan

```
Tau Ceti III - Detailed Scan Complete

★ FIRST SCAN ★

Type: Ocean World
Orbit: 1.1 AU
Habitability: 78% (Promising!)

Resources:
• Water (abundant)
• Organic compounds (moderate)
• Rare earths (trace)

Moons: 2
• Tau Ceti III-a (rocky, small)
• Tau Ceti III-b (ice, tiny)

Anomalies: None detected
```

## Summary

System scanning in Helm:

1. **Two-phase scanning** - System survey first, then detailed planet scans
2. **Private data** - Your scans are yours until you share/sell them
3. **Tradeable maps** - Information has value in the economy
4. **Discovery credit** - First surveyor/scanner gets permanent recognition
5. **Ship-dependent timing** - Scouts scan fast, other ships slower
6. **Surprise reveal** - You don't know if you're first until you finish
7. **Deterministic content** - Generated from seeds, minimal storage

The result: exploration is meaningful, information is valuable, and discovering something first actually matters.
