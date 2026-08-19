---
status: draft
area: ui
priority: p3
---

# Add a spacing scale to ui tokens

## Problem

The token layer in `resources/packages/ui/src/styles/tokens.css` is thorough about color and typography. It defines the full tone palette, contrast foregrounds for tone-as-background usage, and a thirteen-step font size scale. Spacing has almost nothing: `--helm-ui-stack-gap: 8px`, two radius values, and a drawer width.

The consequence is that component CSS hardcodes its own padding, margin, and gap values. Each of the 31 components made its own spacing decisions, and there is no shared scale keeping them consistent. This shows up in two ways:

- Components that should feel like one system drift apart. A card's internal padding, a panel's gutter, and a button's height were each picked independently, and nothing prevents them from diverging further as components are edited.
- Consumers cannot compose with confidence. Shell and bridge lay out ui components next to each other, and without shared spacing tokens they either eyeball gaps or hardcode values that happen to match today's component internals.

The complication is that a scale added now has to be retrofitted honestly. Introducing tokens without migrating the existing hardcoded values just adds a second source of truth. The existing values need to be surveyed first to find the natural steps already in use, so the scale describes the system that exists rather than an ideal one nothing follows.

## Proposed solution

Survey the spacing values currently hardcoded across component CSS, derive a small scale from the values actually in use, add it to `tokens.css`, and migrate component styles onto it. Consistency with the existing font size token naming is preferable to inventing a new convention.
