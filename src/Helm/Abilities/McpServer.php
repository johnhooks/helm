<?php

declare(strict_types=1);

namespace Helm\Abilities;

use WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler;
use WP\MCP\Transport\HttpTransport;
use WP_Error;

/** Optional local transport; gameplay remains in the registered abilities. */
final class McpServer
{
    public function register(object $adapter): void
    {
        // The adapter is an optional WordPress plugin, not a Composer dependency.
        $adapter->create_server(
            'helm',
            'helm-mcp/v1',
            'server',
            'Helm local game tools',
            'Explore and operate ships as the authenticated player. Actions use real game time.',
            '0.1.0',
            // Optional plugin classes are provided by MCP Adapter at runtime.
            // @phpstan-ignore-next-line
            [HttpTransport::class],
            // @phpstan-ignore-next-line
            ErrorLogMcpErrorHandler::class,
            null,
            [
                'helm/list-ships', 'helm/inspect-ship', 'helm/list-scan-targets',
                'helm/list-known-edges', 'helm/scan-route', 'helm/jump', 'helm/get-action',
                'helm/inspect-system', 'helm/list-products', 'helm/get-product',
            ],
            [],
            [],
            static fn (): bool => is_user_logged_in()
        );
    }

    /**
     * The adapter preserves isError but otherwise discards WP_Error codes/data.
     * Put a machine-readable diagnostic in its text content for Helm failures.
     *
     * @param mixed $result
     * @param mixed $arguments
     * @return mixed
     */
    public function formatError($result, $arguments, string $toolName)
    {
        if (! $result instanceof WP_Error || ! str_starts_with($toolName, 'helm-')) {
            return $result;
        }

        $errors = [];
        foreach ($result->get_error_codes() as $code) {
            $errors[] = [
                'code' => $code,
                'messages' => $result->get_error_messages($code),
                'data' => $result->get_error_data($code),
            ];
        }

        return new WP_Error(
            $result->get_error_code(),
            (string) wp_json_encode(['tool' => $toolName, 'errors' => $errors], JSON_UNESCAPED_SLASHES),
            $result->get_error_data()
        );
    }
}
