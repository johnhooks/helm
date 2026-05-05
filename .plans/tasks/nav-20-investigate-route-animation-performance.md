---
status: draft
area: navigation
priority: p2
depends_on:
    - nav-19-add-navigation-edge-states
---

# Investigate route animation performance

## Problem

The astrometric viewport previously stayed close to idle when the player was
not panning, zooming, or otherwise changing the scene. Route rendering used
`frameloop="demand"`, so the canvas only needed to redraw when something in the
starfield changed.

Active scan and jump route overlays now pulse while actions are running. The
current route animation mutates line material opacity and width in `useFrame()`
and calls `invalidate()` every frame while a route is pulsing. That makes the
whole canvas redraw continuously even though only a small route visual changes.
In practice this can consume around 25 percent CPU during active route
animation, compared with near-zero idle usage when there is nothing to animate.

This matters because Helm is a slow asynchronous game. The bridge may be left
open for long periods while actions run. A short visual pulse is useful, but it
should not make the astrometric view expensive to leave open.

## Proposed solution

Investigate how active scan and jump routes should animate in the astrometric
viewport without losing the idle-performance benefits of demand rendering.

The main hypothesis to investigate is whether active route lines can use a
custom shader or route-specific material so the pulse effect is computed on the
GPU instead of mutating material values from React/Three every frame. The task
should identify which parts of the current scene redraw when a route pulses,
measure the cost of the current approach, and compare whether shader-driven
route animation meaningfully reduces CPU usage. The outcome should be a
recommendation and, if the path is clear, a follow-up implementation plan.

The investigation should consider at least these options:

-   Keep route overlays static during active actions, and rely on color or line
    style rather than continuous pulse animation.
-   Use a lower-frequency or time-boxed animation so route overlays do not
    invalidate the canvas every frame for the full action duration.
-   Move pulse state into a route-line shader or route-specific material so the
    pulse is computed by the GPU. Verify whether this removes the per-frame CPU
    material mutation and whether the canvas redraw itself still dominates cost.
-   Split active route effects into a cheaper layer, such as a dedicated
    overlay, so the full starfield does not redraw when only one route changes.
-   Gate animation behind viewport focus, visibility, user preference, or a
    reduced-motion/performance mode.

The desired result is not simply to remove animation. The desired result is to
understand which visual feedback is worth the rendering cost and to define a
strategy that keeps the bridge cheap when left open.

## Acceptance criteria

-   Document the current active route animation path, including where
    `useFrame()` and `invalidate()` are used.
-   Measure or profile the current CPU and render behavior with no active route,
    with an active scan route, and with an active jump route.
-   Identify whether the current pulse causes full-scene redraws and whether
    React work, Three.js work, GPU work, or DOM overlays dominate the cost.
-   Prototype or evaluate a shader-driven route pulse that animates only the
    active route line material, without mutating line opacity or width from
    `useFrame()` on the CPU.
-   Compare at least two alternative strategies with clear tradeoffs.
-   Recommend a default route animation strategy for Helm's asynchronous bridge
    use case.
-   Create follow-up implementation tasks if the recommended fix is larger than
    this investigation.

## Notes

Relevant current code includes:

-   `resources/packages/astrometric/src/components/route-line/route-line.tsx`
-   `resources/packages/astrometric/src/hooks/use-navigation-edges/use-navigation-edges.ts`
-   `resources/packages/astrometric/src/components/star-field/star-field.tsx`
