<?php

declare(strict_types=1);

namespace Helm\Admin;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Registers admin pages and enqueues their React bundles.
 *
 * Two pages, two entry points:
 *  - Bridge (top-level): game app with client-side routing.
 *  - Settings (submenu): standard WP admin settings page.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        // Nothing to bind.
    }

    public function boot(): void
    {
        add_action('admin_menu', [$this, 'registerPages']);
    }

    /**
     * Register admin menu pages.
     */
    public function registerPages(): void
    {
        // Top-level — bridge game app.
        $bridge = add_menu_page(
            __('Helm', 'helm'),
            __('Helm', 'helm'),
            'read',
            'helm',
            [$this, 'renderBridge'],
            'dashicons-screenoptions',
            3,
        );

        add_action("load-{$bridge}", [$this, 'enqueueBridge']);

        // Rename the auto-created first submenu from "Helm" to "Bridge".
        add_submenu_page(
            'helm',
            __('Bridge', 'helm'),
            __('Bridge', 'helm'),
            'read',
            'helm',
        );

        // Settings — standard admin page.
        $settings = add_submenu_page(
            'helm',
            __('Settings', 'helm'),
            __('Settings', 'helm'),
            'manage_options',
            'helm-settings',
            [$this, 'renderSettings'],
        );

        add_action("load-{$settings}", [$this, 'enqueueSettings']);
    }

    /**
     * Render the bridge mount point.
     */
    public function renderBridge(): void
    {
        echo '<div class="wrap helm-bridge-root"></div>';
    }

    /**
     * Render the settings mount point.
     */
    public function renderSettings(): void
    {
        echo '<div class="wrap helm-admin-settings-root"></div>';
    }

    /**
     * Enqueue bridge assets.
     */
    public function enqueueBridge(): void
    {
        $this->enqueueBundle('helm-bridge', 'bridge');
    }

    /**
     * Enqueue settings assets.
     */
    public function enqueueSettings(): void
    {
        $this->enqueueBundle('helm-admin-settings', 'admin-settings');
    }

    /**
     * Enqueue a JS + CSS bundle from the build directory.
     */
    private function enqueueBundle(string $handle, string $entry): void
    {
        $assetFile = HELM_PATH . "build/{$entry}.asset.php";

        if (! file_exists($assetFile)) {
            return;
        }

        $asset = include $assetFile;

        add_action('admin_enqueue_scripts', function () use ($handle, $entry, $asset): void {
            wp_enqueue_script(
                $handle,
                HELM_URL . "build/{$entry}.js",
                $asset['dependencies'],
                $asset['version'],
                true,
            );

            $cssFile = HELM_PATH . "build/{$entry}.css";
            if (file_exists($cssFile)) {
                wp_enqueue_style(
                    $handle,
                    HELM_URL . "build/{$entry}.css",
                    ['wp-components'],
                    $asset['version'],
                );
            }
        });
    }
}
