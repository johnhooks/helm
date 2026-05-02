# LCARS Elbow Component

## What It Is

The elbow is the signature L-shaped corner piece of LCARS interfaces. It connects a vertical sidebar (with buttons) to a horizontal bar, with a curved inner sweep at the junction.

```
TOP-LEFT ELBOW:

╭─────────────────────────────────────────────┐
│         HORIZONTAL BAR              LABEL   │  ← bar-height
╰────────╮                                    │
         │                                    │
   gap   ╰╮                                   │
         ╰╯ ← inner sweep (SVG, transparent)  │
  ┌────────┐                                  │
  │ BUTTON │                                  │
  ├────────┤                                  │
  │ BUTTON │                                  │
  ├────────┤                                  │
  │ BUTTON │                                  │
  └────────┘
```

## Four Orientations

```
TOP-LEFT              TOP-RIGHT
╭──────────────┐      ┌──────────────╮
│    BAR       │      │       BAR    │
╰───╮          │      │          ╭───╯
    ╰╮         │      │         ╭╯
 ┌────┐        │      │        ┌────┐
 │BTN │        │      │        │BTN │
 │BTN │                        │BTN │
 │BTN │                        │BTN │

BOTTOM-LEFT           BOTTOM-RIGHT
 │BTN │                        │BTN │
 │BTN │                        │BTN │
 │BTN │        │      │        │BTN │
 └────┘        │      │        └────┘
    ╭╮         │      │         ╭╮
╭───╯          │      │          ╰───╮
│    BAR       │      │       BAR    │
╰──────────────┘      └──────────────╯
```

## Anatomy

### 1. Horizontal Bar

A full-width colored bar at the standard bar-height. The outer corner (the big LCARS cap) is achieved with `border-radius` on this element.

-   Height: `var(--lcars-bar-height)` (32px default)
-   Outer corner radius: large, matching the sidebar width for the classic LCARS proportion
-   Contains the label text
-   Has `position: relative` to anchor the inner sweep SVG

### 2. Inner Sweep (SVG)

An SVG element absolutely positioned on the horizontal bar, hanging off the edge into the gap between bar and sidebar buttons. This is the curved transition piece.

-   Positioned with `position: absolute` on the bar
-   For top positions: `top: 100%` (hangs below the bar)
-   For bottom positions: `bottom: 100%` (hangs above the bar)
-   Aligned to the sidebar side (`left: 0` for left positions, `right: 0` for right)
-   Size: `sidebar-width` wide × `radius` tall
-   Uses `currentColor` fill so it inherits the elbow color
-   The inner curve is **transparent** (not a solid color), so it works over any background

The SVG path draws a filled quarter-circle shape. The outside of the curve is the elbow color. The inside of the curve is transparent, revealing whatever background is behind.

```svg
<svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0,0 L1,0 A1,1 0 0,1 0,1 Z" fill="currentColor" />
</svg>
```

This base path works for top-left. Other orientations use CSS transforms:

-   **top-left**: no transform
-   **top-right**: `scaleX(-1)` (mirror horizontally)
-   **bottom-left**: `scaleY(-1)` (mirror vertically)
-   **bottom-right**: `scale(-1, -1)` (mirror both axes)

### 3. Sidebar (Vertical Buttons)

A column of buttons below (or above) the bar. There is a visible gap between the buttons and the sweep, allowing the background to show through.

-   Width: `var(--lcars-sidebar-width)` (160px default)
-   Flex column with gap between buttons
-   `margin-top` (for top elbows) or `margin-bottom` (for bottom elbows) creates space for the SVG sweep plus the visible gap

## Why SVG for the Inner Sweep

Previous attempts used:

-   **CSS `::before`/`::after` with background-color**: Locks into a specific cutout color (usually black). If the elbow sits on a different background, the cutout doesn't match.
-   **SVG rect + path in a dedicated corner element**: Made the horizontal bar double-height because the corner element participated in layout.

The reference LCARS template (TheLCARS.com v24.2) uses two pseudo-elements:

1. `::before` with `linear-gradient(to top right, color 50%, black 50%)` for the diagonal fill
2. `::after` with `background-color: black; border-radius` for the rounded cutout

This works but is locked to a black background. Using an SVG with a transparent interior instead:

-   The filled area (elbow color) uses `currentColor`
-   The cutout area is simply not drawn (transparent)
-   Works over any background color, gradient, or image
-   The SVG is `position: absolute` so it doesn't affect the bar's height

## HTML Structure

```html
<div
	class="lcars-elbow lcars-elbow--top-left lcars-elbow--orange lcars-elbow--md"
>
	<!-- Horizontal bar with outer rounded corner and inner sweep -->
	<div class="lcars-elbow__bar">
		<svg
			class="lcars-elbow__sweep"
			viewBox="0 0 1 1"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path d="M0,0 L1,0 A1,1 0 0,1 0,1 Z" fill="currentColor" />
		</svg>
		<span class="lcars-elbow__label">LABEL TEXT</span>
	</div>

	<!-- Sidebar buttons with gap from the sweep -->
	<div class="lcars-elbow__sidebar">
		<button>OPS</button>
		<button>NAV</button>
		<button>SCI</button>
	</div>
</div>
```

For bottom positions, the sidebar comes before the bar in DOM order.

## CSS Variables

```css
.lcars-elbow {
	--lcars-elbow-color: var(--lcars-orange);
	--lcars-elbow-bar-height: var(--lcars-bar-height); /* 32px */
	--lcars-elbow-sidebar-width: var(--lcars-sidebar-width); /* 160px */
	--lcars-elbow-radius: var(
		--lcars-bar-height
	); /* 32px - inner sweep radius */
	--lcars-elbow-outer-radius: 50%; /* outer cap radius */
	--lcars-elbow-gap: var(
		--lcars-space-1
	); /* 8px gap between sweep and buttons */
}
```

## Props

| Prop        | Type            | Default      | Description                      |
| ----------- | --------------- | ------------ | -------------------------------- |
| `position`  | `ElbowPosition` | `'top-left'` | Corner orientation               |
| `color`     | `LcarsColor`    | `'orange'`   | Elbow color                      |
| `size`      | `Size`          | `'md'`       | Size variant                     |
| `label`     | `string`        | —            | Label text in the horizontal bar |
| `children`  | `ReactNode`     | —            | Sidebar content (buttons)        |
| `className` | `string`        | `''`         | Additional CSS classes           |
| `style`     | `CSSProperties` | —            | Inline styles                    |

## CSS Layout Details

### Top-Left Position

```css
.lcars-elbow--top-left {
	display: flex;
	flex-direction: column;
	align-items: flex-start; /* sidebar aligns left */
}

.lcars-elbow--top-left .lcars-elbow__bar {
	width: 100%;
	height: var(--lcars-elbow-bar-height);
	background-color: var(--lcars-elbow-color);
	border-top-left-radius: var(--lcars-elbow-outer-radius);
	position: relative;
}

.lcars-elbow--top-left .lcars-elbow__sweep {
	position: absolute;
	top: 100%; /* hangs below the bar */
	left: 0; /* aligned to sidebar side */
	width: var(--lcars-elbow-sidebar-width);
	height: var(--lcars-elbow-radius);
	color: var(--lcars-elbow-color); /* SVG inherits via currentColor */
}

.lcars-elbow--top-left .lcars-elbow__sidebar {
	width: var(--lcars-elbow-sidebar-width);
	/* sweep height + gap before first button */
	margin-top: calc(var(--lcars-elbow-radius) + var(--lcars-elbow-gap));
}
```

### Top-Right Position

Same as top-left but mirrored:

-   `align-items: flex-end` (sidebar aligns right)
-   `border-top-right-radius` instead of left
-   SVG at `right: 0` with `transform: scaleX(-1)`
-   Label aligns left instead of right

### Bottom Positions

Mirror of top positions vertically:

-   Sidebar comes first in DOM
-   SVG at `bottom: 100%` (hangs above bar)
-   `border-bottom-*-radius` for outer corner
-   SVG uses `scaleY(-1)` transform

## References

-   TheLCARS.com v24.2 template: `classic.css` lines 953-976 (inner curve technique)
-   TheLCARS.com: `classic.css` lines 927-930 (outer border-radius on sidebar)
-   Helm Frame component: `frame.css` lines 31-48 (existing elbow in Helm)
