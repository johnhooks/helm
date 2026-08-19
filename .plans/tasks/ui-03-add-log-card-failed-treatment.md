---
status: draft
area: ui
priority: p2
---

# Add failed visual treatment to LogCard

## Problem

`LogCard` has an `error` prop that renders error content below the body, but the failed state has no visual treatment in the component itself. The variant set is `default`, `active`, and `draft`, all of which describe lifecycle position, not outcome. When a card represents a failed action, consumers have to reach around the component API to make the card look failed.

Both failed-action cards in shell already do this the same way:

- `resources/packages/shell/src/ship-actions/scan/complete-scan-card.tsx` passes `variant="default"` plus `style={{ borderColor: 'var(--helm-ui-color-danger)' }}`
- `resources/packages/shell/src/ship-actions/jump/complete-jump-card.tsx` does the identical override

This is the component API failing quietly. The inline override couples consumers to a specific token name and a specific piece of LogCard's internal styling (the border). If LogCard's failed look should ever involve more than a border color, every consumer has to be found and updated. And every new action type that can fail (there will be more) will copy this pattern, because the two existing cards are the reference implementation.

The design question is not entirely straightforward. Failure could be a fourth `variant`, but variants currently describe lifecycle (`draft`, `active`, `default`) and a failed card is still a completed entry, so failure may be orthogonal to variant. Alternatively the card could restyle itself whenever the `error` prop is present, which removes a decision from consumers but takes away the ability to show an error without the full danger treatment. The right shape depends on how failed entries should read in the log next to successful ones.

## Proposed solution

Give LogCard a first-class failed appearance so consumers stop overriding border color inline. Decide whether failure is a variant, a separate boolean, or implied by the `error` prop, and update the two existing consumers to use it.
