---
name: helm-test
description: Use when the user wants to run, choose, or interpret Helm test and check commands across the PHP, JavaScript, TypeScript, or Playwright toolchains.
---

# Running Tests and Checks

Helm has parallel PHP and JS toolchains. PHP runs under WordPress via slic (Docker). JS runs directly via Vitest and Playwright.

## PHP

PHP tests use Codeception through wp-browser, executed with [slic](https://github.com/developer-toolbelt/slic). `slic run` is a thin wrapper around `codecept run`, so any `codecept run` syntax works.

### Codeception run syntax

```
codecept run [options] [--] [<suite> [<test>]]
```

The `<test>` argument is a path relative to the suite directory (`tests/Wpunit/`), optionally followed by `:methodName`.

```bash
slic run Wpunit                                                 # all Wpunit tests
slic run Wpunit ShipLink                                        # a directory
slic run Wpunit ShipLink/HexCoordinateTest.php                  # a single file
slic run Wpunit ShipLink/HexCoordinateTest.php:testDistanceCalculation # a single method
slic run Wpunit --filter=testDistance                           # filter by name pattern
slic run Wpunit --group=slow                                    # run a Codeception group
slic run Wpunit --debug                                         # verbose scenario output
slic cc build                                                   # rebuild Codeception actors after changing test helpers
```

One-time slic setup from `~/Projects`: `slic here && slic use helm`. After that, `slic run` works from the project directory.

### PHP static analysis and linting

```bash
composer analyse   # PHPStan
composer lint      # PHPCS
composer lint:fix  # PHPCBF (auto-fix)
```

These run PHP binaries directly with no Docker dependency, so they work anywhere Composer is installed.

## JavaScript and TypeScript

```bash
bun run test          # Vitest unit tests
bun run test:watch    # Vitest watch mode
bun run check-types   # tsc --noEmit
bun run lint:js       # ESLint
bun run lint:fix      # ESLint auto-fix
```

## End-to-End

Playwright runs against a Vite dev server. It does not need a running WordPress instance.

```bash
bun run test:e2e         # headless
bun run test:e2e:ui      # interactive UI
bun run test:e2e:headed  # headed browser
bun run test:e2e:debug   # Playwright inspector
bun run test:e2e:report  # open last report
```

## Full Check Before Commit

Run PHP static checks, PHP unit tests, then JS checks and unit tests:

```bash
composer analyse && composer lint && slic run Wpunit && bun run check-types && bun run lint:js && bun run test
```

Run Playwright separately when UI behavior changed.
