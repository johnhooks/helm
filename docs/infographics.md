# Infographics Design Language

Visual representations for at-a-glance information across Helm interfaces.

## Overview

Helm needs a shared visual language for representing game entities across different contexts:

-   **Star Map (Astrometric)** - 3D canvas with Html overlays
-   **Survey View** - System interior exploration
-   **Ship Dashboard** - Status and equipment
-   **Trade/Economy** - Resource flows and markets

The same glyph for a gas giant should be recognizable whether it appears floating next to a 3D planet, in a survey table, or in a cargo manifest.

## Entity Types

### Stars

**Properties to visualize:**
| Property | Visual Approach |
|----------|-----------------|
| Spectral class (O/B/A/F/G/K/M) | Color gradient (blue → yellow → red) |
| Size/luminosity | Glyph scale or ring thickness |
| Multi-star system | Linked circles or orbital indicator |
| Variable star | Pulsing animation or variance indicator |
| Distance from player | Opacity fade or size reduction |

**Status indicators:**
| Status | Glyph/Badge |
|--------|-------------|
| Unvisited | Hollow circle |
| Visited | Filled circle |
| Current location | Pulsing ring / "you are here" |
| Within jump range | Bright / full opacity |
| Out of range | Dim / reduced opacity |
| Has station | Small dock icon |
| Has anomaly | Warning/interest marker |
| First discovery | Crown/star badge |

### Planets

**Type glyphs (silhouette + color):**
| Type | Visual |
|------|--------|
| Terrestrial | Small solid circle, earth tones |
| Super-Earth | Medium solid circle, earth tones |
| Gas Giant | Large circle with bands |
| Ice Giant | Large circle, blue-white |
| Hot Jupiter | Large circle, orange glow |
| Dwarf | Tiny circle, grey |
| Molten | Circle with magma cracks |
| Frozen | Circle with ice texture |

**Property indicators:**
| Property | Visual |
|----------|--------|
| Habitable | Green ring or leaf icon |
| Has moons | Small dots in orbit |
| Size (radius) | Glyph scale |
| Temperature | Color temperature (blue=cold, red=hot) |
| Resources present | Small resource icons below |

**Status:**
| Status | Indicator |
|--------|-----------|
| Unsurveyed | Question mark overlay |
| Surveyed | Checkmark or clear view |
| Being surveyed | Progress ring |
| Has active mining | Pickaxe icon |

### Asteroid Belts

**Type indicators:**
| Type | Visual |
|------|--------|
| Rocky | Brown scattered dots |
| Metallic | Silver/grey scattered dots |
| Icy | Blue-white scattered dots |
| Mixed | Multi-color scattered dots |

**Properties:**

-   Density shown by dot count/opacity
-   Resource richness shown by glow intensity

### Stations

**Type icons:**
| Type | Icon Concept |
|------|--------------|
| Trading | Currency/exchange symbol |
| Mining | Pickaxe/drill |
| Research | Flask/telescope |
| Military | Shield/chevron |
| Refueling | Fuel pump/lightning |

**Service badges (small icons):**

-   Trade available
-   Repair available
-   Refuel available
-   Upgrades available
-   Missions available

### Anomalies

**Type + danger level:**
| Type | Icon | Danger Color |
|------|------|--------------|
| Derelict | Broken ship | Yellow |
| Signal | Radio waves | Green |
| Artifact | Crystal/relic | Blue |
| Phenomenon | Swirl/void | Purple |
| Wreckage | Debris | Orange |

Danger level: border thickness or glow intensity

### Ships (Player/NPC)

**Quick status bar:**

```
[Power ████░░] [Shields ██████] [Hull ████████░]
```

**Equipment loadout icons:**

-   Core type (capacity indicator)
-   Drive type (range indicator)
-   Sensor type (accuracy indicator)
-   Shield type (defense indicator)

**State indicators:**
| State | Visual |
|-------|--------|
| Idle | Static ship icon |
| In transit | Ship with motion lines |
| Scanning | Ship with pulse rings |
| Mining | Ship with beam to asteroid |
| Docked | Ship merged with station |

### Routes/Connections

**Status styling:**
| Status | Line Style |
|--------|------------|
| Discovered | Dotted, dim |
| Plotted | Dashed, medium |
| Traveled | Solid, bright |
| Blocked | Red, X markers |
| Active (in transit) | Animated pulse |

### Resources

**Category colors:**
| Category | Color Family |
|----------|--------------|
| Ores | Earth tones (brown, copper, silver, gold) |
| Gases | Blues and purples |
| Ice | White and cyan |
| Organics | Greens |

**Rarity indicators:**

-   Common: No border
-   Uncommon: Bronze border
-   Rare: Silver border
-   Very Rare: Gold border

**Small icons for each resource type** - simple geometric shapes that read at small sizes.

## Priority Recommendations

### Highest Priority (Core Gameplay Loop)

1. **Star status badges** - At a glance: can I jump there? Have I been there? Is there something interesting?

    - Reachability (in range / out of range)
    - Visit status (unvisited / visited / current)
    - Points of interest (station / anomaly / rich resources)

2. **Planet type glyphs** - Quick identification in survey view

    - Type silhouette (gas giant vs terrestrial vs ice)
    - Habitability indicator
    - Survey status

3. **Ship resource bars** - Always-visible status

    - Power level
    - Shield level
    - Core life remaining

4. **Route status lines** - Navigation clarity
    - Can I travel this route?
    - Have I traveled it before?
    - Is my ship currently on this route?

### Medium Priority (Enhanced Information)

5. **Resource icons** - Cargo and mining

    - What resources are present
    - Relative richness/value

6. **Station service icons** - What can I do here?

    - Available services at a glance

7. **Action progress indicators** - What's happening?
    - Time remaining on current action
    - Queue visualization

### Lower Priority (Polish)

8. **Spectral class visualization** - Star color/type
9. **Anomaly type/danger indicators**
10. **Discovery attribution badges** - First discoverer recognition
11. **Economic flow indicators** - Trade route profitability

## Implementation Approach

### Package Structure

```
@helm/glyphs (or @helm/infographics)
├── src/
│   ├── stars/
│   │   ├── StarGlyph.tsx       # Base star representation
│   │   ├── StarBadges.tsx      # Status overlays
│   │   └── SpectralColors.ts   # Color by class
│   ├── planets/
│   │   ├── PlanetGlyph.tsx     # Type-based planet icons
│   │   └── PlanetBadges.tsx    # Habitability, survey status
│   ├── resources/
│   │   ├── ResourceIcon.tsx    # Per-resource icons
│   │   └── ResourceBar.tsx     # Richness/quantity display
│   ├── ships/
│   │   ├── ShipIcon.tsx        # Ship with state
│   │   └── StatusBars.tsx      # Power/shields/hull
│   ├── stations/
│   │   └── StationIcon.tsx     # Type + services
│   └── routes/
│       └── RouteStyle.ts       # Line styling by status
```

### Usage in Different Contexts

**In Astrometric (3D canvas):**

```tsx
import { Html } from '@react-three/drei';
import { StarBadges } from '@helm/glyphs';

<mesh position={star.position}>
	<sphereGeometry />
	{selected && (
		<Html>
			<StarBadges
				visited={star.visited}
				hasStation={star.hasStation}
				inRange={star.reachable}
			/>
		</Html>
	)}
</mesh>;
```

**In Survey (DOM):**

```tsx
import { PlanetGlyph, ResourceIcon } from '@helm/glyphs';

<div className="planet-row">
	<PlanetGlyph type={planet.type} size="md" />
	<span>{planet.name}</span>
	{planet.resources.map((r) => (
		<ResourceIcon key={r.type} resource={r.type} />
	))}
</div>;
```

**In Ship Dashboard:**

```tsx
import { StatusBars } from '@helm/glyphs';

<StatusBars
	power={{ current: 450, max: 750 }}
	shields={{ current: 100, max: 100 }}
	hull={{ current: 80, max: 100 }}
/>;
```

## Design Principles

1. **Readable at small sizes** - Icons should be identifiable at 16x16px
2. **Color is secondary** - Shape/silhouette is primary identifier (accessibility)
3. **Consistent metaphors** - Same concept = same visual across all views
4. **Layered information** - Base glyph + optional badges/overlays
5. **LCARS palette** - Use established color tokens
6. **Animation for state** - Pulsing = active, static = idle

## Open Questions

-   SVG vs Canvas vs CSS for glyphs?
-   How many distinct resource icons before they blur together?
-   Animation performance in Html overlays with many visible stars?
-   Should badges be part of the glyph or separate overlay components?
