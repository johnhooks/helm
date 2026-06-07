# Starmap Edge Styling

Starmap edges describe navigation context and action-related paths in the 3D map. Their appearance is resolved from an edge `type`, an action/context `state`, and UI flags such as `selected`.

## Model

| Input | Values | Purpose |
| --- | --- | --- |
| `type` | `route`, `scan`, `jump` | The domain/action family represented by the edge. Controls the base color family. |
| `state` | `idle`, `planned`, `active`, `complete`, `failed` | The lifecycle state being represented. This is related to the action or route context, not pointer/UI interaction. |
| `selected` | boolean | UI flag for edges that are part of the selected/plotted path. |
| `hovered` | boolean | UI-only pointer state. Brightens the edge without changing its lifecycle state. |

## Types

| Type | Meaning | Base color family |
| --- | --- | --- |
| `route` | Known/background navigation edge | Muted grey |
| `scan` | Scan preview, active scan, or scan result edge | Scan lilac |
| `jump` | Jump preview, active jump, or completed jump edge | Jump sky/blue |

## States

| State | Meaning | Typical treatment |
| --- | --- | --- |
| `idle` | Known route context not tied to a current action | Low-prominence route rendering |
| `planned` | Previewed, plotted, or upcoming path segment | Type color, normal opacity |
| `active` | Current work segment | Type color, pulsing opacity, active width |
| `complete` | Completed/traveled segment | Type color, lower opacity |
| `failed` | Failed attempted edge/path | Danger color |

`state` describes what the edge represents. It should not be used for transient UI interactions like hover or selection.

## UI flags

| Flag | Meaning | Styling effect |
| --- | --- | --- |
| `selected` | Edge belongs to the selected/plotted path | Boost opacity, but do not imply activity |
| `hovered` | Pointer is over the edge | Brighten opacity only; do not change width or state |

Only `state: active` should use active width or active animation.

## Matrix

| Edge situation | Type | State | Selected |
| --- | --- | --- | --- |
| Known background route | `route` | `idle` | no |
| Selected known route | `route` | `idle` | yes |
| Draft scan edge | `scan` | `planned` | yes |
| Active scan edge | `scan` | `active` | yes |
| Completed scan result | `scan` | `complete` | yes |
| Failed scan edge | `scan` | `failed` | yes |
| Draft jump route leg | `jump` | `planned` | yes |
| Active jump current leg | `jump` | `active` | yes |
| Completed jump leg | `jump` | `complete` | yes |
| Failed jump attempt | `jump` | `failed` | yes |

## Multiphase jump route

A multiphase jump renders the full route as selected, but only the current leg is active:

| Segment | Type | State | Selected |
| --- | --- | --- | --- |
| Completed/traveled legs | `jump` | `complete` | yes |
| Current leg | `jump` | `active` | yes |
| Future/plotted legs | `jump` | `planned` | yes |

This keeps the whole route visually connected while making progress legible: completed legs recede, the current leg pulses, and upcoming legs remain selected but static.

## Failed attempts

For a failed jump attempt, it is acceptable to render the attempted route as `state: failed` because the route attempt failed as a whole. If we later need more nuance, add explicit states rather than mixing UI flags with action lifecycle state.
