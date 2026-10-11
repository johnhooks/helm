<?php

declare(strict_types=1);

namespace Helm\Logging;

use Helm\lucatume\DI52\ServiceProvider;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Handler\FingersCrossedHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\WhatFailureGroupHandler;
use Monolog\Level;
use Monolog\Logger;
use Monolog\Processor\PsrLogMessageProcessor;
use Psr\Log\LoggerInterface;

/**
 * Structured application diagnostics, separate from persisted game state.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(LoggerInterface::class, static function (): LoggerInterface {
            $local = wp_get_environment_type() === 'local';
            $directory = getenv('HELM_LOG_DIR');
            if ($directory === false || $directory === '') {
                $directory = $local ? dirname(__DIR__, 3) . '/tmp/logs' : '';
            }
            $triggerLevel = Level::fromName(self::setting('HELM_LOG_LEVEL', 'warning'));
            $bufferSize = max(1, min(10000, (int) self::setting('HELM_LOG_BUFFER_SIZE', '200')));
            $handler = $directory !== ''
                ? new RotatingFileHandler($directory . '/helm.log', 7, Level::Debug, true, 0600)
                : new StreamHandler('php://stderr', Level::Debug);
            $formatter = new JsonFormatter();
            $formatter->includeStacktraces();
            $handler->setFormatter($formatter);

            // A logging destination failure must not fail or retry a game action.
            $buffer = new FingersCrossedHandler(
                new WhatFailureGroupHandler([$handler]),
                $triggerLevel,
                $bufferSize,
            );
            return new Logger('helm', [$buffer], [new PsrLogMessageProcessor()]);
        });
    }
    private static function setting(string $name, string $default): string
    {
        $value = getenv($name);
        return $value === false || $value === '' ? $default : $value;
    }
}
