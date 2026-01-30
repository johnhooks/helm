<?php

declare(strict_types=1);

namespace Helm\Stars;

/**
 * Batch generator for Star CPTs using Action Scheduler.
 *
 * Processes stars from the catalog in batches to avoid timeout issues
 * when creating ~4,060 star posts.
 */
final class StarBatchGenerator
{
    public const HOOK_GENERATE_BATCH = 'helm_generate_stars_batch';
    public const OPTION_PROGRESS = 'helm_star_generation_progress';

    public const DEFAULT_BATCH_SIZE = 100;
    public const DEFAULT_DELAY_SECONDS = 5;

    public function __construct(
        private readonly StarCatalog $catalog,
        private readonly StarRepository $repository,
    ) {
    }

    /**
     * Schedule the first batch of star generation.
     */
    public function schedule(int $batchSize = self::DEFAULT_BATCH_SIZE): void
    {
        // Reset progress
        $this->updateProgress([
            'status' => 'scheduled',
            'total' => $this->catalog->count(),
            'processed' => 0,
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

        $allStars = $this->catalog->all();
        $starIds = array_keys($allStars);
        $batch = array_slice($starIds, $offset, $batchSize);

        $processed = 0;
        $errors = $progress['errors'] ?? [];

        foreach ($batch as $starId) {
            try {
                $star = $allStars[$starId];
                $this->repository->save($star);
                $processed++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'star_id' => $starId,
                    'error' => $e->getMessage(),
                    'time' => time(),
                ];
            }
        }

        // Update progress
        $progress['processed'] = $offset + $processed;
        $progress['errors'] = $errors;
        $this->updateProgress($progress);

        // Schedule next batch if there are more stars
        $nextOffset = $offset + $batchSize;
        if ($nextOffset < count($allStars)) {
            $this->scheduleBatch($nextOffset, $batchSize);
        } else {
            // Generation complete
            $progress['status'] = 'completed';
            $progress['completed_at'] = time();
            $this->updateProgress($progress);

            do_action('helm_stars_generation_complete', $progress);
        }
    }

    /**
     * Run generation synchronously (for CLI or testing).
     *
     * @param callable|null $onProgress Called after each batch with (processed, total)
     * @return array{status: string, total: int, processed: int, batch_size: int, started_at: int, completed_at: int|null, errors: array<array{star_id: string, error: string, time: int}>}
     */
    public function runSync(
        int $batchSize = self::DEFAULT_BATCH_SIZE,
        ?callable $onProgress = null,
    ): array {
        $allStars = $this->catalog->all();
        $total = count($allStars);
        $starIds = array_keys($allStars);

        $progress = [
            'status' => 'processing',
            'total' => $total,
            'processed' => 0,
            'batch_size' => $batchSize,
            'started_at' => time(),
            'completed_at' => null,
            'errors' => [],
        ];
        $this->updateProgress($progress);

        $offset = 0;

        while ($offset < $total) {
            $batch = array_slice($starIds, $offset, $batchSize);

            foreach ($batch as $starId) {
                try {
                    $star = $allStars[$starId];
                    $this->repository->save($star);
                    $progress['processed']++;
                } catch (\Throwable $e) {
                    $progress['errors'][] = [
                        'star_id' => $starId,
                        'error' => $e->getMessage(),
                        'time' => time(),
                    ];
                }
            }

            $this->updateProgress($progress);

            if ($onProgress !== null) {
                $onProgress($progress['processed'], $total);
            }

            $offset += $batchSize;
        }

        $progress['status'] = 'completed';
        $progress['completed_at'] = time();
        $this->updateProgress($progress);

        do_action('helm_stars_generation_complete', $progress);

        return $progress;
    }

    /**
     * Get current generation progress.
     *
     * @return array{status: string, total: int, processed: int, batch_size: int, started_at: int|null, completed_at: int|null, errors: array<array{star_id: string, error: string, time: int}>}
     */
    public function getProgress(): array
    {
        $default = [
            'status' => 'idle',
            'total' => 0,
            'processed' => 0,
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
     *
     * @param array{status: string, total: int, processed: int, batch_size: int, started_at: int|null, completed_at: int|null, errors: array<array{star_id: string, error: string, time: int}>} $progress
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
