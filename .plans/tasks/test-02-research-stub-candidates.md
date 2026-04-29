---
status: blocked
area: testing
priority: p3
depends_on:
  - test-01-refactor-scan-resolver-test
blocked_by: test-01 should land first so this research can evaluate the established stub pattern.
---

# Research stub mocking for NavigationService and ActionProcessor tests

## Problem

Two test files stand out as likely candidates for the stub pattern
established in nav-08 and followed up in test-01, but the payoff is not
yet known.

- `tests/Wpunit/Navigation/NavigationServiceTest.php` drives
  `NavigationService` against real repositories and a real
  `NavComputer`. Some of those tests may already be flaky for the same
  RNG reasons `UserEdgeUpsertTest` was, and some may just be slow
  because they create large seed graphs to steer the scan into a
  specific branch.
- `tests/Wpunit/ShipLink/ActionProcessorTest.php` instantiates a deep
  collaborator chain to test the processor's own orchestration.
  Stubbing individual action handlers would let the test focus on
  "processor calls the right handler at the right time" rather than
  "the handler also does the right thing", which is covered elsewhere.

What is missing is a decision. Both files could benefit in principle.
Neither has been read closely enough to know whether the win is large
enough to justify dropping `final` from more production classes, or
whether the existing tests are already fine for what they are.

Without that read, future test work in these areas will either keep
the status quo by default or get refactored piecemeal when someone
happens to be in the file, which is the worst of both worlds.

## Proposed solution

Produce a short written assessment of each file that answers:

- Does the current test have actual flakiness, slowness, or
  diagnostic failure in practice, or is it only theoretically
  improvable?
- Which collaborator would need to become stubbable for the pattern to
  apply, and would dropping `final` on it be reasonable?
- What new test coverage becomes possible that is currently hidden
  behind "it is too expensive to set up that branch"?
- Is the payoff big enough to justify the refactor, or is the test
  fine as it stands?

The output is not the refactor itself. The output is one follow-up
task per file that is worth doing, with a clear problem statement and
the scope of the refactor, or an explicit "leave this alone" with the
reasoning recorded so the question does not keep coming back.

Constraints:

- Bias toward "leave it alone" unless the win is concrete. Speculative
  "could be cleaner" is not enough.
- Do not write production code changes as part of this task. The
  research produces tasks, not commits.
- Re-use the pattern from test-01 (stub the collaborator, keep the
  real unit under test, keep real data where assertions need it) as
  the reference. If an assessment proposes something different,
  explain why.
