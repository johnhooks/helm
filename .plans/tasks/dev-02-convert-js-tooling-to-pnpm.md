---
status: draft
area: dev
priority: p1
---

# Convert JavaScript tooling to pnpm

## Problem

Helm still has mixed JavaScript tooling assumptions. The project has started to
move from Bun to pnpm, but the conversion happened in the middle of unrelated
work and is not yet complete. Some scripts, release steps, Playwright setup, and
documentation still reference Bun, bunx, npm, or npx.

The project should not depend on Bun as a required runtime or package manager.
Reducing that dependency narrows the trusted toolchain, keeps installs aligned
with the broader Node ecosystem, and lets the project use pnpm's stricter and
more reproducible dependency behavior. It also avoids leaving future developers
with ambiguous setup instructions where some commands use pnpm and others still
require Bun.

## Proposed solution

Make pnpm the single JavaScript package manager for Helm. The repository should
install, build, test, lint, run Storybook, run Playwright, and build releases
through pnpm-managed dependencies. The root package metadata, workspace config,
lockfile, CI workflow, release script, and docs should all agree on pnpm.

Remove the Bun lockfile and replace Bun-specific commands with pnpm equivalents.
Where code currently depends on Bun runtime APIs, such as file or process helpers
in local CLI tooling, convert that code to Node-compatible APIs so those tools
can run without Bun installed. Workbench and benchmark commands should remain
available through the existing root scripts, but they should not require Bun as
the runtime.

Keep install behavior security-focused. Installs should use the pnpm lockfile,
run with frozen lockfiles in CI and release builds, and avoid lifecycle scripts
unless a specific audited script is intentionally required. Documentation should
show pnpm commands consistently and should not suggest npm, npx, yarn, or Bun as
normal project workflows.

## Requirements

-   `pnpm install --frozen-lockfile --ignore-scripts` succeeds from a clean
    checkout.
-   CI uses pnpm for JavaScript dependency installation and commands.
-   Release builds use pnpm and do not require Bun.
-   Playwright web server setup does not use bunx.
-   Root scripts for build, dev, lint, typecheck, tests, Storybook, workbench,
    and benchmarks run through pnpm-managed tools.
-   Bun-specific runtime APIs in project-owned JavaScript or TypeScript code are
    replaced with Node-compatible APIs.
-   `bun.lock` is removed and `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and pnpm
    package manager metadata are committed.
-   Documentation consistently uses pnpm for JavaScript commands.
-   Tests or checks cover the converted commands enough to prove the toolchain
    no longer requires Bun.
