<?php

declare(strict_types=1);

namespace Tests\Wpunit\Logging;

use Helm\Logging\Provider;
use Helm\lucatume\DI52\Container;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use RuntimeException;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Logging\Provider
 */
class ProviderTest extends WPTestCase
{
    public function test_interpolates_messages_and_preserves_structured_context_and_exceptions(): void
    {
        $directory = sys_get_temp_dir() . '/helm-logs-' . uniqid();
        $oldDirectory = getenv('HELM_LOG_DIR');
        $oldLevel = getenv('HELM_LOG_LEVEL');
        putenv('HELM_LOG_DIR=' . $directory);
        putenv('HELM_LOG_LEVEL=debug');
        try {
            $container = new Container();
            (new Provider($container))->register();
            $logger = $container->get(LoggerInterface::class);
            $this->assertInstanceOf(Logger::class, $logger);
            $logger->debug('Scan {action_id} processed cycle {cycle}', ['action_id' => 42, 'cycle' => 3]);
            $this->assertCount(1, glob($directory . '/*.log'));
            $this->assertStringContainsString('Scan 42 processed cycle 3', file_get_contents(glob($directory . '/*.log')[0]));
            $logger->error('Processing failed', ['exception' => new RuntimeException('diagnostic test')]);
            $logger->close();
            $files = glob($directory . '/*.log');
            $this->assertCount(1, $files);
            $contents = file_get_contents($files[0]);
            $lines = explode("\n", trim($contents));
            $this->assertCount(2, $lines);
            $record = json_decode($lines[0], true, 512, JSON_THROW_ON_ERROR);
            $this->assertSame('Scan 42 processed cycle 3', $record['message']);
            $this->assertSame(['action_id' => 42, 'cycle' => 3], $record['context']);
            $error = json_decode($lines[1], true, 512, JSON_THROW_ON_ERROR);
            $this->assertSame('diagnostic test', $error['context']['exception']['message']);
            $this->assertNotEmpty($error['context']['exception']['trace']);
        } finally {
            putenv($oldDirectory === false ? 'HELM_LOG_DIR' : 'HELM_LOG_DIR=' . $oldDirectory);
            putenv($oldLevel === false ? 'HELM_LOG_LEVEL' : 'HELM_LOG_LEVEL=' . $oldLevel);
            foreach (glob($directory . '/*.log') as $file) {
                unlink($file);
            }
            if (is_dir($directory)) {
                rmdir($directory);
            }
        }
    }

    public function test_buffers_lower_levels_until_trigger_and_limits_retained_records(): void
    {
        $directory = sys_get_temp_dir() . '/helm-buffer-' . uniqid();
        $settings = [
            'HELM_LOG_DIR' => $directory,
            'HELM_LOG_LEVEL' => 'warning',
            'HELM_LOG_BUFFER_SIZE' => '3',
        ];
        $previous = [];
        foreach ($settings as $name => $value) {
            $previous[$name] = getenv($name);
            putenv($name . '=' . $value);
        }
        try {
            $container = new Container();
            (new Provider($container))->register();
            $logger = $container->get(LoggerInterface::class);
            $logger->debug('oldest');
            $logger->debug('recent debug');
            $logger->info('recent info');
            $this->assertSame([], glob($directory . '/*.log'));
            $logger->warning('trigger');
            $logger->debug('after trigger');
            $logger->close();
            $contents = file_get_contents(glob($directory . '/*.log')[0]);
            $records = array_map(
                static fn (string $record): array => json_decode($record, true, 512, JSON_THROW_ON_ERROR),
                explode("\n", trim($contents)),
            );
            $this->assertSame(['recent debug', 'recent info', 'trigger', 'after trigger'], array_column($records, 'message'));

            // Closing an untriggered buffer discards it; a new request starts fresh.
            $container = new Container();
            (new Provider($container))->register();
            $logger = $container->get(LoggerInterface::class);
            $logger->info('untriggered');
            $logger->close();
            $this->assertSame($contents, file_get_contents(glob($directory . '/*.log')[0]));

            putenv('HELM_LOG_LEVEL=info');
            $container = new Container();
            (new Provider($container))->register();
            $logger = $container->get(LoggerInterface::class);
            $logger->debug('buffered debug');
            $logger->info('captured info');
            $logger->error('second trigger');
            $logger->close();
            $contents = file_get_contents(glob($directory . '/*.log')[0]);
            $this->assertStringContainsString('buffered debug', $contents);
            $this->assertStringContainsString('captured info', $contents);
        } finally {
            foreach ($previous as $name => $value) {
                putenv($value === false ? $name : $name . '=' . $value);
            }
            foreach (glob($directory . '/*.log') as $file) {
                unlink($file);
            }
            if (is_dir($directory)) {
                rmdir($directory);
            }
        }
    }

    public function test_unwritable_destination_does_not_throw_into_game_execution(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'helm-log-blocker');
        $oldDirectory = getenv('HELM_LOG_DIR');
        putenv('HELM_LOG_DIR=' . $file . '/cannot-create');
        try {
            $container = new Container();
            (new Provider($container))->register();
            $container->get(LoggerInterface::class)->error('Cannot write this log');
            $this->assertFileExists($file);
        } finally {
            putenv($oldDirectory === false ? 'HELM_LOG_DIR' : 'HELM_LOG_DIR=' . $oldDirectory);
            unlink($file);
        }
    }
}
