<?php

/**
 * Invoke a Helm ability through WP-CLI using the selected WordPress user.
 *
 * wp --user=admin eval-file bin/run-ability.php helm/list-ships '{}'
 * wp --user=admin eval-file bin/run-ability.php helm/inspect-ship '{"ship_id":42}'
 */

// eval-file evaluates this script after an injected PHP closing tag, so a
// strict_types declaration cannot be used here.

if (! defined('WP_CLI') || ! WP_CLI) {
    exit;
}

if (count($args) < 1 || count($args) > 2 || ! str_starts_with($args[0], 'helm/')) {
    WP_CLI::error('Usage: wp --user=<player> eval-file bin/run-ability.php helm/<ability> [<json-object>]');
}

if (! function_exists('wp_get_ability')) {
    WP_CLI::error('WordPress 6.9 or newer is required for the Abilities API.');
}

try {
    $json = $args[1] ?? '{}';
    $input = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    if (! is_object(json_decode($json, false, 512, JSON_THROW_ON_ERROR))) {
        WP_CLI::error('Ability input must be a JSON object.');
    }
} catch (JsonException $error) {
    WP_CLI::error('Invalid JSON: ' . $error->getMessage());
}

$ability = wp_get_ability($args[0]);
if ($ability === null) {
    WP_CLI::error('Unknown Helm ability: ' . $args[0]);
}

$result = $ability->execute($input);
if (is_wp_error($result)) {
    WP_CLI::error($result);
}

WP_CLI::line(wp_json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
