<?php

/**
 * Plugin Name: Helm
 * Plugin URI: https://github.com/okaywp/helm
 * Description: Starship Operating System built on WordPress.
 * Version: 0.1.0
 * Author: OkayWP
 * Author URI: https://okaywp.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: helm
 * Domain Path: /languages
 * Requires at least: 6.9
 * Requires PHP: 8.1
 */

declare(strict_types=1);

// Prevent direct access.
if (! defined('ABSPATH')) {
    exit;
}

use Helm\Helm;

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/vendor-prefixed/autoload.php';
require __DIR__ . '/vendor/woocommerce/action-scheduler/action-scheduler.php';

/**
 * Get the Helm instance or resolve a class from it.
 *
 * @template T
 * @param class-string<T>|null $abstract
 * @return ($abstract is null ? Helm : T)
 */
function helm(?string $abstract = null): mixed
{
    static $instance = null;

    if ($instance === null) {
        $instance = new Helm();
    }

    if ($abstract !== null) {
        return $instance->make($abstract);
    }

    return $instance;
}

helm()->boot(__FILE__);
