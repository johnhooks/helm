# Getting Started

This guide covers installing Helm, setting up a development environment, and initializing a game world.

## Prerequisites

- PHP 8.1+
- [Bun](https://bun.sh/) (JavaScript package manager)
- A local WordPress installation (e.g. [LocalWP](https://localwp.com/), wp-env, or manual)
- [slic](https://github.com/developer-toolbelt/slic) (Docker-based WordPress test runner)
- WP-CLI

## Install Dependencies

```bash
# PHP
composer install

# Vendor prefixing (DI52, StellarWP Models)
composer strauss

# JavaScript (Bun workspaces)
bun install
```

## Build the Frontend

```bash
# Development (watch mode)
bun run dev

# Production build
bun run build
```

The build compiles the React/TypeScript packages in `resources/packages/` via wp-scripts. The compiled output lands in `build/` and is enqueued by the plugin automatically.

## Activate the Plugin

Link or copy the `helm/` directory into your WordPress `wp-content/plugins/` directory, then activate it:

```bash
wp plugin activate helm
```

## Initialize the Game World

These WP-CLI commands must be run in order. Each step depends on the previous one.

### 1. Migrate the Database

Creates all custom tables (`helm_ship_state`, `helm_nav_nodes`, `helm_inventory`, etc.):

```bash
wp helm db migrate
```

### 2. Initialize the Origin

The Origin is the game universe. This is a one-time operation that sets the master seed for all deterministic generation:

```bash
wp helm origin init
```

You can optionally provide a named world and/or a specific seed for reproducibility:

```bash
wp helm origin init alpha --seed=my-secret-seed
```

### 3. Seed the Star Catalog

Imports ~4,000 stars (within 100 light years of Sol) from the HYG Database into WordPress:

```bash
wp helm star seed
```

### 4. Create a Ship

There is no frontend for ship creation yet, so ships must be created via WP-CLI. This provisions a full loadout (core, drive, sensors, shields, nav computer) and initial state:

```bash
wp helm ship create --name="Aurora" --owner=1
```

### 5. Check Status

```bash
wp helm status
```

Shows Origin status, star/planet counts, ship count, and generation progress.

## Testing

### PHP (wp-browser via slic)

slic runs WordPress integration tests inside Docker with a real MariaDB database. One-time setup:

```bash
cd ~/Projects
slic here
slic use helm
```

Then from the plugin directory:

```bash
composer test              # PHPStan + PHPCS + Wpunit
composer test:unit         # Wpunit only
composer test:coverage     # Wpunit with HTML coverage

# Filter to a specific test class
slic run "Wpunit --filter ShipCommandTest"
```

### JavaScript (Vitest)

```bash
bun run test              # run once
bun run test:watch        # watch mode
bun run test:coverage     # with coverage
```

### E2E (Playwright)

```bash
bun run test:e2e          # headless
bun run test:e2e:headed   # with visible browser
bun run test:e2e:ui       # interactive UI mode
```

## Linting & Static Analysis

```bash
# PHP
composer analyse           # PHPStan
composer lint              # PHPCS (WordPress coding standards)
composer lint:fix          # auto-fix

# JavaScript
bun run lint:js            # ESLint
bun run lint:style         # Stylelint
bun run lint:fix           # auto-fix
bun run format             # Prettier
bun run check-types        # TypeScript
```

## Storybook

Component development UI for the LCARS design system:

```bash
bun run storybook
```

## Quick Reference

| Step | Command | When |
|------|---------|------|
| Install PHP deps | `composer install && composer strauss` | Once |
| Install JS deps | `bun install` | Once |
| Build frontend | `bun run build` | Once / after changes |
| Activate plugin | `wp plugin activate helm` | Once |
| Migrate database | `wp helm db migrate` | Once / after schema changes |
| Init Origin | `wp helm origin init` | Once per world |
| Seed stars | `wp helm star seed` | Once per world |
| Create a ship | `wp helm ship create --name="Test" --owner=1` | As needed (CLI only) |
| Run PHP tests | `composer test:unit` | During development |
| Run JS tests | `bun run test` | During development |
| Dev server | `bun run dev` | During development |
