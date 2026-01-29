<?php

declare(strict_types=1);

namespace Helm\Config;

/**
 * Centralized configuration for Helm.
 *
 * Loads all settings from a single wp_option and provides typed accessors.
 * Settings are cached in memory after first load.
 */
final class Config
{
    private const OPTION_NAME = 'helm_config';

    private const DEFAULTS = [
        'stars_seeded' => false,
        'algorithm_version' => 1,
    ];

    /** @var array<string, mixed>|null */
    private ?array $config = null;

    /**
     * Check if stars have been seeded to the database.
     */
    public function isStarsSeeded(): bool
    {
        return (bool) $this->get('stars_seeded', false);
    }

    /**
     * Mark stars as seeded.
     */
    public function markStarsSeeded(): void
    {
        $this->set('stars_seeded', true);
    }

    /**
     * Get the current algorithm version for system generation.
     */
    public function algorithmVersion(): int
    {
        return (int) $this->get('algorithm_version', 1);
    }

    /**
     * Set the algorithm version.
     */
    public function setAlgorithmVersion(int $version): void
    {
        $this->set('algorithm_version', $version);
    }

    /**
     * Get a config value.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        $this->load();

        return $this->config[$key] ?? $default;
    }

    /**
     * Set a config value and persist to database.
     */
    public function set(string $key, mixed $value): void
    {
        $this->load();

        $this->config[$key] = $value;
        $this->save();
    }

    /**
     * Get all config values.
     *
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $this->load();

        return $this->config;
    }

    /**
     * Reset config to defaults (for testing).
     */
    public function reset(): void
    {
        delete_option(self::OPTION_NAME);
        $this->config = null;
    }

    /**
     * Reload config from database.
     */
    public function reload(): void
    {
        $this->config = null;
        $this->load();
    }

    /**
     * Load config from database.
     */
    private function load(): void
    {
        if ($this->config !== null) {
            return;
        }

        $stored = get_option(self::OPTION_NAME, []);

        if (! is_array($stored)) {
            $stored = [];
        }

        $this->config = array_merge(self::DEFAULTS, $stored);
    }

    /**
     * Save config to database.
     */
    private function save(): void
    {
        update_option(self::OPTION_NAME, $this->config, false);
    }
}
