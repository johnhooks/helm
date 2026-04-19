# Refactor Star Context Menu Actions to Slot Fill

## Description

The current `nav-01` implementation fixed the immediate UX bug by making
the bridge route decide whether `Scan Route` and `Jump` appear for the
selected star. That is acceptable as a stopgap, but it is the wrong
architecture for where navigation is headed.

The bridge should not own a central `if/else` switchboard for context-menu
actions. We already use a slot-fill pattern for ship action cards: each
action registers itself, inspects the relevant state, and decides whether
it should render. The star context menu should work the same way.

This matters now because the current system will soon gain a different set
of actions than remote stars. If the bridge keeps building the action list
directly, every new action adds another branch to a single helper and turns
the route into a policy bottleneck. That is exactly what slot fill is meant
to avoid.

This task replaces the bridge-owned action list with a context-menu slot
that aggregates independent action contributions. Each fill decides whether
it applies based on the selected star and current ship state. Adding a new
current-system action later should be "register another fill," not "edit a
central menu builder."

## Plan

Create a `StarContextMenuSlot` abstraction that mirrors the existing ship
action slot pattern, but for *multiple simultaneous contributions* rather
than exactly one renderer per action type. The slot receives the selected
star and shared UI/game state as props, then renders the context menu using
all fills that return content.

Each menu action becomes its own fill module:

- `ScanRouteContextActionFill`
- `JumpContextActionFill`
- future current-location/system actions as separate fills

Each fill is responsible for:

- selecting or receiving the state it needs
- deciding whether it applies to the current selection
- returning a single menu row when it does apply
- returning nothing when it does not

The bridge route remains responsible only for gathering the shared state
required by the menu slot and for mounting the fills, not for deciding
which actions belong in the menu.

The current `nav-01` logic should be folded into the fills:

- the scan fill hides itself for the current node
- the jump fill hides or disables itself according to its own reachability
  logic as later tasks land
- a future current-system fill can render when the selected star *is* the
  current node

The result is a composable context menu that grows by extension rather than
by editing a central helper.

## Requirements

- The star context menu must use a slot-fill pattern for action rows rather
  than a bridge-owned helper that returns the full action array.
- The bridge route must not contain per-action render policy such as "show
  scan here, hide jump there." It may gather shared state and pass it to the
  slot.
- Each context action must determine its own applicability from the current
  selection and relevant store state.
- The slot implementation must support zero, one, or many action
  contributions without treating zero fills as an error.
- Existing `nav-01` behavior must remain intact after the refactor:
  - current star shows no navigation actions
  - non-current stars still show `Scan Route`
  - `Jump` remains the existing placeholder until `nav-02`
- Clicking a contributed action must still close the context menu after
  dispatching its behavior.
- The menu header must continue to render even when no fills contribute
  action rows.
- No server, REST, or ShipLink changes.

## Design Notes

- Prefer using WordPress `Slot` / `Fill`, matching the existing pattern used
  by `ShipActionSlot`.
- Do **not** copy the ship-action invariant that "missing fill is an error."
  For context menus, zero fills is valid and expected for some selections.
- Prefer a fill API that renders menu-row components or row fragments rather
  than passing opaque data back through an ad hoc registry. The pattern
  should stay close to normal Slot/Fill composition.
- Shared fill props should include, at minimum:
  - selected `star`
  - `currentNodeId`
  - `selectedDistance`
  - `hasActiveAction`
  - `onClose`
- If a fill needs dispatch access, it may use store hooks internally rather
  than requiring the bridge to thread action creators through props.

## Suggested Implementation Shape

- Introduce a new slot module in `bridge` or `shell`, for example:
  - `star-context-menu-slot.tsx`
- Add a slot component, e.g. `StarContextMenuSlot`
- Add a fill helper, e.g. `StarContextMenuFill`
- Convert the current scan and jump menu rows into independent fills
- Update `StarContextMenu` to render the slot's contributed rows beneath the
  existing header
- Remove the bridge helper that constructs the full `ContextMenuAction[]`

One acceptable shape is:

```tsx
<StarContextMenu star={ selectedStar } onClose={ handleContextMenuClose }>
	<StarContextMenuSlot
		star={ selectedStar }
		currentNodeId={ currentNodeId }
		selectedDistance={ selectedDistance }
		hasActiveAction={ hasActiveAction }
		onClose={ handleContextMenuClose }
	/>
</StarContextMenu>
```

with fills mounted near the route or router, analogous to ship action fills.

## Test Cases

- Slot renders zero contributed rows without throwing or logging an error.
- Scan fill renders for a non-current star and hides itself for the current
  star.
- Jump fill preserves current placeholder behavior on non-current stars.
- Clicking the scan fill row drafts the scan and closes the menu.
- Multiple fills render in stable order when more than one action applies.
- Header-only menu remains visually clean when no fills contribute rows.

## Dependencies / Sequencing

- This task should land before adding many more context-sensitive menu
  actions, otherwise the bridge helper will become entrenched.
- `nav-02` can be implemented either before or after this task, but if it
  lands first it should be expected to migrate into the jump fill as part of
  this refactor.
