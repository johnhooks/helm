---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-22-wire-route-aware-jump-ui
---

# Improve route path card

## Problem

The route-aware jump draft card now proves that the route lookup and submit payload work, but the path section is still a plain text fallback. It does not make the plotted course feel like a route through space, and it does not give the player useful interaction with the stars in that path.

A route path is one of the most important pieces of the jump confirmation flow. The player should be able to see the ordered lineup of systems and waypoints, understand where the ship is now, see which leg is current when a jump is active, and inspect or select route nodes without hunting for them in the larger star map. A text path also scales poorly as routes get longer and does not reuse the existing visual language for stars.

## Proposed solution

Replace the plain path text in jump route cards with a compact visual route path component. The component should render the route as an ordered lineup of nodes connected by leg segments. Star nodes should use the existing star glyph visual treatment at a smaller card-friendly scale. Waypoints and unknown node details should have a clear fallback treatment that still fits the route lineup.

The component should support draft, active, and completed route contexts. In a draft it should show the planned route and make each known node selectable. In an active jump it should indicate the ship's current node, the current leg being traveled, and the destination node for that leg. In completed or failed states it should distinguish completed legs from pending or untraveled planned legs when that information is available.

Clicking a node in the route path should select that node in the astrometric view and center the star map on it. This should use the same selection and camera behavior as selecting the node directly on the starfield, rather than creating a separate details system inside the card.

## Requirements

-   Add a compact route path component for jump cards.
-   Render route nodes in order using `params.route` resolved through known user edges and nav nodes.
-   Use the existing star glyph visual treatment for star nodes at a smaller scale suitable for cards.
-   Provide a readable fallback for waypoint nodes and nodes without star details.
-   Show leg connectors between route nodes.
-   In draft state, show the planned route without implying travel has started.
-   In active state, indicate the current ship node, the current edge being traveled, and the current leg destination.
-   In completed or failed state, distinguish completed legs from untraveled planned legs when phase data is available.
-   Clicking a route node must select that node in the astrometric view.
-   Clicking a route node must center the star map on that node.
-   The component must handle direct one-leg routes and multi-hop routes without overflowing the card.
-   Tests must cover direct routes, multi-hop routes, star and waypoint rendering, active current-leg indicators, completed-leg indicators, and node click selection behavior.
