---
status: draft
area: ui
priority: p3
---

# Clean up ui package cruft

## Problem

A few small pieces of clutter in `@helm/ui`:

- `src/components/indicator/` is an empty directory, presumably left over from a rename to the individual indicator components.
- Two unrelated functions share the name `formatTime`. The ui package exports one from `countdown` that formats a duration in seconds, and shell has its own in `ship-actions/utils.ts` that formats an ISO timestamp to clock time. Same name, different semantics, both importable in shell code.
- `src/components/panel/bridge-overview.stories.tsx` is a 1,400-line page composition sandbox living inside the `panel` component directory. It is useful, but it is not a panel story.

## Proposed solution

Delete the empty directory. Rename one of the `formatTime` functions so the names describe what they format (duration versus timestamp). Move the bridge overview story to a compositions area in the Storybook config rather than under a single component.
