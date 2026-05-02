# Getting Started

Installing and initializing Helm on a WordPress host. For local development, see [docs/dev/getting-started.md](dev/getting-started.md).

## Requirements

-   WordPress 6.9
-   PHP 8.1+, MySQL 5.7+ / MariaDB 10.4+
-   [WP-CLI](https://wp-cli.org/) — initialization is CLI-only
-   [Composer](https://getcomposer.org/) and [Bun](https://bun.sh/) if you're building from source (not needed if you deploy a pre-built artifact with `vendor/` and `build/` included)

## Install

Place the repo at `wp-content/plugins/helm/`, then from that directory:

```bash
composer install --no-dev --optimize-autoloader
composer strauss      # prefixes vendored deps (DI52, StellarWP Models) — required
bun install && bun run build
wp plugin activate helm
```

Activation creates the custom tables and seeds the product + taxonomy catalogs from `data/*.json`.

## Initialize the Game World

Run in order:

```bash
wp helm origin init                               # set master seed (one-time)
wp helm star seed                                 # ~4k stars from the HYG catalog
wp helm ship create --name="Aurora" --owner=1     # first ship (no UI yet)
wp helm status                                    # sanity check
```

For reproducible worlds, pass an explicit seed: `wp helm origin init production --seed=<secret>`.

`wp helm db migrate` and `wp helm product seed` are run by the activation hook, so they're not needed on first install — only after upgrades that change the schema or `data/products/*.json`.

## Upgrades

```bash
composer install --no-dev --optimize-autoloader
composer strauss
bun install && bun run build    # if the frontend changed
wp helm db migrate              # if the schema changed
wp helm product seed            # if data/products/ changed
```

Both migrate and product seed are idempotent.

## Background Jobs

Helm uses Action Scheduler for async work (scans, travel, mining). The default WP-Cron — which fires on page loads — is not reliable enough for a game where ship actions resolve in real time. Configure a real cron:

```
* * * * * curl -s https://<your-site>/wp-cron.php >/dev/null 2>&1
```

And set `define('DISABLE_WP_CRON', true);` in `wp-config.php` so jobs don't also fire on page loads.
