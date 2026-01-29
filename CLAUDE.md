# Helm

Starship Operating System built on WordPress.

## What This Is

Helm is the software infrastructure for operating a multi-crew starship. WordPress provides the foundation: mature codebase, extensible architecture, role-based access, REST API for system integration.

The simulation is written as if the ship is real. The architecture doesn't know otherwise.

## Core Concepts

### ShipLink

ShipLink is the hardware abstraction layer. **All ship state is accessed through ShipLink.** Systems never touch storage directly.

```php
// Systems use ShipLink contracts
$shields = helm(ShipLinkContract::class)->getShieldStrength();

// DI provides the implementation (Simulation now, real hardware later)
```

### Simulation

The Simulation implements ShipLink contracts using WordPress data structures:
- `wp_options` for ship state
- Timestamp-based calculation (state is computed on demand)
- Action Scheduler for background tick processing

When real hardware exists, a different ShipLink implementation replaces Simulation.

### Systems

Ship systems are self-contained domains in `src/Helm/Systems/`. Each system:
- Has its own `Provider.php` (service provider)
- Registers its own hooks, REST routes, CLI commands
- Uses ShipLink for all state access
- Knows nothing about storage implementation

### Timestamp-Based State

State is calculated from "last known value + elapsed time":
```
current_shields = last_shields + (elapsed_seconds * regen_rate)
```

This means state is always accurate on-demand. The tick's job is to:
- Handle complex interactions
- Fire threshold events
- Write checkpoints

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
# PHP
composer install
composer test              # Run Wpunit tests
composer analyse           # PHPStan

# JavaScript
bun install
bun run build              # wp-scripts build
bun run dev                # wp-scripts start
bun run test               # Vitest

# E2E
bun run test:e2e           # Playwright

# WordPress CLI (future)
wp helm status             # Ship status
wp helm power:status       # Power systems
```

## Container Access

The `helm()` function is the entry point:

```php
// Get the container
$container = helm();

// Resolve a class
$shields = helm(ShieldsSystem::class);
```

## Development Principles

1. **Ship state through ShipLink** - Never access storage directly from Systems
2. **Systems are self-contained** - Each domain has its own provider, routes, CLI
3. **Simulation is realistic** - Timing, power budgets, failure modes
4. **WordPress-native** - Use WP patterns, don't fight the platform
5. **Contracts first** - Interfaces before implementations
6. **PHP and JS are separate** - They communicate via REST API only
