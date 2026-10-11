<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use Codeception\Module;
use Codeception\TestInterface;
use LogicException;
use Monolog\Handler\NullHandler;
use Monolog\Handler\TestHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;

/**
 * Discard application logs by default; opt into in-memory recording per test.
 */
class Logging extends Module
{
    /**
     * Shared logger retained by already-constructed application services.
     */
    private ?Logger $logger = null;

    public function _beforeSuite(array $settings = []): void
    {
        $logger = helm(LoggerInterface::class);
        if (!$logger instanceof Logger) {
            throw new LogicException('The logging helper requires the application Monolog logger.');
        }
        $this->logger = $logger;
        $this->discardLogging();
    }

    public function _before(TestInterface $test): void
    {
        $this->discardLogging();
    }

    public function _after(TestInterface $test): void
    {
        $this->discardLogging();
    }

    /**
     * Record all levels for this test, preserving PSR message interpolation.
     */
    public function fakeLogging(): TestHandler
    {
        $logger = $this->logger ?? throw new LogicException('Logging helper has not initialized.');
        $recording = new TestHandler();
        $logger->setHandlers([$recording]);
        return $recording;
    }

    private function discardLogging(): void
    {
        if ($this->logger === null) {
            return;
        }
        $this->logger->reset();
        $this->logger->setHandlers([new NullHandler()]);
        helm()->getContainer()->singleton(LoggerInterface::class, $this->logger);
    }
}
