---
status: active
area: navigation
priority: p2
---

# Add star glyph route components

## Problem

Jump and scan routes need to distinguish stars, waypoints, unknown paths, active legs, completed legs, and failed or partial outcomes. A horizontal route works well as a compact overview, but becomes crowded when a narrow ship action card also needs to show each stop and leg's details.

## Presentation

Keep two complementary route layouts in the UI library:

-   `Route` renders a horizontal informational route. `RouteStepIndicator` adds current-step semantics and inspection for active routes. These remain available for compact overviews and wider layouts.
-   `RouteItinerary` renders a vertical list with room for node labels and leg details. Ship action stories use it for jump itineraries and scan discoveries.

All layouts retain star glyphs and waypoint markers. Callers supply human-readable text and explicit presentation states. The vertical itinerary accepts independent node and outgoing-leg states, an optional current marker, and a separate unconnected target when the remaining path is unknown. Active connectors animate with reduced-motion support.

The horizontal layout accepts per-leg `distanceLy` values as relative layout weights, preserves minimum leg widths, and falls back to even spacing for missing or invalid distances. Distances do not generate display copy.

## Ship action stories

Jump and scan examples cover draft, active, fulfilled, partial, and failed cards. Draft and active itineraries stay visible; terminal cards retain their summary and collapse the itinerary. Drafts provide Confirm and Cancel actions.

Headers retain the same geometry across states. Compact readouts occupy stable positions: Distance, Time, and Core for jumps; Distance, Cycle, and Chance for active scans. Chance uses a plain readout with one decimal place. Completed scans show Distance, Duration, and Waypoints. Estimated values are labeled accordingly, and unknown values display a dash. Detailed phase information belongs in the itinerary.

Navigation uses sky with gold activity accents; scanning uses lilac with orange activity accents. Completed and active star glyphs retain their full color, pending glyphs are subdued, and only active connectors animate.

## Coverage

Component stories cover route layouts, stellar glyphs, independent node and leg states, unknown targets, terminal outcomes, long narrow itineraries, and disabled motion. Tests cover route semantics, inspection, prop-driven state updates, and empty or target-only itineraries.
