# Helm

A slow, asynchronous space exploration game built on WordPress.

## What This Is

Helm is a space MMO where WordPress is the game server. Players are WordPress users. Ships are player-owned entities stored as data. The game runs on a single WordPress instance (the "Origin") that tracks all state, processes work, and manages the economy.

Actions take real time. Scans take hours. Travel takes days. You check in between meetings, before bed, over morning coffee. "What did my ship find?"

The architecture supports future federation (multiple Origins with trade deals), but current focus is single-Origin multiplayer.

For the full vision, see `docs/vision.md`. For the lore, see `docs/lore.md`.

## Core Concepts

### Origin

The Origin is the game server - a WordPress instance running Helm. It holds all truth:
- Processes work units (scans, mining, travel)
- Stores game state (ships, items, maps)
- Manages the economy (credits, trades)
- Runs procedural generation
- Tracks discoveries and ownership

### Ships

Ships belong to WordPress users. A ship is data, not infrastructure. Players issue commands through the UI, Origin processes them over time, players check back for results.

### ShipLink

ShipLink is the abstraction layer for ship state. **All state is accessed through ShipLink contracts.** Systems never touch storage directly.

```php
$shields = helm(ShipLinkContract::class)->getShieldStrength();
```

### Simulation

The Simulation implements ShipLink using WordPress data structures:
- `wp_options` for state storage
- Timestamp-based calculation (state computed on demand)
- Action Scheduler for background processing

### Systems

Ship systems are self-contained domains in `src/Helm/Systems/`. Each system:
- Has its own `Provider.php` (service provider)
- Registers hooks, REST routes, CLI commands
- Uses ShipLink for all state access
- Knows nothing about storage

### Timestamp-Based State

State is calculated from "last known value + elapsed time":
```
current_shields = last_shields + (elapsed_seconds * regen_rate)
```

State is always accurate on-demand. Background ticks handle complex interactions and fire threshold events.

## Tech Stack

### PHP
- PHP 8.1+
- WordPress 6.4+
- DI52 container (lucatume/di52)
- Action Scheduler for background jobs
- WP-CLI for ship operations

### JavaScript
- Bun (package management, workspaces)
- wp-scripts (build)
- TypeScript
- React
- Vitest (testing)
- LCARS design system

### Testing
- PHP: WP-Browser + slic (Wpunit tests)
- JS: Vitest
- E2E: Playwright

## Project Structure

See `docs/structure.md` for full details.

```
helm/
├── src/Helm/
│   ├── Contracts/         # Shared interfaces
│   ├── Lib/               # Shared utilities
│   ├── Rest/              # Shared REST infrastructure
│   ├── ShipLink/          # Hardware abstraction (contracts)
│   ├── Simulation/        # Simulated ShipLink (WP storage)
│   └── Systems/           # Ship systems (domains)
├── resources/packages/    # Bun workspaces (JS)
│   ├── lcars/             # UI component library
│   └── bridge/            # Admin application
├── tests/Wpunit/          # PHP tests
├── tests-e2e/             # Playwright tests
└── helm.php               # Plugin bootstrap
```

## Commands

```bash
# Install dependencies
composer install
bun install

# Linting
composer analyse           # PHPStan static analysis
composer lint              # PHP_CodeSniffer (WPCS)
composer lint:fix          # Auto-fix PHP linting issues
bun run lint:js            # ESLint for JS/TS
bun run lint:style         # Stylelint for CSS
bun run lint:fix           # Auto-fix JS linting issues
bun run format             # Prettier formatting
bun run check-types        # TypeScript type checking

# Testing
composer test              # Full PHP suite (analyse + lint + Wpunit)
composer test:unit         # Wpunit tests only
composer test:coverage     # Wpunit with coverage report
bun run test               # Vitest (JS unit tests)
bun run test:watch         # Vitest in watch mode
bun run test:coverage      # Vitest with coverage
bun run test:e2e           # Playwright E2E tests
bun run test:e2e:ui        # Playwright with UI
bun run test:e2e:headed    # Playwright in headed mode

# Development
bun run dev                # wp-scripts start (watch mode)
bun run build              # wp-scripts build (production)
bun run storybook          # Component development UI
```

Note: PHP tests run via [slic](https://github.com/developer-toolbelt/slic) for WordPress integration.

## Container Access

The `helm()` function is the entry point:

```php
// Get the container
$container = helm();

// Resolve a class
$shields = helm(ShieldsSystem::class);
```

## Development Principles

1. **State through ShipLink** - Never access storage directly from Systems
2. **Systems are self-contained** - Each domain has its own provider, routes, CLI
3. **WordPress-native** - Use WP patterns, don't fight the platform
4. **Contracts first** - Interfaces before implementations
5. **PHP and JS are separate** - They communicate via REST API only
6. **Deterministic generation** - Same seed = same content (enables future federation)

## Documentation

- `docs/vision.md` - Full game design and architecture
- `docs/lore.md` - Worldbuilding and backstory
- `docs/federation.md` - Multi-Origin protocol (future)
- `docs/structure.md` - Project structure details
