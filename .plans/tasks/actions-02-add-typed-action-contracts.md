---
status: draft
area: dev
priority: p2
---

# Add typed action contracts

## Problem

Ship actions store `params` and `result` as generic arrays on the PHP action
model. Validators, handlers, and resolvers read domain-specific fields from
those arrays with string keys, so the code does not clearly communicate which
fields belong to each action type. PHPStan can only see
`array<string, mixed>`, which means it cannot catch missing fields, wrong field
types, or a jump resolver being handed a scan action until runtime tests or
manual review find the problem.

The TypeScript action package already has a more precise contract model. Each
action type maps to specific params and result shapes, and UI code can narrow a
ship action to `jump` or `scan_route` before reading type-specific fields. The
PHP side needs a comparable contract so action behavior is easier to maintain
as actions become more complex and multiphase.

## Proposed solution

Introduce typed PHP action contracts for each action type. The shared action
factory and resolver should remain the untrusted boundary that receives raw
REST or persisted data, validates the action type, and builds a concrete typed
action object for the selected contract. Type-specific validators, handlers,
and resolvers should receive those concrete typed actions through real PHP type
hints instead of accepting the generic action model and reading array keys.

Use DTOs for action params and results. DTOs should be responsible for parsing
raw arrays from REST and storage, validating required fields, exposing named
properties to domain code, and serializing back to arrays for the existing
database and REST response formats. This keeps the storage format stable while
moving domain code away from generic bags.

The contract registry should define the relationship between `ActionType`, the
typed action wrapper, params DTO, result DTO, validator, handler, and resolver.
The dispatcher should use that registry to ensure it only passes the correct
typed action into each type-specific component. A bad mapping should fail
clearly during development through PHP type hints and PHPStan analysis.

PHPStan should be configured through PHPDoc generics and assertions where they
help enforce the registry and typed boundary. PHPStan does not need to infer a
typed action from the enum alone everywhere in the codebase. The desired
contract is that once the factory or resolver has built a typed action, the
rest of the action-specific pipeline stays correctly typed without repeating
array validation at every step.

Keep the current database representation and REST payload shape compatible.
Existing clients should still see `type`, `params`, `result`, `status`, and the
current timestamp fields. The change should improve PHP domain typing without
forcing a frontend protocol migration.

## Requirements

-   Add typed params and result DTOs for the existing `jump` and `scan_route`
    actions.
-   Add concrete typed action wrappers for the existing `jump` and
    `scan_route` actions.
-   Add a contract registry that maps `ActionType` values to their typed
    action wrapper, DTOs, validator, handler, and resolver.
-   Keep raw array parsing at the action factory, repository hydration, or
    resolver boundary rather than inside every type-specific component.
-   Type-specific validators, handlers, and resolvers must receive concrete
    typed action objects through PHP type hints.
-   Typed params and results must serialize back to the current array payloads
    used by the database, REST controller, heartbeat, tests, and TypeScript
    clients.
-   PHPStan should report mismatches when a contract maps an action type to the
    wrong validator, handler, resolver, params DTO, or result DTO.
-   The design must preserve support for pending, running, fulfilled, partial,
    and failed action states.
-   The design must work with multiphase results, including conventional
    `result.phases` data for action types that need it.
-   Existing unimplemented action types should still be representable without
    requiring all future DTOs to exist immediately.
-   Tests should cover valid DTO parsing, invalid params failures, typed
    dispatch to the correct validator and handler, resolver hydration from a
    persisted action record, and serialization compatibility with the existing
    REST payload shape.
