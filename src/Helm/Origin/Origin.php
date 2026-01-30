<?php

declare(strict_types=1);

namespace Helm\Origin;

/**
 * Origin - The central game server.
 *
 * Origin holds all truth: ships, discoveries, economy, generation.
 * This class provides access to the Origin configuration and
 * serves as the entry point for Origin operations.
 */
final class Origin
{
    private const OPTION_NAME = 'helm_origin';

    private ?OriginConfig $config = null;

    /**
     * Get the current Origin configuration.
     *
     * @throws \RuntimeException If Origin has not been initialized.
     */
    public function config(): OriginConfig
    {
        if ($this->config === null) {
            $this->config = $this->load();

            if ($this->config === null) {
                throw new \RuntimeException(
                    'Origin has not been initialized. Run: wp helm origin init'
                );
            }
        }

        return $this->config;
    }

    /**
     * Check if Origin has been initialized.
     */
    public function isInitialized(): bool
    {
        return $this->load() !== null;
    }

    /**
     * Initialize a new Origin.
     *
     * @throws \RuntimeException If Origin already exists.
     */
    public function initialize(string $id, ?string $masterSeed = null): OriginConfig
    {
        if ($this->isInitialized()) {
            throw new \RuntimeException('Origin already initialized.');
        }

        $config = new OriginConfig(
            id: $id,
            masterSeed: $masterSeed ?? $this->generateMasterSeed(),
            knownSpaceThreshold: 3,
            createdAt: time(),
        );

        $this->save($config);
        $this->config = $config;

        return $config;
    }

    /**
     * Generate a deterministic seed for a star system.
     */
    public function systemSeed(string $starId, int $algorithmVersion = 1): string
    {
        return hash(
            'sha256',
            $this->config()->masterSeed . ':' . $starId . ':v' . $algorithmVersion
        );
    }

    /**
     * Reset Origin (for testing).
     */
    public function reset(): void
    {
        delete_option(self::OPTION_NAME);
        $this->config = null;
    }

    /**
     * Load config from wp_options.
     */
    private function load(): ?OriginConfig
    {
        $data = get_option(self::OPTION_NAME);

        if (! is_array($data) || $data === []) {
            return null;
        }

        return OriginConfig::fromRow($data);
    }

    /**
     * Save config to wp_options.
     */
    private function save(OriginConfig $config): void
    {
        update_option(self::OPTION_NAME, $config->toRow(), false);
    }

    /**
     * Generate a cryptographically secure master seed.
     */
    private function generateMasterSeed(): string
    {
        return bin2hex(random_bytes(32));
    }
}
