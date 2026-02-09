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
        echo '<div class="wrap helm-page-root helm-bridge-root"></div>';
    }

    /**
     * Render the settings mount point.
     */
    public function renderSettings(): void
    {
        echo '<div class="wrap helm-page-root helm-settings-root"></div>';
    }

    /**
     * Enqueue bridge assets.
     */
    public function enqueueBridge(): void
    {
        $this->enqueueShared();
        $this->enqueueBundle('helm-bridge', 'bridge', ['helm-ui']);
        $this->enqueueHelmGlobals('helm-bridge');
    }

    /**
     * Enqueue settings assets.
     */
    public function enqueueSettings(): void
    {
        $this->enqueueShared();
        $this->enqueueBundle('helm-admin-settings', 'admin-settings', ['helm-ui']);
        $this->enqueueHelmGlobals('helm-admin-settings');
    }

    /**
     * Enqueue the shared @helm/ui and @helm/core bundles.
     */
    private function enqueueShared(): void
    {
        $this->enqueueBundle('helm-ui', 'ui');
        $this->enqueueBundle('helm-core', 'core');
    }

    /**
     * Inject window.helm globals (settings, log) before a script handle.
     */
    private function enqueueHelmGlobals(string $handle): void
    {
        add_action('admin_enqueue_scripts', function () use ($handle): void {
            wp_add_inline_script(
                $handle,
                'window.helm = window.helm || {};'
                . 'window.helm.settings = ' . wp_json_encode([
                    'workerUrl' => HELM_URL . 'build/datacore-worker.js',
                    'debug'     => defined('WP_DEBUG') && WP_DEBUG,
                ]) . ';',
                'before',
            );
        });
    }

    /**
     * Enqueue a JS + CSS bundle from the build directory.
     *
     * @param string   $handle   WP handle for the script/style.
     * @param string   $entry    Build entry name (maps to build/{entry}.js).
     * @param string[] $cssDeps  Style handles this bundle depends on.
     */
    private function enqueueBundle(string $handle, string $entry, array $cssDeps = []): void
    {
        $assetFile = HELM_PATH . "build/{$entry}.asset.php";

        if (! file_exists($assetFile)) {
            return;
        }

        $asset = include $assetFile;

        add_action('admin_enqueue_scripts', function () use ($handle, $entry, $asset, $cssDeps): void {
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
                    $cssDeps,
                    $asset['version'],
                );
            }
        });
    }
}
