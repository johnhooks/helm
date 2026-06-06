---
status: draft
area: dev
priority: p2
---

# Research processor-owned action resolution

## Problem

Action processing responsibilities are split across the processor and resolver. The processor claims ready actions, but the resolver loads the action and ship, applies lifecycle defaults, saves action state, saves ship state and components, clears processing locks, handles failures, and clears the ship current action when final.

That split makes drain-until-stable multiphase processing harder to reason about. If the processor owns the processing call stack, it may also need clearer ownership of transaction boundaries, persistence, processing locks, and final cleanup.

## Proposed solution

Research whether action resolution should move toward a processor-owned unit-of-work model. In this concept, the processor would claim the action, load the action and ship, open the transaction, invoke the type-specific resolver, apply shared lifecycle rules, persist action and ship changes, and decide whether to keep draining or release the action.

Type-specific resolvers would become domain mutators. They would update the in-memory action, ship state, and components, but would not save records or own shared lifecycle behavior.

This is only a concept to evaluate. We are not committed to implementing it. The task should compare this model against the current resolver-owned persistence model and identify whether the benefits justify the added processor responsibility.
