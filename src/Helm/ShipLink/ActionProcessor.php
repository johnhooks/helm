<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Lib\Date;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Models\Action;

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
    public const MAX_PHASES_PER_ACTION = 50;

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
                $this->processClaimedAction($action->id);
                $processed++;
            } catch (\Throwable) {
                // Action already marked as failed by resolver
                $failed++;
            }
        }

        return new ProcessingResult($processed, $failed);
    }

    /**
     * Drain due phases for a claimed action.
     */
    private function processClaimedAction(int $actionId): void
    {
        for ($phaseCount = 0; $phaseCount < self::MAX_PHASES_PER_ACTION; $phaseCount++) {
            $action = $this->actionResolver->resolve($actionId);

            if ($action->status->isFinalState()) {
                return;
            }

            if (! $this->isDueForImmediateProcessing($action)) {
                $this->actionRepository->release($action);
                return;
            }
        }

        $action = $this->actionRepository->find($actionId);
        if ($action !== null && ! $action->status->isFinalState()) {
            $this->actionRepository->release($action);
        }
    }

    private function isDueForImmediateProcessing(Action $action): bool
    {
        if ($action->status->isFinalState()) {
            return false;
        }

        if ($action->deferred_until === null) {
            return true;
        }

        return $action->deferred_until <= Date::now();
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
