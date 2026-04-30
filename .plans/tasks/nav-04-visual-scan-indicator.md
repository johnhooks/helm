---
status: blocked
area: navigation
priority: p2
depends_on:
  - nav-03-visual-jump-indicator
  - nav-06-persist-scan-discoveries
blocked_by: nav-03 must define the shared ring layer and direct-jump precedence.
---

# Visual Scan Indicator on Starfield

## Description

Scan is today's primary discovery mechanic. It is how players learn the
route graph. But the starfield gives players no hint about which stars
they could *scan toward* right now. Every unexplored star looks equally
opaque, so the player's only strategy is trial and error: right-click
stars until one responds.

This task adds a scan-range visual indicator that marks stars currently
within the ship's sensor reach and not yet resolved into a known route.
A player scanning the viewport can immediately see "these are my valid
next scan targets." Combined with the jump indicator in `nav-03`, the map
gains a two-stage state progression:

  unknown distant star -> (no ring)
  in scan range, no direct edge -> lilac ring (scannable)
  direct edge discovered -> sky ring (jumpable)

The color flips as the state advances, so the player reads progress
visually rather than by memory. Colors align with the respective action
cards. Scannable is `lilac` (scan card tone), and direct jumpable is `sky`
(jump card tone), making the discovery loop color-coded end to end.

A star may be reachable through an indirect known path and still be a valid
scan target if there is no direct edge from the current node to that star. Scan
eligibility follows direct adjacency, not broad known-path reachability. The
route-aware jump draft in `nav-14-route-aware-jump-draft` owns the indirect
path presentation.

## Plan

Mirror task 02's approach with a second set, `scannableNodeIds`, derived
in the bridge route and passed to the starfield. The ring overlay
component learns to render two classifications; rings for jumpable and
scannable stars use matching geometry so the state transition from scan
to jump reads as a pure color change, not a size jump.

Membership in `scannableNodeIds` is based on sensor range from the current
node, excluding the current node itself, and excluding stars that already have
a direct known edge from the current node. Range comes from the ship's sensor
data where that is available; otherwise a scoped placeholder constant is
acceptable for v1 with an explicit note that the real range must be wired in
before the feature is considered done.

## Requirements

- Stars in scan range of the player's current node, and without a direct known
  edge from that node, must wear a distinct ring on the starfield.
- Stars reachable only through an indirect known path may still be marked
  scannable when no direct edge exists.
- The indicator color must match the scan card's `lilac` tone, sourced
  from the same single-source-of-truth location established in task 02
  for sky.
- Scannable and jumpable rings must share geometry (radius, stroke
  weight, opacity profile) so that a star transitioning from scannable
  to jumpable changes color only. It must not jump or resize.
- The current node must not receive the scannable indicator.
- Stars already marked direct jumpable must not also be marked scannable. The
  sets must be disjoint and the direct-jump state takes precedence.
- Sensor range must come from ship state if that selector exists. If a
  placeholder constant is used, it must be clearly marked as a TODO in
  the code so it is not forgotten.
- Indicator state must update reactively: completing a scan should remove
  the lilac ring from newly-resolved stars as they gain the sky one.
- No change to the scan action's server or REST behavior.
