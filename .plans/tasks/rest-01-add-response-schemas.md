---
status: ready
area: rest
priority: p2
---

# Add response schemas to REST controllers

## Problem

None of the REST controllers in `src/Helm/Rest/` register a response
schema. Request-side arguments are validated consistently across every
route with `type`, `enum`, `minimum`, and `maximum` definitions, but the
shape of every response body is undocumented to the WP REST server. A
grep for `schema`, `get_item_schema`, or a `schema` key on any
`register_rest_route` call returns zero matches across the entire REST
surface.

The cost of not having schemas is low today because the only client is
the in-house TypeScript frontend, and its types document the expected
shapes well enough for the humans working on both sides. But several
WP-native features that the REST endpoints could otherwise pick up for
free are silently missing.

-   OPTIONS discovery at `/wp-json/helm/v1` returns empty resource
    descriptions, so tooling that walks the API to generate clients,
    documentation, or exploration UIs has nothing to work with.
-   `_fields` filtering on list responses cannot prune safely, because WP
    has no declared field list to reconcile against. Clients that want a
    slimmer payload have to read the full response and drop fields
    themselves.
-   Any third party that later wants to build against Helm has to read
    controller source code rather than discovering the shape through the
    API itself. That's a friction wall against future ecosystem work.
-   Response-body contract drift cannot be caught by WP's own validation.
    A serialize method that changes a field's type goes unnoticed until a
    test or client breaks.

The navigation task list already has cases that would benefit. Nav-06
would prefer to consume a documented `/edges` response than a hand-rolled
TS interface. A future admin surface over the same edges endpoint needs
a clear contract for which fields widen under elevated capabilities.

## Proposed solution

Register a response schema for every controller's resource and wire it
into `register_rest_route`. Each controller defines the canonical shape
of its resource once, references it from every route that returns that
resource, and the WP REST server picks up OPTIONS discovery and
`_fields` filtering automatically.

-   Every controller in `src/Helm/Rest/` exposes a resource schema.
    Nodes, Ships, Ship systems, Ship actions, Products, and Edges are all
    in scope. The schema is the controller's responsibility and lives
    next to its serialize method so the two cannot drift.
-   Route registrations pass the schema via the `schema` key on
    `register_rest_route`, not via ad-hoc array literals inside
    controller methods. Shared fragments like rest links or embeds are
    factored so they can be referenced from more than one resource
    without duplication.
-   Schemas mirror the current JSON exactly. This task is a retrofit, not
    a redesign. No field is renamed, no type narrows, no property moves.
    If the current shape has an inconsistency worth fixing, raise it as
    a separate follow-up.
-   Test coverage grows only to the point of catching drift. A test per
    controller that asserts the serialize output validates against the
    declared schema is enough. Each resource's example row is already
    covered in the existing controller tests and can be reused.
-   Adding a schema must not change the wire format of any response.
    Existing WPUnit tests for each controller must pass unchanged.

Constraints:

-   Treat this as a single atomic change across the REST surface. A
    partial rollout where only some controllers publish schemas is worse
    than none, because it implies coverage that does not exist.
-   Do not introduce new dependencies. WP's own JSON Schema support is
    sufficient for the current need. Dedicated tooling like OpenAPI or
    `wp-api-parser` integration is out of scope and can live in a later
    task if the need arises.
-   Schemas describe the response body only. Input validation already
    lives in the `args` array on each route and is not touched here.

## Follow-ups unblocked

-   A dedicated task to generate OpenAPI or similar external
    documentation artifacts from the schemas.
-   Client-side codegen or runtime validation, once a stable contract
    exists to build against.
-   Admin-wide widening of scoped endpoints, where the schema can express
    which fields surface only for elevated capabilities.
