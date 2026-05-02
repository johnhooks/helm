# Helm

**A starship operating system built on WordPress.**

Yes, you read that correctly. No, we will not be taking questions at this time.

## What Is This

Helm is a slow, asynchronous space exploration game where WordPress is the game server. Players are WordPress users. Ships are data. Actions take real time — scans take hours, travel takes days. You check in between meetings, before bed, over morning coffee. "What did my ship find?"

Think: a quiet, patient space MMO for people who look at `wp_options` and see a ship's navigational state.

If Eve Online and a WordPress plugin had a baby, and that baby was raised by the Bobiverse books with Murderbot's enthusiasm for social interaction — that's roughly the vibe. Except the baby runs on PHP 8.1 and uses Action Scheduler for warp field processing.

We are aware this is ambitious. We are aware WordPress was designed for blog posts, not interstellar economies. We consider this a feature, not a bug.

## The Lore (Briefly)

It's 2126. Turns out the topology of subspace maps precisely onto WordPress's hook system. `do_action()` and `apply_filters()` aren't just function calls — they're descriptions of how spacetime behaves when you push it hard enough.

The first warp drives were literally WordPress installations with expensive hardware accelerators. The navigation system was a custom post type. When a committee tried to rewrite the warp system in clean, modern code, the test ship disappeared and never came back.

The universe, apparently, is a legacy codebase.

Warp-capable ships are called "jacks." You jack in via subspace FTL, and your ship is your body — cameras for eyes, sensors for ears. When you disconnect, the AI crew keeps working. "Shared hosting" means your ship is in a fleet. "Dedicated hosting" means your own warp core. The jokes write themselves. The hosting companies became empires and they _don't like being called megacorps_ but everyone calls them megacorps anyway.

For the full story (it involves an intern, three energy drinks, and a four-millimeter wormhole): see [docs/lore.md](docs/lore.md).

## What It Actually Does (So Far)

This is a WordPress plugin. It currently has:

-   **Ship systems** — self-contained domains (navigation, sensors, shields) accessed through a hardware abstraction layer called ShipLink
-   **Timestamp-based state** — ship state computed on demand from "last known value + elapsed time," not ticked
-   **Action processing** — async actions that validate, execute, and resolve over real time via cron
-   **Procedural generation** — deterministic star systems from seeds, because the same seed should always produce the same universe
-   **An LCARS-inspired UI** — because if you're going to do this, you should _commit_
-   **REST API** — PHP and JS communicate exclusively through REST, like civilized systems that don't share a runtime
-   **A test suite** — we are reckless, not irresponsible

## The Tech

-   PHP 8.1+ / WordPress 6.9
-   TypeScript / React
-   Bun workspaces
-   Action Scheduler for background jobs
-   WP-Browser + slic for testing
-   Vitest + Playwright
-   An unreasonable amount of design documentation for a project at this stage

## Status

**This is a work in progress.** Very early. The kind of early where "it works on my machine" is a generous assessment and "it" is loosely defined.

What you're looking at is the first steps toward the WordPress-controlled spaceship future. The foundation is being laid. The architecture is being argued about. The lore document is longer than the actual codebase and we're not sorry about that.

If this sounds interesting to you — if the phrase "space economy MMO on WordPress" makes you smile instead of wince — pull up a chair. The devoted are always accepting pull requests.

## Getting Started

-   [docs/getting-started.md](docs/getting-started.md) — installing Helm on a WordPress host and initializing a game world.
-   [docs/dev/getting-started.md](docs/dev/getting-started.md) — setting up a local development environment (including the Lando setup we use).

## License

GPL-2.0-or-later. Because warp drive is open source and you can't patent faster-than-light travel.
