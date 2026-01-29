<?php

declare(strict_types=1);

namespace Helm\Planets;

use Helm\Generation\SystemGenerator;
use Helm\Origin\Origin;
use Helm\Stars\StarRepository;

/**
 * Batch generator for Planet CPTs using Action Scheduler.
 *
 * Generates planets for stars in batches. Planets are generated using
 * the SystemGenerator which produces deterministic results from star data.
 */
final class PlanetBatchGenerator
{
    public const HOOK_GENERATE_BATCH = 'helm_generate_planets_batch';
    public const OPTION_PROGRESS = 'helm_planet_generation_progress';

    public const DEFAULT_BATCH_SIZE = 50;
    public const DEFAULT_DELAY_SECONDS = 5;

    public function __construct(
        private readonly StarRepository $starRepository,
        private readonly PlanetRepository $planetRepository,
        private readonly SystemGenerator $systemGenerator,
        private readonly Origin $origin,
    ) {}

    /**
     * Schedule planet generation for all stars.
     */
    public function schedule(int $batchSize = self::DEFAULT_BATCH_SIZE): void
    {
        $totalStars = $this->starRepository->count();

        $this->updateProgress([
            'status' => 'scheduled',
            'total_stars' => $totalStars,
            'stars_processed' => 0,
            'planets_created' => 0,
            'batch_size' => $batchSize,
            'started_at' => time(),
            'completed_at' => null,
            'errors' => [],
        ]);

        $this->scheduleBatch(0, $batchSize);
    }

    /**
     * Schedule a batch at a specific offset.
     */
    public function scheduleBatch(int $offset, int $batchSize = self::DEFAULT_BATCH_SIZE): void
    {
        if (! function_exists('as_schedule_single_action')) {
            throw new \RuntimeException('Action Scheduler is not available');
        }

        as_schedule_single_action(
            time() + self::DEFAULT_DELAY_SECONDS,
            self::HOOK_GENERATE_BATCH,
            [
                'offset' => $offset,
                'batch_size' => $batchSize,
            ],
            'helm'
        );
    }

    /**
     * Handle a batch of stars.
     *
     * Called by Action Scheduler.
     */
    public function handleBatch(int $offset, int $batchSize = self::DEFAULT_BATCH_SIZE): void
    {
        $progress = $this->getProgress();
        $progress['status'] = 'processing';
        $this->updateProgress($progress);

        $starPosts = $this->starRepository->all($batchSize);
        // We need to get stars by offset, let's use a query with offset
        $starPosts = $this->getStarBatch($offset, $batchSize);

        $masterSeed = $this->origin->config()->masterSeed;
        $starsProcessed = 0;
        $planetsCreated = 0;
        $errors = $progress['errors'] ?? [];

        foreach ($starPosts as $starPost) {
            try {
                $star = $starPost->toStar();
                $contents = $this->systemGenerator->generate($star, $masterSeed);

                foreach ($contents->planets as $generatedPlanet) {
                    $planet = $this->convertToPlanet($generatedPlanet, $star->id);
                    $this->planetRepository->save($planet, $starPost->postId());
                    $planetsCreated++;
                }

                $starsProcessed++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'star_id' => $starPost->catalogId(),
                    'error' => $e->getMessage(),
                    'time' => time(),
                ];
            }
        }

        // Update progress
        $progress['stars_processed'] = $offset + $starsProcessed;
        $progress['planets_created'] = ($progress['planets_created'] ?? 0) + $planetsCreated;
        $progress['errors'] = $errors;
        $this->updateProgress($progress);

        // Schedule next batch if there are more stars
        $totalStars = $this->starRepository->count();
        $nextOffset = $offset + $batchSize;

        if ($nextOffset < $totalStars) {
            $this->scheduleBatch($nextOffset, $batchSize);
        } else {
            // Generation complete
            $progress['status'] = 'completed';
            $progress['completed_at'] = time();
            $this->updateProgress($progress);

            do_action('helm_planets_generation_complete', $progress);
        }
    }

    /**
     * Get a batch of stars by offset.
     *
     * @return array<\Helm\Stars\StarPost>
     */
    private function getStarBatch(int $offset, int $limit): array
    {
        $query = new \WP_Query([
            'post_type' => \Helm\PostTypes\PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'offset' => $offset,
            'orderby' => 'ID',
            'order' => 'ASC',
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(\WP_Post $post) => \Helm\Stars\StarPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Convert a generated planet to a Planet value object.
     */
    private function convertToPlanet(
        \Helm\Generation\Generated\Planet $generated,
        string $starId,
    ): Planet {
        return new Planet(
            id: $generated->id,
            starId: $starId,
            type: $generated->type,
            orbitIndex: $generated->orbitIndex,
            orbitAu: $generated->orbitAu,
            resources: $generated->resources,
            habitable: $generated->habitable,
            moons: $generated->moons,
            name: $generated->name,
            radiusEarth: $generated->radiusEarth,
            massEarth: $generated->massEarth,
            orbitalPeriodDays: $generated->orbitalPeriodDays,
            equilibriumTempK: $generated->equilibriumTempK,
            confirmed: $generated->confirmed,
        );
    }

    /**
     * Run generation synchronously (for CLI or testing).
     *
     * @param callable|null $onProgress Called after each batch with (starsProcessed, totalStars, planetsCreated)
     */
    public function runSync(
        int $batchSize = self::DEFAULT_BATCH_SIZE,
        ?callable $onProgress = null,
    ): array {
        $totalStars = $this->starRepository->count();
        $masterSeed = $this->origin->config()->masterSeed;

        $progress = [
            'status' => 'processing',
            'total_stars' => $totalStars,
            'stars_processed' => 0,
            'planets_created' => 0,
            'batch_size' => $batchSize,
            'started_at' => time(),
            'completed_at' => null,
            'errors' => [],
        ];
        $this->updateProgress($progress);

        $offset = 0;

        while ($offset < $totalStars) {
            $starPosts = $this->getStarBatch($offset, $batchSize);

            foreach ($starPosts as $starPost) {
                try {
                    $star = $starPost->toStar();
                    $contents = $this->systemGenerator->generate($star, $masterSeed);

                    foreach ($contents->planets as $generatedPlanet) {
                        $planet = $this->convertToPlanet($generatedPlanet, $star->id);
                        $this->planetRepository->save($planet, $starPost->postId());
                        $progress['planets_created']++;
                    }

                    $progress['stars_processed']++;
                } catch (\Throwable $e) {
                    $progress['errors'][] = [
                        'star_id' => $starPost->catalogId(),
                        'error' => $e->getMessage(),
                        'time' => time(),
                    ];
                }
            }

            $this->updateProgress($progress);

            if ($onProgress !== null) {
                $onProgress(
                    $progress['stars_processed'],
                    $totalStars,
                    $progress['planets_created']
                );
            }

            $offset += $batchSize;
        }

        $progress['status'] = 'completed';
        $progress['completed_at'] = time();
        $this->updateProgress($progress);

        do_action('helm_planets_generation_complete', $progress);

        return $progress;
    }

    /**
     * Generate planets for a single star.
     */
    public function generateForStar(string $starId): int
    {
        $starPost = $this->starRepository->get($starId);

        if ($starPost === null) {
            throw new \InvalidArgumentException("Star not found: {$starId}");
        }

        $star = $starPost->toStar();
        $masterSeed = $this->origin->config()->masterSeed;
        $contents = $this->systemGenerator->generate($star, $masterSeed);

        $created = 0;
        foreach ($contents->planets as $generatedPlanet) {
            $planet = $this->convertToPlanet($generatedPlanet, $star->id);
            $this->planetRepository->save($planet, $starPost->postId());
            $created++;
        }

        return $created;
    }

    /**
     * Get current generation progress.
     *
     * @return array{status: string, total_stars: int, stars_processed: int, planets_created: int, batch_size: int, started_at: int|null, completed_at: int|null, errors: array}
     */
    public function getProgress(): array
    {
        $default = [
            'status' => 'idle',
            'total_stars' => 0,
            'stars_processed' => 0,
            'planets_created' => 0,
            'batch_size' => self::DEFAULT_BATCH_SIZE,
            'started_at' => null,
            'completed_at' => null,
            'errors' => [],
        ];

        $progress = get_option(self::OPTION_PROGRESS, $default);

        return is_array($progress) ? array_merge($default, $progress) : $default;
    }

    /**
     * Update generation progress.
     */
    private function updateProgress(array $progress): void
    {
        update_option(self::OPTION_PROGRESS, $progress, false);
    }

    /**
     * Reset generation progress.
     */
    public function resetProgress(): void
    {
        delete_option(self::OPTION_PROGRESS);
    }

    /**
     * Check if generation is currently running.
     */
    public function isRunning(): bool
    {
        $progress = $this->getProgress();
        return in_array($progress['status'], ['scheduled', 'processing'], true);
    }

    /**
     * Cancel any pending generation batches.
     */
    public function cancel(): void
    {
        if (function_exists('as_unschedule_all_actions')) {
            as_unschedule_all_actions(self::HOOK_GENERATE_BATCH, [], 'helm');
        }

        $progress = $this->getProgress();
        $progress['status'] = 'cancelled';
        $this->updateProgress($progress);
    }
}
