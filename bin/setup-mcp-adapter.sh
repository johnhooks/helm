#!/usr/bin/env bash
set -euo pipefail
cd /app
if [ "$(wp eval 'echo wp_get_environment_type();')" != local ]; then
  echo 'MCP setup requires WP_ENVIRONMENT_TYPE=local.' >&2
  exit 1
fi
wp eval 'if (! function_exists("wp_get_ability")) { WP_CLI::error("WordPress 6.9 or newer is required."); }'
version=0.7.0
installed=$(wp plugin get mcp-adapter --field=version 2>/dev/null || true)
if [ "$installed" != "$version" ]; then
  wp plugin install "https://github.com/WordPress/mcp-adapter/releases/download/v${version}/mcp-adapter.zip" --force
fi
wp plugin activate mcp-adapter
wp config set HELM_MCP_ENABLED true --raw
wp config set WP_DEBUG_DISPLAY false --raw
wp eval-file /app/wp-content/plugins/helm/bin/provision-mcp-credentials.php "${1:-admin}"
