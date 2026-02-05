<?php

declare(strict_types=1);

namespace Tests\Wpunit\Exceptions;

use Helm\Core\ErrorCode;
use Helm\Exceptions\HelmException;

/**
 * @covers \Helm\Exceptions\HelmException
 */
class HelmExceptionTest extends \Codeception\TestCase\WPTestCase
{
    public function test_to_wp_error_returns_wp_error(): void
    {
        $exception = new HelmException(
            ErrorCode::ActionNotFound,
            'Action not found'
        );

        $error = $exception->toWpError();

        $this->assertInstanceOf(\WP_Error::class, $error);
    }

    public function test_to_wp_error_has_correct_code(): void
    {
        $exception = new HelmException(
            ErrorCode::ActionNotFound,
            'Action not found'
        );

        $error = $exception->toWpError();

        $this->assertSame('helm.action.not_found', $error->get_error_code());
    }

    public function test_to_wp_error_has_correct_message(): void
    {
        $exception = new HelmException(
            ErrorCode::ActionNotFound,
            'Action #123 not found'
        );

        $error = $exception->toWpError();

        $this->assertSame('Action #123 not found', $error->get_error_message());
    }

    public function test_to_wp_error_chains_previous_helm_exception(): void
    {
        $previous = new HelmException(
            ErrorCode::ShipNoPosition,
            'Ship has no position'
        );

        $exception = new HelmException(
            ErrorCode::ActionFailed,
            'Action failed',
            $previous
        );

        $error = $exception->toWpError();

        $codes = $error->get_error_codes();
        $this->assertCount(2, $codes);
        $this->assertSame('helm.action.failed', $codes[0]);
        $this->assertSame('helm.ship.no_position', $codes[1]);
    }

    public function test_to_wp_error_chains_multiple_previous_exceptions(): void
    {
        $root = new HelmException(
            ErrorCode::NavigationNoRoute,
            'No route exists'
        );

        $middle = new HelmException(
            ErrorCode::ShipNoPosition,
            'Ship has no position',
            $root
        );

        $exception = new HelmException(
            ErrorCode::ActionFailed,
            'Action failed',
            $middle
        );

        $error = $exception->toWpError();

        $codes = $error->get_error_codes();
        $this->assertCount(3, $codes);
        $this->assertSame('helm.action.failed', $codes[0]);
        $this->assertSame('helm.ship.no_position', $codes[1]);
        $this->assertSame('helm.navigation.no_route', $codes[2]);
    }

    public function test_to_wp_error_preserves_messages_for_chained_exceptions(): void
    {
        $previous = new HelmException(
            ErrorCode::ShipNoPosition,
            'Ship #42 has no position'
        );

        $exception = new HelmException(
            ErrorCode::ActionFailed,
            'Jump action failed',
            $previous
        );

        $error = $exception->toWpError();

        $messages = $error->get_error_messages();
        $this->assertCount(2, $messages);
        $this->assertSame('Jump action failed', $messages[0]);
        $this->assertSame('Ship #42 has no position', $messages[1]);
    }

    public function test_to_wp_error_ignores_non_helm_exception_previous(): void
    {
        $previous = new \RuntimeException('Some internal error');

        $exception = new HelmException(
            ErrorCode::ActionFailed,
            'Action failed',
            $previous
        );

        $error = $exception->toWpError();

        $codes = $error->get_error_codes();
        $this->assertCount(1, $codes);
        $this->assertSame('helm.action.failed', $codes[0]);
    }

    public function test_to_wp_error_skips_non_helm_exception_in_chain(): void
    {
        $root = new HelmException(
            ErrorCode::NavigationNoRoute,
            'No route exists'
        );

        // Non-HelmException in the middle
        $middle = new \RuntimeException('Internal error', 0, $root);

        $exception = new HelmException(
            ErrorCode::ActionFailed,
            'Action failed',
            $middle
        );

        $error = $exception->toWpError();

        // Should have both HelmExceptions but skip the RuntimeException
        $codes = $error->get_error_codes();
        $this->assertCount(2, $codes);
        $this->assertSame('helm.action.failed', $codes[0]);
        $this->assertSame('helm.navigation.no_route', $codes[1]);
    }

    public function test_error_code_is_accessible(): void
    {
        $exception = new HelmException(
            ErrorCode::ShipNotFound,
            'Ship not found'
        );

        $this->assertSame(ErrorCode::ShipNotFound, $exception->errorCode);
    }

    public function test_message_is_accessible(): void
    {
        $exception = new HelmException(
            ErrorCode::ShipNotFound,
            'Ship #99 not found'
        );

        $this->assertSame('Ship #99 not found', $exception->getMessage());
    }
}
