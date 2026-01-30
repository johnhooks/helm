<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Config\Config;
use Helm\Origin\Origin;
use Helm\Planets\PlanetBatchGenerator;
use Helm\Planets\PlanetRepository;
use Helm\Ships\ShipPost;
use Helm\Stars\StarBatchGenerator;
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
        private readonly StarBatchGenerator $starGenerator,
        private readonly PlanetBatchGenerator $planetGenerator,
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
        $shipCount = ShipPost::count();

        // Generation progress
        $starProgress = $this->starGenerator->getProgress();
        $planetProgress = $this->planetGenerator->getProgress();

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
            'star_gen' => [
                'label' => 'Star Generation',
                'value' => $this->formatStarGenerationStatus($starProgress),
            ],
            'planets' => [
                'label' => 'Planet Posts',
                'value' => (string) $planetCount,
            ],
            'planet_gen' => [
                'label' => 'Planet Generation',
                'value' => $this->formatPlanetGenerationStatus($planetProgress),
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

    /**
     * Format star generation status for display.
     *
     * @param array{status: string, total: int, processed: int, batch_size: int, started_at: int|null, completed_at: int|null, errors: array<mixed>} $progress
     */
    private function formatStarGenerationStatus(array $progress): string
    {
        $status = $progress['status'];
        $total = $progress['total'];
        $processed = $progress['processed'];

        if ($status === 'idle' || $total === 0) {
            return 'Not started';
        }

        if ($status === 'completed') {
            $errorCount = count($progress['errors']);
            $suffix = $errorCount > 0 ? sprintf(' (%d errors)', $errorCount) : '';
            return sprintf('Complete%s', $suffix);
        }

        if ($status === 'cancelled') {
            return sprintf('Cancelled at %d/%d', $processed, $total);
        }

        // Processing or scheduled
        $percent = $total > 0 ? ($processed / $total) * 100 : 0;
        return sprintf('%s: %d/%d (%.1f%%)', ucfirst($status), $processed, $total, $percent);
    }

    /**
     * Format planet generation status for display.
     *
     * @param array{status: string, total_stars: int, stars_processed: int, planets_created: int, batch_size: int, started_at: int|null, completed_at: int|null, errors: array<mixed>} $progress
     */
    private function formatPlanetGenerationStatus(array $progress): string
    {
        $status = $progress['status'];
        $total = $progress['total_stars'];
        $processed = $progress['stars_processed'];
        $planetsCreated = $progress['planets_created'];

        if ($status === 'idle' || $total === 0) {
            return 'Not started';
        }

        if ($status === 'completed') {
            $errorCount = count($progress['errors']);
            $suffix = $errorCount > 0 ? sprintf(' (%d errors)', $errorCount) : '';
            return sprintf('Complete - %d planets%s', $planetsCreated, $suffix);
        }

        if ($status === 'cancelled') {
            return sprintf('Cancelled at %d/%d stars', $processed, $total);
        }

        // Processing or scheduled
        $percent = $total > 0 ? ($processed / $total) * 100 : 0;
        return sprintf('%s: %d/%d stars (%.1f%%), %d planets', ucfirst($status), $processed, $total, $percent, $planetsCreated);
    }
}
