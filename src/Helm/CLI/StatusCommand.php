<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Config\Config;
use Helm\Origin\Origin;
use Helm\Planets\PlanetRepository;
use Helm\Ships\ShipRepository;
use Helm\Stars\StarCatalog;
use Helm\Stars\StarRepository;
use WP_CLI;

/**
 * Show Helm status and statistics.
 */
class StatusCommand
{
    public function __construct(
        private readonly Config $config,
        private readonly Origin $origin,
        private readonly StarCatalog $catalog,
        private readonly StarRepository $starRepository,
        private readonly PlanetRepository $planetRepository,
        private readonly ShipRepository $shipRepository,
    ) {
    }

    /**
     * Show Helm status.
     *
     * ## OPTIONS
     *
     * [--format=<format>]
     * : Output format.
     * ---
     * default: table
     * options:
     *   - table
     *   - json
     *   - yaml
     * ---
     *
     * ## EXAMPLES
     *
     *     wp helm status
     *     wp helm status --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function __invoke(array $args, array $assoc_args): void
    {
        $format = $assoc_args['format'] ?? 'table';

        $originInitialized = $this->origin->isInitialized();
        $starsSeeded = $this->config->isStarsSeeded();
        $algorithmVersion = $this->config->algorithmVersion();

        $catalogCount = $this->catalog->count();
        $starCount = $this->starRepository->count();
        $planetCount = $this->planetRepository->count();
        $shipCount = $this->shipRepository->count();

        $data = [
            'origin' => [
                'label' => 'Origin',
                'value' => $originInitialized ? 'Initialized' : 'Not initialized',
            ],
            'stars_seeded' => [
                'label' => 'Stars Seeded',
                'value' => $starsSeeded ? 'Yes' : 'No',
            ],
            'algorithm' => [
                'label' => 'Algorithm Version',
                'value' => (string) $algorithmVersion,
            ],
            'catalog' => [
                'label' => 'Star Catalog',
                'value' => sprintf('%d stars', $catalogCount),
            ],
            'stars' => [
                'label' => 'Star Posts',
                'value' => sprintf('%d / %d (%.1f%%)', $starCount, $catalogCount, $catalogCount > 0 ? ($starCount / $catalogCount) * 100 : 0),
            ],
            'planets' => [
                'label' => 'Planet Posts',
                'value' => (string) $planetCount,
            ],
            'ships' => [
                'label' => 'Ship Posts',
                'value' => (string) $shipCount,
            ],
        ];

        if ($format === 'json') {
            WP_CLI::log(json_encode($data, JSON_PRETTY_PRINT));
            return;
        }

        if ($format === 'yaml') {
            WP_CLI::log(\WP_CLI\Utils\format_items('yaml', array_values($data), ['label', 'value']));
            return;
        }

        WP_CLI::log('');
        WP_CLI::log('=== Helm Status ===');
        WP_CLI::log('');

        foreach ($data as $row) {
            WP_CLI::log(sprintf('  %-20s %s', $row['label'] . ':', $row['value']));
        }

        WP_CLI::log('');
    }
}
