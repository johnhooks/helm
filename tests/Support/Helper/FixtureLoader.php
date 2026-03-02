<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

/**
 * Load JSON fixture files from tests/_data/.
 */
final class FixtureLoader
{
    /**
     * Load a JSON fixture file and decode it.
     *
     * @param string $relativePath Path relative to tests/_data/
     * @return array<int, array<string, mixed>>
     */
    public static function load(string $relativePath): array
    {
        $fullPath = dirname(__DIR__, 2) . '/_data/' . $relativePath;

        $json = file_get_contents($fullPath);
        if ($json === false) {
            throw new \RuntimeException("Cannot read fixture: {$fullPath}");
        }

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }
}
