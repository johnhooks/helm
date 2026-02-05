<?php

declare(strict_types=1);

namespace Tests\Support;

use Helm\Helm;
use Helm\lucatume\DI52\Container;
use lucatume\WPBrowser\TestCase\WPTestCase;
use RuntimeException;

/**
 * Base test case for Helm integration tests.
 *
 * Provides access to the container and common test utilities.
 */
class TestCase extends WPTestCase
{
    protected Helm $helm;
    protected Container $container;

    protected function setUp(): void
    {
        parent::setUp();

        // Get the Helm instance
        $this->helm = helm();
        $this->container = $this->helm->getContainer();
    }

    /**
     * Load the content of a fixture file.
     *
     * @param string $file Filename relative to tests/Support/Data/fixtures/
     * @throws RuntimeException If fixture file doesn't exist.
     */
    protected function fixture(string $file): string
    {
        $path = codecept_data_dir(sprintf('fixtures/%s', trim($file)));

        if (! file_exists($path)) {
            throw new RuntimeException(sprintf('Fixture file "%s" does not exist', $path));
        }

        return (string) file_get_contents($path);
    }

    /**
     * Generate a unique ID for testing.
     */
    protected function uniqueId(string $prefix = 'test'): string
    {
        return $prefix . '_' . uniqid();
    }

}
