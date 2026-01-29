<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Origin\Origin;
use WP_CLI;

/**
 * Manage the Origin (game universe).
 */
class OriginCommand
{
    public function __construct(
        private readonly Origin $origin,
    ) {}

    /**
     * Initialize a new Origin (game universe).
     *
     * ## OPTIONS
     *
     * [<id>]
     * : Identifier for this game world.
     * ---
     * default: default
     * ---
     *
     * [--seed=<seed>]
     * : Master seed for deterministic generation. If not provided, a random seed is generated.
     *
     * ## EXAMPLES
     *
     *     # Initialize with random seed
     *     wp helm origin init
     *
     *     # Initialize with custom ID
     *     wp helm origin init alpha
     *
     *     # Initialize with specific seed (for reproducibility)
     *     wp helm origin init production --seed=my-secret-seed-123
     *
     * @when after_wp_load
     */
    public function init(array $args, array $assoc_args): void
    {
        $id = $args[0] ?? 'default';
        $seed = $assoc_args['seed'] ?? null;

        if ($this->origin->isInitialized()) {
            $config = $this->origin->config();
            WP_CLI::error(sprintf(
                "Origin already initialized (id: %s, created: %s). Cannot reinitialize.",
                $config->id,
                date('Y-m-d H:i:s', $config->createdAt)
            ));
            return;
        }

        $config = $this->origin->initialize($id, $seed);

        WP_CLI::success('Origin initialized!');
        WP_CLI::log('');
        WP_CLI::log(sprintf('  ID:           %s', $config->id));
        WP_CLI::log(sprintf('  Master Seed:  %s', substr($config->masterSeed, 0, 16) . '...'));
        WP_CLI::log(sprintf('  Created:      %s', date('Y-m-d H:i:s', $config->createdAt)));
        WP_CLI::log('');
        WP_CLI::log('You can now generate stars and planets.');
    }

    /**
     * Show Origin status.
     *
     * ## OPTIONS
     *
     * [--show-seed]
     * : Show the full master seed (sensitive!).
     *
     * ## EXAMPLES
     *
     *     wp helm origin status
     *     wp helm origin status --show-seed
     *
     * @when after_wp_load
     */
    public function status(array $args, array $assoc_args): void
    {
        $showSeed = isset($assoc_args['show-seed']);

        if (! $this->origin->isInitialized()) {
            WP_CLI::warning('Origin not initialized. Run: wp helm origin init');
            return;
        }

        $config = $this->origin->config();

        WP_CLI::log('');
        WP_CLI::log('=== Origin Status ===');
        WP_CLI::log('');
        WP_CLI::log(sprintf('  ID:                    %s', $config->id));

        if ($showSeed) {
            WP_CLI::log(sprintf('  Master Seed:           %s', $config->masterSeed));
        } else {
            WP_CLI::log(sprintf('  Master Seed:           %s... (use --show-seed to reveal)', substr($config->masterSeed, 0, 16)));
        }

        WP_CLI::log(sprintf('  Known Space Threshold: %d ly', $config->knownSpaceThreshold));
        WP_CLI::log(sprintf('  Created:               %s', date('Y-m-d H:i:s', $config->createdAt)));
        WP_CLI::log('');
    }
}
