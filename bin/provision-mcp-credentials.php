<?php

// WP-CLI eval-file cannot contain a strict_types declaration.
if (! defined('WP_CLI') || ! WP_CLI) {
    exit;
}
if (wp_get_environment_type() !== 'local') {
    WP_CLI::error('Local environments only.');
}
$user = get_user_by('login', $args[0] ?? 'admin');
if (! $user) {
    WP_CLI::error('Player login not found. Pass a WordPress login to lando mcp-setup.');
}
$directory = dirname(__DIR__) . '/tmp/mcp';
wp_mkdir_p($directory);
chmod($directory, 0700);
$file = $directory . '/connection.json';
$existing = is_file($file) ? json_decode(file_get_contents($file), true) : null;
if (
    $existing && $existing['user_id'] === $user->ID
    && WP_Application_Passwords::get_user_application_password($user->ID, $existing['uuid'])
) {
    WP_CLI::success('Existing MCP credentials retained in tmp/mcp/connection.json.');
    return;
}
$created = WP_Application_Passwords::create_new_application_password($user->ID, ['name' => 'Helm local MCP harness']);
if (is_wp_error($created)) {
    WP_CLI::error($created);
}
[$password, $record] = $created;
$config = [
    'url' => 'https://helm.lndo.site:6010/?rest_route=/helm-mcp/v1/server',
    'user_id' => $user->ID,
    'username' => $user->user_login,
    'uuid' => $record['uuid'],
    'authorization' => 'Basic ' . base64_encode($user->user_login . ':' . $password),
];
umask(0077);
if (file_put_contents($file, wp_json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    WP_Application_Passwords::delete_application_password($user->ID, $record['uuid']);
    WP_CLI::error('Could not save MCP connection. Newly created password revoked.');
}
chmod($file, 0600);
WP_CLI::success('MCP connection saved to tmp/mcp/connection.json for ' . $user->user_login . '.');
