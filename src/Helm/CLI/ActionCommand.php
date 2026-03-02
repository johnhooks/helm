<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionRepository;
use WP_CLI;

/**
 * Action queue management commands.
 */
class ActionCommand
{
    public function __construct(
        private readonly ActionProcessor $processor,
        private readonly ActionRepository $repository,
    ) {
    }

    /**
     * Process ready actions from the queue.
     *
     * ## OPTIONS
     *
     * [--limit=<number>]
     * : Maximum actions to process.
     * ---
     * default: 50
     * ---
     *
     * ## EXAMPLES
     *
     *     # Process ready actions (default batch size)
     *     wp helm action process
     *
     *     # Process up to 10 actions
     *     wp helm action process --limit=10
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function process(array $args, array $assoc_args): void
    {
        $limit = (int) ($assoc_args['limit'] ?? ActionProcessor::BATCH_SIZE);

        if ($limit <= 0) {
            WP_CLI::error('Limit must be a positive integer');
        }

        WP_CLI::log(sprintf('Processing up to %d ready actions...', $limit));

        $result = $this->processor->processReady($limit);

        if ($result->total() === 0) {
            WP_CLI::log('No actions ready for processing.');
            return;
        }

        if ($result->failed > 0) {
            WP_CLI::warning(sprintf(
                'Processed %d actions: %d succeeded, %d failed',
                $result->total(),
                $result->succeeded(),
                $result->failed
            ));
        } else {
            WP_CLI::success(sprintf('Processed %d actions successfully.', $result->processed));
        }
    }

    /**
     * Show queue statistics.
     *
     * ## OPTIONS
     *
     * [--format=<format>]
     * : Output format. Options: table, json. Default: table.
     *
     * ## EXAMPLES
     *
     *     # Show queue stats
     *     wp helm action stats
     *
     *     # Get stats as JSON
     *     wp helm action stats --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function stats(array $args, array $assoc_args): void
    {
        $format = $assoc_args['format'] ?? 'table';

        $counts = $this->repository->countByStatus();
        $total = array_sum($counts);

        // Ensure all statuses are represented
        foreach (ActionStatus::cases() as $status) {
            if (!isset($counts[$status->value])) {
                $counts[$status->value] = 0;
            }
        }

        if ($format === 'json') {
            $data = [
                'total' => $total,
                'by_status' => $counts,
            ];
            WP_CLI::log(json_encode($data, JSON_PRETTY_PRINT));
            return;
        }

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  ACTION QUEUE STATISTICS%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════%n'));
        WP_CLI::log('');
        WP_CLI::log(sprintf('  Total:     %d', $total));
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%Y▸ BY STATUS%n'));

        foreach (ActionStatus::cases() as $status) {
            $count = $counts[$status->value] ?? 0;
            $color = match ($status) {
                ActionStatus::Pending => '%Y',
                ActionStatus::Running => '%C',
                ActionStatus::Fulfilled => '%G',
                ActionStatus::Partial => '%B',
                ActionStatus::Failed => '%R',
            };
            WP_CLI::log(WP_CLI::colorize(sprintf('  %s%-10s%s %d', $color, ucfirst($status->value), '%n', $count)));
        }

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════%n'));
    }

    /**
     * List pending actions ready for processing.
     *
     * ## OPTIONS
     *
     * [--limit=<number>]
     * : Maximum actions to list.
     * ---
     * default: 20
     * ---
     *
     * [--format=<format>]
     * : Output format. Options: table, json, ids. Default: table.
     *
     * ## EXAMPLES
     *
     *     # List pending actions
     *     wp helm action list
     *
     *     # List as JSON
     *     wp helm action list --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function list(array $args, array $assoc_args): void
    {
        $limit = (int) ($assoc_args['limit'] ?? 20);
        $format = $assoc_args['format'] ?? 'table';

        $actions = $this->repository->findPending();
        $actions = array_slice($actions, 0, $limit);

        if ($actions === []) {
            WP_CLI::log('No pending actions.');
            return;
        }

        if ($format === 'ids') {
            $ids = array_map(fn($a) => $a->id, $actions);
            WP_CLI::log(implode(' ', $ids));
            return;
        }

        $rows = [];
        foreach ($actions as $action) {
            $ready = $action->isReady() ? 'Yes' : 'No';
            $deferredUntil = $action->deferred_until?->format('Y-m-d H:i:s') ?? '-';

            $rows[] = [
                'ID' => $action->id,
                'Ship' => $action->ship_post_id,
                'Type' => $action->type->value,
                'Status' => $action->status->value,
                'Ready' => $ready,
                'Deferred Until' => $deferredUntil,
            ];
        }

        if ($format === 'json') {
            WP_CLI::log(json_encode($rows, JSON_PRETTY_PRINT));
            return;
        }

        WP_CLI\Utils\format_items('table', $rows, ['ID', 'Ship', 'Type', 'Status', 'Ready', 'Deferred Until']);
    }
}
