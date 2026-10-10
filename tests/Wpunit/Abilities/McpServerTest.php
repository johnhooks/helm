<?php

declare(strict_types=1);

namespace Tests\Wpunit\Abilities;

use Helm\Abilities\McpServer;
use lucatume\WPBrowser\TestCase\WPTestCase;
use WP_Error;

/** @covers \Helm\Abilities\McpServer */
class McpServerTest extends WPTestCase
{
    public function test_preserves_error_codes_causes_and_diagnostics(): void
    {
        $error = new WP_Error('helm.action.failed', 'Cannot submit.', ['status' => 409, 'ship_id' => 42]);
        $error->add('helm.ship.busy', 'Read the current action first.');
        $result = (new McpServer())->formatError($error, [], 'helm-scan-route');
        $this->assertWPError($result);
        $details = json_decode($result->get_error_message(), true);
        $this->assertSame('helm-scan-route', $details['tool']);
        $this->assertSame('helm.action.failed', $details['errors'][0]['code']);
        $this->assertSame(42, $details['errors'][0]['data']['ship_id']);
        $this->assertSame('helm.ship.busy', $details['errors'][1]['code']);
        $this->assertSame($error->get_error_data(), $result->get_error_data());
    }

    public function test_leaves_success_and_other_plugins_errors_unchanged(): void
    {
        $server = new McpServer();
        $value = ['ships' => []];
        $this->assertSame($value, $server->formatError($value, [], 'helm-list-ships'));
        $error = new WP_Error('other.error', 'Other plugin.');
        $this->assertSame($error, $server->formatError($error, [], 'other-tool'));
    }
}
