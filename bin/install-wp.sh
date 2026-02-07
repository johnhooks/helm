#!/usr/bin/env bash
set -euo pipefail

SITE_URL="https://helm.lndo.site"
SITE_TITLE="Helm"
ADMIN_USER="admin"
ADMIN_PASS="password"
ADMIN_EMAIL="admin@lndo.site"
WP_DIR="/app"
PLUGIN_DIR="/app/wp-content/plugins/helm"

# ------------------------------------------------------------------
# Download WordPress if not present
# ------------------------------------------------------------------
if [ ! -f "$WP_DIR/wp-includes/version.php" ]; then
  echo "Downloading WordPress..."
  wp core download --path="$WP_DIR" --skip-content
fi

# ------------------------------------------------------------------
# Create wp-config.php if missing
# ------------------------------------------------------------------
if [ ! -f "$WP_DIR/wp-config.php" ]; then
  echo "Creating wp-config.php..."
  wp config create \
    --path="$WP_DIR" \
    --dbname=wordpress \
    --dbuser=wordpress \
    --dbpass=wordpress \
    --dbhost=database \
    --skip-check

  wp config set WP_DEBUG true --raw --path="$WP_DIR"
  wp config set WP_DEBUG_LOG true --raw --path="$WP_DIR"
  wp config set WP_DEBUG_DISPLAY true --raw --path="$WP_DIR"
  wp config set SCRIPT_DEBUG true --raw --path="$WP_DIR"
  wp config set WP_ENVIRONMENT_TYPE 'local' --path="$WP_DIR"
fi

# ------------------------------------------------------------------
# Install WordPress if not already installed
# ------------------------------------------------------------------
if ! wp core is-installed --path="$WP_DIR" 2>/dev/null; then
  echo "Installing WordPress..."
  wp core install \
    --path="$WP_DIR" \
    --url="$SITE_URL" \
    --title="$SITE_TITLE" \
    --admin_user="$ADMIN_USER" \
    --admin_password="$ADMIN_PASS" \
    --admin_email="$ADMIN_EMAIL" \
    --skip-email
fi

# ------------------------------------------------------------------
# Install a theme (--skip-content removes defaults)
# ------------------------------------------------------------------
if ! wp theme is-installed twentytwentyfive --path="$WP_DIR" 2>/dev/null; then
  echo "Installing theme..."
  wp theme install twentytwentyfive --activate --path="$WP_DIR"
fi

# ------------------------------------------------------------------
# Install Composer dependencies
# ------------------------------------------------------------------
if [ ! -d "$PLUGIN_DIR/vendor" ]; then
  echo "Installing Composer dependencies..."
  cd "$PLUGIN_DIR"
  composer install --no-interaction
fi

# ------------------------------------------------------------------
# Generate prefixed vendor dependencies
# ------------------------------------------------------------------
if [ ! -f "$PLUGIN_DIR/vendor/vendor-prefixed/autoload.php" ]; then
  echo "Generating prefixed vendor dependencies..."
  cd "$PLUGIN_DIR"
  composer strauss
fi

# ------------------------------------------------------------------
# Activate the plugin
# ------------------------------------------------------------------
if ! wp plugin is-active helm --path="$WP_DIR" 2>/dev/null; then
  echo "Activating Helm plugin..."
  wp plugin activate helm --path="$WP_DIR"
fi

# ------------------------------------------------------------------
# Ensure database tables exist (idempotent via dbDelta)
# ------------------------------------------------------------------
echo "Ensuring Helm database tables..."
wp helm db migrate --path="$WP_DIR"

# ------------------------------------------------------------------
# Set up log directory
# ------------------------------------------------------------------
if [ ! -d /var/log/helm ]; then
  echo "Creating log directory..."
  mkdir -p /var/log/helm
fi

echo "Helm development environment ready."
echo "Visit: $SITE_URL/wp-admin"
echo "Login: $ADMIN_USER / $ADMIN_PASS"
