# Developer Getting Started

For deploying to a server, see [docs/getting-started.md](../getting-started.md). This doc is for contributors.

## Requirements

- WordPress 6.9
- PHP 8.1+, MySQL 5.7+ / MariaDB 10.4+
- [Composer](https://getcomposer.org/), [WP-CLI](https://wp-cli.org/), [Bun](https://bun.sh/)
- [slic](https://github.com/developer-toolbelt/slic) — for the PHP test suite

Use whatever local WordPress setup you prefer. The core contributors use Lando ([setup below](#local-development-with-lando)).

## Setup

Clone, symlink into `wp-content/plugins/helm/`, then:

```bash
composer install
composer strauss      # prefixes vendored deps (DI52, StellarWP Models) — required
bun install
bun run dev           # watch-mode frontend build
```

In another shell:

```bash
wp plugin activate helm
wp helm origin init
wp helm star seed
wp helm ship create --name="Aurora" --owner=1
```

Plugin activation creates the schema and seeds products + taxonomies; don't run `wp helm db migrate` or `wp helm product seed` unless you've changed the schema or `data/products/*.json`. See [docs/getting-started.md](../getting-started.md#initialize-the-game-world) for what each command does.

## Local Development with Lando

The repo ships a `.lando.yml` that provides Apache + PHP 8.1, MariaDB, Mailhog, and phpMyAdmin without installing PHP, Composer, or WP-CLI on the host. Optional but recommended.

```bash
lando start
```

First start runs `bin/install-wp.sh` (via `post-start`), which downloads WordPress into `./tmp/wordpress/`, creates `wp-config.php`, installs WP at `https://helm.lndo.site`, runs `composer install && composer strauss`, and activates the plugin.

Admin login: `admin` / `password`. Mailhog at `mail.helm.lndo.site`, phpMyAdmin at `pma.helm.lndo.site`.

Prefix `wp` and `composer` commands with `lando ` — they run inside the appserver:

```bash
lando wp helm origin init
lando composer test:unit
```

Bun runs on the host, so `bun install` / `bun run dev` stay unprefixed.

### If something breaks

- `wp: not found` inside the container — `lando rebuild -y`, then `lando install-wp`.
- Install incomplete — `lando install-wp` is idempotent.
- Start over — `lando stop`, `rm -rf tmp/wordpress/`, `lando start`.

## Testing

### PHP (wp-browser via slic)

One-time slic setup:

```bash
cd ~/Projects && slic here && slic use helm
```

Then, from the plugin directory:

```bash
composer test                                   # PHPStan + PHPCS + Wpunit
composer test:unit                              # Wpunit only
slic run "Wpunit --filter ShipCommandTest"      # single test class
```

Rebuild Codeception actor classes after changing test helpers: `slic cc build`.

### JavaScript

```bash
bun run test            # Vitest
bun run test:e2e        # Playwright
```

## Linting

```bash
composer analyse        # PHPStan
composer lint           # PHPCS (WordPress coding standards)
bun run lint:js         # ESLint
bun run check-types     # TypeScript
```

All have `:fix` variants where applicable.

## Storybook

```bash
bun run storybook
```
