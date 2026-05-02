# Slot/Fill Systems Plan

## Requirements

-   Keep datastores clean: no cross-store imports inside stores.
-   Allow UI composition across multiple entry points in WP-Admin.
-   Support domain-owned UI contributions (log cards, map overlays, panels).
-   Support context menu contributions for Astrometric and Survey screens.
-   Make dependencies explicit and easy to trace in the monorepo.
-   Preserve WordPress-native extensibility patterns (Slot/Fill).
-   Allow incremental adoption without breaking existing UI.

## Proposal (What + Why)

### What

Introduce a Shell Registry in `@helm/shell` and a System Module convention for domains.

-   Shell Registry: a typed interface that exposes extension points such as:

    -   ship log: register fills by action type
    -   star map: register overlays, context menu items
    -   bridge: register panels/cards
    -   astrometric: register context menu fills
    -   survey: register context menu fills

-   System Module: each domain exports a single `registerXSystem(registry)` function that registers all UI contributions for that system in one place.

-   Entry Points: each WP-Admin entry point imports and registers only the systems it needs.

### Why

-   Centralizes composition while keeping domain ownership of UI.
-   Makes system wiring discoverable and consistent across entry points.
-   Avoids store coupling while still allowing cross-store selection in the composition layer.
-   Slot/Fill keeps the architecture WordPress-native and extensible.
-   Context menus become consistent across astrometric and survey views.

## MVP Scope

-   Slot/Fill only (no extra registry abstractions yet).
-   One system module (Scan) wired into Bridge entry point.
-   Default fallback renderer remains for types without fills.

## Phased Implementation

### Phase 1: Shell Slot/Fill Helpers

-   Add Slot/Fill helpers for ship log, map overlays, and context menus.
-   No behavior changes yet; only structure and types.

### Phase 2: Scan System Module

-   Create a scan module that registers:
    -   ship log fills for scan actions
    -   map overlays/context menu entries (if already defined)
    -   astrometric context menu fills
    -   survey context menu fills (stub until screen exists)
-   Wire scan module in Bridge entry point only.
-   Ensure scan log rendering works without store coupling.
-   No guards or priority yet; keep registration direct and explicit.

### Phase 3: Incremental Migration

-   Migrate additional systems (jump, mining, trade) into modules.
-   Remove scattered wiring once a system is fully registered through the shell.
-   Establish shared patterns for action renders and map contributions.

## Future Considerations

-   Registration order and collisions: multiple fills for the same slot need a defined priority or merging rule.
-   Performance and load time: entry points that register many systems may need lazy loading or split registration.
-   Context ownership: some actions appear in multiple surfaces; define which surface is authoritative.
-   Telemetry and debugging: trace which system registered a fill for a given view.
-   Feature gating: enable systems per ship/player/origin with guards.
-   Version drift: document compatibility expectations for system modules.

## Implementation Guide (Concise)

1. Define shell Slot/Fill helpers

-   File: `resources/packages/shell/src/ship-actions/ship-action-slot.tsx`
-   Add similar helpers for map overlays and context menus.

2. Add system module convention

-   Example: `resources/packages/shell/src/modules/scan/index.ts`
-   Export `registerScanSystem(registry)`.

3. Register in entry point

-   Bridge entry: `resources/packages/bridge/src/router.tsx`
-   Call `registerScanSystem(shellRegistry)` before rendering.

4. Migrate existing UI wiring

-   Replace ad-hoc wiring with registry-based registration.
-   Keep fallback renderers while migrating.

5. Expand system coverage

-   Repeat per domain, remove old wiring after verification.
