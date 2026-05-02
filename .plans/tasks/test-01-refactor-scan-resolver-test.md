---
status: ready
area: testing
priority: p2
depends_on:
    - nav-08-track-edge-discoveries-per-player
---

# Refactor scan resolver test to stub navigation service

## Problem

`tests/Wpunit/ShipLink/Actions/ScanRoute/ResolverTest.php` exercises
`Resolver::handle` end-to-end against a real `NavigationService`, which
drives `NavComputer::scan` through `mt_rand`. The probabilistic hop
discovery means the resolver's output varies across runs. To stay green
the test guards every assertion behind
`if (! $action->result['success']) { $this->markTestSkipped(...); }`.

Two problems fall out of that.

First, the guard hides real regressions. A resolver change that broke
the success path would surface as a skip rather than a failure. The CI
signal becomes "either the scan didn't roll successfully or the
resolver works", which is not useful.

Second, the test conflates two contracts. What the test intends to
verify is the resolver's own behavior, namely that it takes a
`ScanResult` and populates `$action->result` with the right fields
(`nodes`, `edges`, `path`, `edges_discovered`, `waypoints_created`,
`success`, `complete`). What it actually exercises is the full
navigation graph. Failures in `NavComputer`, `NodeGenerator`, or the
node repository all surface here, even though those have their own
tests.

The navigation work in nav-08 already shipped a sibling test
(`UserEdgeUpsertTest`) that was rewritten to use
`Codeception\Stub::make` on `NavigationService::scan`. That established
the pattern and proved it works against the existing Codeception
tooling without new dependencies. `ResolverTest` is the next
application.

## Proposed solution

Rewrite `ResolverTest` so the resolver is tested in isolation from the
scan internals.

-   Stub `NavigationService::scan` to return a canned `ScanResult` with
    known nodes and edges, using `Codeception\Stub::make` the same way
    `UserEdgeUpsertTest` does.
-   Keep the real `Resolver`, the real action model, and real seed rows
    for any graph ids the canned result references.
-   Drop every `markTestSkipped` guard. The canned result makes the
    success path deterministic, so assertions either pass or fail
    honestly.
-   Cover the success-path result shape explicitly: each field the
    resolver writes on `$action->result` should have a matching assertion
    against the canned input. This is the contract the test is for.
-   Add a test for the failure branch that the old test never exercised.
    A `ScanResult::failure()` from the stub should leave
    `$action->result['success'] = false`, empty arrays where appropriate,
    and no side effects on downstream collaborators.

Constraints:

-   No new dev dependencies. Codeception's `Stub::make` is already
    available via wp-browser.
-   Do not change the resolver's production behavior. If the test is
    hard to write because the resolver has a design flaw, raise that as
    a separate task rather than papering over it.
-   If dropping `final` from `NavigationService` is still required for
    the stub to work (nav-08 already did this), re-verify it is still
    dropped and leave a comment on the class pointing at the test need.
