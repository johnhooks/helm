<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Config\Config;
use Helm\Generation\SystemGenerator;
use Helm\Origin\Origin;
use Helm\Planets\PlanetRepository;
use Helm\Stars\Star;
use Helm\Stars\StarCatalog;
use Helm\Stars\StarRepository;
use WP_CLI;

/**
 * Star management commands.
 */
class StarCommand
{
    public function __construct(
        private readonly Config $config,
        private readonly StarCatalog $catalog,
        private readonly StarRepository $repository,
        private readonly PlanetRepository $planetRepository,
        private readonly SystemGenerator $systemGenerator,
        private readonly Origin $origin,
    ) {
    }

    /**
     * Seed stars from the catalog to the database.
     *
     * This is a one-time operation that imports all stars from the
     * Hipparcos catalog into WordPress as custom posts.
     *
     * ## OPTIONS
     *
     * [--force]
     * : Re-seed even if already seeded. Will skip existing stars.
     *
     * [--fresh]
     * : Delete all existing stars before seeding.
     *
     * ## EXAMPLES
     *
     *     # Seed stars (first time)
     *     wp helm star seed
     *
     *     # Re-run seeding (skips existing)
     *     wp helm star seed --force
     *
     *     # Fresh seed (deletes existing stars first)
     *     wp helm star seed --fresh
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function seed(array $args, array $assoc_args): void
    {
        $force = isset($assoc_args['force']);
        $fresh = isset($assoc_args['fresh']);

        // Check if already seeded
        if ($this->config->isStarsSeeded() && ! $force && ! $fresh) {
            WP_CLI::warning('Stars have already been seeded. Use --force to re-run or --fresh to start over.');
            WP_CLI::log(sprintf('Current star count: %d', $this->repository->count()));
            return;
        }

        // Fresh start - delete all existing stars
        if ($fresh) {
            WP_CLI::log('Deleting existing stars...');
            $this->deleteAllStars();
            $this->config->set('stars_seeded', false);
        }

        $allStars = $this->catalog->all();
        $total = count($allStars);

        WP_CLI::log(sprintf('Seeding %d stars from catalog...', $total));

        /** @var \cli\progress\Bar $progress */
        $progress = \WP_CLI\Utils\make_progress_bar('Seeding stars', $total);
        $created = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($allStars as $star) {
            try {
                if ($this->repository->exists($star->id)) {
                    $skipped++;
                } else {
                    $this->repository->save($star);
                    $created++;
                }
            } catch (\Exception $e) {
                $errors++;
                WP_CLI::debug(sprintf('Failed to seed star %s: %s', $star->id, $e->getMessage()));
            }

            $progress->tick();
        }

        $progress->finish();

        // Mark as seeded
        $this->config->markStarsSeeded();

        WP_CLI::success(sprintf(
            'Seeding complete. Created: %d, Skipped: %d, Errors: %d',
            $created,
            $skipped,
            $errors
        ));
    }

    /**
     * Generate planets for a star.
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the star.
     *
     * [--dry-run]
     * : Output what would be generated as JSON without creating posts.
     *
     * ## EXAMPLES
     *
     *     # Generate planets for star post 42
     *     wp helm star generate 42
     *
     *     # Preview what would be generated
     *     wp helm star generate 42 --dry-run
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function generate(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);
        $dryRun = isset($assoc_args['dry-run']);

        if ($postId <= 0) {
            WP_CLI::error('Please provide a valid star post ID');
        }

        // Get the star from post ID
        $starPost = $this->repository->getByPostId($postId);
        if ($starPost === null) {
            WP_CLI::error(sprintf("Star post %d not found", $postId));
        }

        $star = $starPost->toStar();

        // Check origin is initialized
        if (! $this->origin->isInitialized()) {
            WP_CLI::error('Origin not initialized. Run: wp helm origin init');
        }

        // Dry run - just output JSON
        if ($dryRun) {
            $this->dryRunStar($star, true);
            return;
        }

        // Check if planets already exist
        $existingPlanets = $this->planetRepository->forStarPostId($postId);
        if ($existingPlanets !== []) {
            WP_CLI::warning(sprintf(
                "Star %s already has %d planets. Delete them first to regenerate.",
                $star->displayName(),
                count($existingPlanets)
            ));
            return;
        }

        // Generate planets
        WP_CLI::log(sprintf('Generating planets for: %s (%s)', $star->displayName(), $star->id));
        $planetCount = $this->generatePlanetsForStarPost($star, $postId);
        WP_CLI::success(sprintf('Generated %d planets.', $planetCount));
    }

    /**
     * Delete all star posts.
     */
    private function deleteAllStars(): void
    {
        $posts = get_posts([
            'post_type' => 'helm_star',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'fields' => 'ids',
        ]);

        $count = count($posts);
        if ($count === 0) {
            return;
        }

        /** @var \cli\progress\Bar $progress */
        $progress = \WP_CLI\Utils\make_progress_bar('Deleting stars', $count);

        foreach ($posts as $postId) {
            wp_delete_post($postId, true);
            $progress->tick();
        }

        $progress->finish();
        WP_CLI::log(sprintf('Deleted %d stars.', $count));
    }

    /**
     * Output star system data as JSON without creating posts.
     */
    private function dryRunStar(Star $star, bool $withPlanets = true): void
    {
        $masterSeed = $this->origin->config()->masterSeed;
        $contents = $this->systemGenerator->generate($star, $masterSeed);

        $data = [
            'star' => [
                'id' => $star->id,
                'name' => $star->name,
                'display_name' => $star->displayName(),
                'spectral_type' => $star->spectralType,
                'spectral_class' => $star->spectralClass(),
                'distance_ly' => $star->distanceLy,
            ],
            'system' => [
                'algorithm_version' => $contents->algorithmVersion,
                'seed' => $this->systemGenerator->generateSeed($star, $masterSeed),
                'planets' => array_map(fn($p) => $p->toArray(), $contents->planets),
                'asteroid_belts' => array_map(fn($b) => $b->toArray(), $contents->asteroidBelts),
            ],
            'summary' => [
                'planets' => count($contents->planets),
                'asteroid_belts' => count($contents->asteroidBelts),
                'habitable_planets' => count(array_filter($contents->planets, fn($p) => $p->habitable)),
            ],
        ];

        WP_CLI::log(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Generate planets for a star post.
     */
    private function generatePlanetsForStarPost(Star $star, int $postId): int
    {
        $masterSeed = $this->origin->config()->masterSeed;
        $contents = $this->systemGenerator->generate($star, $masterSeed);

        $count = 0;
        foreach ($contents->planets as $planet) {
            $this->planetRepository->saveGenerated($planet, $star->id, $postId);
            $count++;
        }

        return $count;
    }
}
