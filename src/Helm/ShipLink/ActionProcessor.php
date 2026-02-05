<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Processes ready actions from the queue.
 *
 * Runs via cron to sweep the helm_ship_actions table and resolve
 * any actions that are ready for processing.
 */
final class ActionProcessor
{
    public const HOOK = 'helm_process_ready_actions';
    public const BATCH_SIZE = 50;
    public const INTERVAL_SECONDS = 60;

    public function __construct(
        private readonly ActionRepository $actionRepository,
        private readonly ActionResolver $actionResolver,
    ) {
    }

    /**
     * Process all ready actions.
     */
    public function processReady(int $limit = self::BATCH_SIZE): ProcessingResult
    {
        $actions = $this->actionRepository->claimReady($limit);

        $processed = 0;
        $failed = 0;

        foreach ($actions as $action) {
            try {
                $this->actionResolver->resolve($action->id);
                $processed++;
            } catch (\Throwable) {
                // Action already marked as failed by resolver
                $failed++;
            }
        }

        return new ProcessingResult($processed, $failed);
    }

    /**
     * Ensure recurring cron is scheduled.
     */
    public function ensureScheduled(): void
    {
        if (! function_exists('as_has_scheduled_action') || ! function_exists('as_schedule_recurring_action')) {
            return;
        }

        // Check if already scheduled
        if (as_has_scheduled_action(self::HOOK, [], 'helm')) {
            return;
        }

        // Schedule recurring action
        as_schedule_recurring_action(
            time(),
            self::INTERVAL_SECONDS,
            self::HOOK,
            [],
            'helm'
        );
    }
}
