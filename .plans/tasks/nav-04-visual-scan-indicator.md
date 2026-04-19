# Visual Scan Indicator on Starfield

## Description

Scan is today's primary discovery mechanic — it is how players learn the
route graph. But the starfield gives players no hint about which stars
they could *scan toward* right now. Every unexplored star looks equally
opaque, so the player's only strategy is trial and error: right-click
stars until one responds.

This task adds a scan-range visual indicator that marks stars currently
within the ship's sensor reach and not yet resolved into a known route.
A player scanning the viewport can immediately see "these are my valid
next scan targets." Combined with the jump indicator (task 02), the map
gains a two-stage state progression:

  unknown distant star → (no ring)
  in scan range, unscanned → lilac ring (scannable)
  scanned, route discovered → sky ring (jumpable)

The color flips as the state advances, so the player reads progress
visually rather than by memory. Colors align with the respective action
cards — scannable is `lilac` (scan card tone), jumpable is `sky` (jump
card tone) — making the entire discovery loop color-coded end to end.

## Plan

Mirror task 02's approach with a second set, `scannableNodeIds`, derived
in the bridge route and passed to the starfield. The ring overlay
component learns to render two classifications; rings for jumpable and
scannable stars use matching geometry so the state transition from scan
to jump reads as a pure color change, not a size jump.

Membership in `scannableNodeIds` is: within sensor range of the current
node, excluding the current node itself, and excluding stars already
known to be jumpable (since those already wear the sky ring). Range
comes from the ship's sensor data where that is available; otherwise
a scoped placeholder constant is acceptable for v1 with an explicit note
that the real range must be wired in before the feature is considered
done.

## Requirements

- Stars in scan range of the player's current node, and not already on a
  discovered route, must wear a distinct ring on the starfield.
- The indicator color must match the scan card's `lilac` tone, sourced
  from the same single-source-of-truth location established in task 02
  for sky.
- Scannable and jumpable rings must share geometry (radius, stroke
  weight, opacity profile) so that a star transitioning from scannable
  to jumpable changes color only — it must not jump or resize.
- The current node must not receive the scannable indicator.
- Stars already marked jumpable must not also be marked scannable; the
  sets must be disjoint and the jumpable state takes precedence.
- Sensor range must come from ship state if that selector exists. If a
  placeholder constant is used, it must be clearly marked as a TODO in
  the code so it is not forgotten.
- Indicator state must update reactively: completing a scan should remove
  the lilac ring from newly-resolved stars as they gain the sky one.
- No change to the scan action's server or REST behavior.
