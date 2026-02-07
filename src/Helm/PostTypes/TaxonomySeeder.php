<?php

declare(strict_types=1);

namespace Helm\PostTypes;

/**
 * Seeds default taxonomy terms.
 *
 * Uses version tracking to only seed when terms are added.
 * Increment VERSION when adding new default terms.
 */
final class TaxonomySeeder
{
    /**
     * Current seeder version. Increment when adding new terms.
     */
    public const VERSION = 1;

    /**
     * Option key for stored seeder version.
     */
    private const VERSION_OPTION = 'helm_taxonomy_seeder_version';

    /**
     * Default station types.
     *
     * @var array<string, string>
     */
    private const STATION_TYPES = [
        'trading' => 'Trading',
        'mining' => 'Mining',
        'research' => 'Research',
        'outpost' => 'Outpost',
    ];

    /**
     * Default anomaly types.
     *
     * @var array<string, string>
     */
    private const ANOMALY_TYPES = [
        'rogue-planet' => 'Rogue Planet',
        'npc-station' => 'NPC Station',
        'ruins' => 'Alien Ruins',
        'anomalous' => 'Anomalous',
    ];

    /**
     * Check if seeding is needed.
     */
    public function needsSeed(): bool
    {
        return $this->getStoredVersion() < self::VERSION;
    }

    /**
     * Get the stored seeder version.
     */
    public function getStoredVersion(): int
    {
        return (int) get_option(self::VERSION_OPTION, 0);
    }

    /**
     * Seed all default taxonomy terms if needed.
     *
     * @return int Number of terms created (not counting existing)
     */
    public function seedIfNeeded(): int
    {
        if (!$this->needsSeed()) {
            return 0;
        }

        return $this->seed();
    }

    /**
     * Seed all default taxonomy terms.
     *
     * @return int Number of terms created (not counting existing)
     */
    public function seed(): int
    {
        $count = 0;

        $count += $this->seedTerms(
            PostTypeRegistry::TAXONOMY_STATION_TYPE,
            self::STATION_TYPES
        );

        $count += $this->seedTerms(
            PostTypeRegistry::TAXONOMY_ANOMALY_TYPE,
            self::ANOMALY_TYPES
        );

        update_option(self::VERSION_OPTION, self::VERSION);

        return $count;
    }

    /**
     * Seed terms for a taxonomy.
     *
     * @param string $taxonomy
     * @param array<string, string> $terms Slug => Label
     * @return int Number of terms created
     */
    private function seedTerms(string $taxonomy, array $terms): int
    {
        $count = 0;

        foreach ($terms as $slug => $label) {
            // wp_insert_term returns WP_Error if term exists
            $result = wp_insert_term($label, $taxonomy, ['slug' => $slug]);

            if (!is_wp_error($result)) {
                $count++;
            }
        }

        return $count;
    }
}
