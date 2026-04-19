#!/usr/bin/env bash
set -euo pipefail

# Bring the slic stack into the state tests expect.
# Run after `slic restart`, `slic reset-wp`, or on a fresh machine.
# Safe to re-run; every step is idempotent.
#
# In CI, the slic binary lives at a checkout path; set SLIC_BIN to that path
# before calling this script. Locally, the unset case falls back to `slic`
# on PATH.

WP_VERSION="6.9"
SLIC="${SLIC_BIN:-slic}"

$SLIC use helm

current=$($SLIC wp core version 2>/dev/null || echo "")
current="${current//[[:space:]]/}"

if [[ -n "$current" && "$current" == "${WP_VERSION}"* ]]; then
  echo "WordPress $current already matches $WP_VERSION series, skipping update."
else
  echo "Updating WordPress: ${current:-<none>} -> $WP_VERSION"
  $SLIC wp core update --version="$WP_VERSION" --force
  $SLIC wp core update-db
fi

$SLIC wp core version
$SLIC composer install
$SLIC composer strauss

echo "slic is ready. Run tests with: $SLIC run Wpunit"
