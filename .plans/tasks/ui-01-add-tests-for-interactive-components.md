---
status: draft
area: ui
priority: p2
---

# Add tests for interactive ui components

## Problem

The `@helm/ui` package has no automated verification at all. Vitest is wired up in `package.json` (`test`, `test:watch` scripts) but the package contains zero test files. Every component has a Storybook story, so Storybook is the de facto QA surface, but nothing runs against those stories either. A change to a shared token, surface class, or component internals can break any of the 31 components and nothing fails.

The risk is concentrated in the interactive components, which carry real behavior beyond markup:

- `Dropdown` manages open state, Escape handling, click-outside dismissal, focus return to the trigger, and `role="dialog"` wiring.
- `ContextMenu`, `SideDrawer`, and `LcarsModal` have similar open/close, focus, and dismissal contracts.
- `SegmentedControl` and `Toggle` manage selection state and keyboard interaction.

Consumer packages test their own compositions (shell's ship-action cards have co-located tests) but those tests treat ui components as black boxes. If `Dropdown` stops returning focus on Escape, no test anywhere notices. As more consumers build on these components, the cost of a silent behavioral regression grows.

There is also an open question about what level of verification fits this package. Behavior tests (testing-library style) cover the interaction contracts. Story-level checks (Storybook test runner or visual regression) cover the CSS and token layer, which behavior tests will not catch. These are different tools with different maintenance costs, and it is not obvious the package needs both today.

## Proposed solution

Establish test coverage for the interactive components, starting with the ones that own focus and dismissal behavior (`Dropdown`, `ContextMenu`, `SideDrawer`, `LcarsModal`). Lock down the contracts consumers rely on, not implementation details.

Decide whether story-level verification is worth adopting now or should wait. If it is deferred, record why so the gap stays visible.
