# Project Structure

## Overview

```
helm/
├── src/Helm/                  # PHP source (PSR-4: Helm\)
├── resources/packages/        # JavaScript monorepo (Bun workspaces)
├── tests/                     # PHP tests (WP-Browser)
├── tests-e2e/                 # Playwright E2E tests
├── docs/                      # Documentation
├── build/                     # Compiled assets (generated)
├── vendor/                    # Composer dependencies (generated)
├── node_modules/              # Bun dependencies (generated)
├── composer.json              # PHP dependencies
├── package.json               # Bun workspace root
├── phpstan.neon               # Static analysis config
├── codeception.yml            # WP-Browser config
├── playwright.config.ts       # E2E config
└── helm.php                   # Plugin bootstrap
```

## PHP Structure

### Entry Point

```
helm.php                       # Plugin bootstrap, helm() function
```

The `helm()` function returns the DI container singleton, or resolves a class:

```php
helm();                        // Returns Helm instance (container)
helm(SomeClass::class);        // Resolves SomeClass from container
```

### Source Directory

```
src/Helm/
├── Helm.php                   # Main class, wraps DI52 container
├── Contracts/                 # Shared interfaces
│   └── ...
├── Lib/                       # Shared utilities
│   └── ...
├── Rest/                      # Shared REST infrastructure
│   └── ...
├── ShipLink/                  # Hardware abstraction layer
│   ├── Contracts/             # Hardware interfaces
│   │   ├── ShipLinkContract.php
│   │   ├── PowerSystemContract.php
│   │   ├── PropulsionContract.php
│   │   └── ...
│   └── Provider.php           # ShipLink service provider
├── Simulation/                # Simulated ShipLink implementation
│   ├── SimulatedShipLink.php  # Main simulation class
│   ├── State/                 # State management
│   ├── Tick/                  # Tick processing
│   └── Provider.php           # Binds Simulation to ShipLink contracts
└── Systems/                   # Ship systems (domains)
    ├── Power/
    ├── Propulsion/
    ├── Shields/
    ├── Sensors/
    ├── Tactical/
    ├── LifeSupport/
    ├── Communications/
    └── Engineering/
```

### System Structure

Each system in `Systems/` is a self-contained domain:

```
Systems/Power/
├── Provider.php               # Service provider (registers hooks, DI)
├── Contracts/                 # System-specific interfaces
│   └── PowerManagerContract.php
├── PowerManager.php           # Main system logic
├── Rest/                      # System REST controllers
│   └── PowerController.php
├── CLI/                       # System CLI commands
│   └── PowerCommand.php
└── Listeners/                 # Event listeners
    └── ...
```

Each Provider registers:
- Service bindings
- WordPress hooks/filters
- REST routes
- CLI commands
- Action Scheduler jobs

### Service Providers

Providers extend DI52's ServiceProvider:

```php
namespace Helm\Systems\Power;

use lucatume\DI52\ServiceProvider;

class Provider extends ServiceProvider {
    public function register(): void {
        // Bind interfaces to implementations
    }

    public function boot(): void {
        // Register hooks, routes, CLI
    }
}
```

The main Helm class loads providers on `plugins_loaded`.

## JavaScript Structure

### Bun Workspaces

```
resources/packages/
├── lcars/                     # UI component library
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # React hooks
│   │   ├── styles/            # LCARS styles/tokens
│   │   └── index.ts           # Public exports
│   ├── package.json
│   └── tsconfig.json
└── bridge/                    # Main admin application
    ├── src/
    │   ├── pages/             # Bridge pages/views
    │   ├── features/          # Feature modules
    │   └── index.tsx          # App entry
    ├── package.json
    └── tsconfig.json
```

### Package Responsibilities

**lcars** - Standalone UI library:
- LCARS design tokens (colors, typography, spacing)
- React components (buttons, panels, displays, meters)
- No WordPress dependencies
- Could be published to npm independently

**bridge** - WordPress admin application:
- Uses lcars components
- WordPress script dependencies
- REST API integration
- Built with wp-scripts

### Build

Root `package.json` orchestrates builds:

```json
{
  "workspaces": ["resources/packages/*"],
  "scripts": {
    "build": "wp-scripts build",
    "dev": "wp-scripts start",
    "test": "vitest"
  }
}
```

## Test Structure

### PHP Tests (WP-Browser)

```
tests/
├── Wpunit/                    # WordPress unit tests
│   ├── Systems/               # Tests per system
│   │   ├── Power/
│   │   ├── Shields/
│   │   └── ...
│   ├── Simulation/            # Simulation tests
│   ├── ShipLink/              # ShipLink contract tests
│   └── _bootstrap.php
├── Support/                   # Test helpers
│   ├── WpunitTester.php
│   └── Helper/
├── Wpunit.suite.yml
└── _output/
```

Run with slic:
```bash
slic run wpunit
```

### JavaScript Tests (Vitest)

Tests live alongside source in each package:

```
resources/packages/lcars/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx    # Co-located test
```

Run with:
```bash
bun run test
```

### E2E Tests (Playwright)

```
tests-e2e/
├── fixtures/                  # Test fixtures
├── pages/                     # Page objects
├── specs/                     # Test specs
│   ├── bridge.spec.ts
│   └── systems.spec.ts
└── playwright.config.ts
```

Run with:
```bash
bun run test:e2e
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Bridge (JS/React)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                         REST API
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Systems (PHP)                            │
│              Power, Shields, Propulsion, etc.               │
└─────────────────────────────────────────────────────────────┘
                              │
                      ShipLink Contracts
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Simulation (PHP)                         │
│         wp_options, timestamp math, Action Scheduler        │
└─────────────────────────────────────────────────────────────┘
```

## Dependencies

### Composer (PHP)

```json
{
  "require": {
    "php": "^8.1",
    "lucatume/di52": "^3.0",
    "woocommerce/action-scheduler": "^3.0"
  },
  "require-dev": {
    "lucatume/wp-browser": "^3.0",
    "phpstan/phpstan": "^1.0"
  }
}
```

### Bun (JavaScript)

```json
{
  "devDependencies": {
    "@wordpress/scripts": "^27.0",
    "vitest": "^1.0",
    "@playwright/test": "^1.0",
    "typescript": "^5.0"
  }
}
```

## Autoloading

PSR-4 autoloading in composer.json:

```json
{
  "autoload": {
    "psr-4": {
      "Helm\\": "src/Helm/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "Tests\\": "tests/"
    }
  }
}
```
