<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\PostTypes\PostTypeRegistry;
use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipSystemsRepository;
use Helm\Ships\ShipPost;
use WP_CLI;

/**
 * Ship management commands.
 */
class ShipCommand
{
    public function __construct(
        private readonly ShipFactory $factory,
        private readonly ShipSystemsRepository $systemsRepository,
    ) {
    }

    /**
     * Create a new ship.
     *
     * ## OPTIONS
     *
     * [--name=<name>]
     * : The ship name. Default: "Unnamed Vessel"
     *
     * [--owner=<user_id>]
     * : The WordPress user ID who owns the ship. Default: current user or 1.
     *
     * ## EXAMPLES
     *
     *     # Create a ship with default settings
     *     wp helm ship create
     *
     *     # Create a named ship
     *     wp helm ship create --name="Aurora"
     *
     *     # Create a ship for a specific user
     *     wp helm ship create --name="Horizon" --owner=5
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function create(array $args, array $assoc_args): void
    {
        $name = $assoc_args['name'] ?? 'Unnamed Vessel';
        $currentUserId = get_current_user_id();
        $ownerId = isset($assoc_args['owner'])
            ? (int) $assoc_args['owner']
            : ($currentUserId > 0 ? $currentUserId : 1);

        // Verify the owner exists
        $user = get_user_by('ID', $ownerId);
        if ($user === false) {
            WP_CLI::error(sprintf('User %d not found', $ownerId));
        }

        // Create the ship CPT post
        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_title' => $name,
            'post_status' => 'publish',
            'post_author' => $ownerId,
        ], true);

        if (is_wp_error($postId)) {
            WP_CLI::error(sprintf('Failed to create ship: %s', $postId->get_error_message()));
        }

        // Generate a unique ship ID
        $shipId = wp_generate_uuid4();
        update_post_meta($postId, PostTypeRegistry::META_SHIP_ID, $shipId);

        // Create systems record with defaults
        $this->systemsRepository->findOrCreate($postId);

        WP_CLI::success(sprintf(
            'Created ship "%s" (Post ID: %d, Ship ID: %s)',
            $name,
            $postId,
            $shipId
        ));

        // Show diagnostic after creation
        $this->diagnostic([(string) $postId], []);
    }

    /**
     * Show ship diagnostic readout.
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the ship.
     *
     * [--format=<format>]
     * : Output format. Options: table, json. Default: table.
     *
     * ## EXAMPLES
     *
     *     # Show diagnostic for ship post 42
     *     wp helm ship diagnostic 42
     *
     *     # Get diagnostic as JSON
     *     wp helm ship diagnostic 42 --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function diagnostic(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);
        $format = $assoc_args['format'] ?? 'table';

        if ($postId <= 0) {
            WP_CLI::error('Please provide a valid ship post ID');
        }

        $shipPost = ShipPost::fromId($postId);
        if ($shipPost === null) {
            WP_CLI::error(sprintf('Ship post %d not found', $postId));
        }

        try {
            $ship = $this->factory->build($postId);
        } catch (\InvalidArgumentException $e) {
            WP_CLI::error($e->getMessage());
        }

        if ($format === 'json') {
            $this->outputJson($ship, $shipPost);
            return;
        }

        $this->outputDiagnostic($ship, $shipPost);
    }

    /**
     * List all ships.
     *
     * ## OPTIONS
     *
     * [--format=<format>]
     * : Output format. Options: table, json, ids. Default: table.
     *
     * ## EXAMPLES
     *
     *     # List all ships
     *     wp helm ship list
     *
     *     # Get ship IDs only
     *     wp helm ship list --format=ids
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function list(array $args, array $assoc_args): void
    {
        $format = $assoc_args['format'] ?? 'table';

        $posts = get_posts([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'ID',
            'order' => 'ASC',
        ]);

        if ($posts === []) {
            WP_CLI::log('No ships found.');
            return;
        }

        if ($format === 'ids') {
            $ids = array_map(fn($p) => $p->ID, $posts);
            WP_CLI::log(implode(' ', $ids));
            return;
        }

        $rows = [];
        foreach ($posts as $post) {
            $shipPost = ShipPost::fromPost($post);
            $systems = $this->systemsRepository->find($post->ID);

            $rows[] = [
                'ID' => $post->ID,
                'Name' => $post->post_title,
                'Owner' => $post->post_author,
                'Core' => $systems?->coreType->label() ?? 'N/A',
                'Drive' => $systems?->driveType->label() ?? 'N/A',
                'Core Life' => $systems !== null ? sprintf('%.1f ly', $systems->coreLife) : 'N/A',
            ];
        }

        if ($format === 'json') {
            WP_CLI::log(json_encode($rows, JSON_PRETTY_PRINT));
            return;
        }

        WP_CLI\Utils\format_items('table', $rows, ['ID', 'Name', 'Owner', 'Core', 'Drive', 'Core Life']);
    }

    /**
     * Output diagnostic as formatted table.
     */
    private function outputDiagnostic(ShipLink $ship, ShipPost $shipPost): void
    {
        $model = $ship->getModel();

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  SHIP DIAGNOSTIC: %W' . $model->name . '%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');

        // Identity
        WP_CLI::log(WP_CLI::colorize('%Y▸ IDENTITY%n'));
        WP_CLI::log(sprintf('  Post ID:    %d', $model->postId));
        WP_CLI::log(sprintf('  Ship ID:    %s', $shipPost->shipId()));
        WP_CLI::log(sprintf('  Owner:      %d', $model->ownerId));
        WP_CLI::log('');

        // Modules
        WP_CLI::log(WP_CLI::colorize('%Y▸ INSTALLED MODULES%n'));
        WP_CLI::log(sprintf('  Core:       %s', $model->coreType->label()));
        WP_CLI::log(sprintf('  Drive:      %s', $model->driveType->label()));
        WP_CLI::log(sprintf('  Sensors:    %s', $model->sensorType->label()));
        WP_CLI::log(sprintf('  Shields:    %s', $model->shieldType->label()));
        WP_CLI::log(sprintf('  Nav Comp:   %s', $model->navTier->label()));
        WP_CLI::log('');

        // Power System
        WP_CLI::log(WP_CLI::colorize('%Y▸ POWER SYSTEM%n'));
        $power = $ship->power();
        $powerPercent = $power->getMaxPower() > 0
            ? ($power->getCurrentPower() / $power->getMaxPower()) * 100
            : 0;
        WP_CLI::log(WP_CLI::colorize(sprintf(
            '  Power:      %.1f / %.1f (%s%.0f%%%s)',
            $power->getCurrentPower(),
            $power->getMaxPower(),
            $this->getColorForPercent($powerPercent),
            $powerPercent,
            '%n'
        )));
        WP_CLI::log(sprintf('  Regen:      %.1f units/hour', $power->getRegenRate()));
        WP_CLI::log(sprintf('  Output:     %.2fx multiplier', $power->getOutputMultiplier()));
        WP_CLI::log('');

        // Core Life
        WP_CLI::log(WP_CLI::colorize('%Y▸ CORE LIFE%n'));
        $corePercent = $model->coreType->coreLife() > 0
            ? ($power->getCoreLife() / $model->coreType->coreLife()) * 100
            : 0;
        WP_CLI::log(WP_CLI::colorize(sprintf(
            '  Remaining:  %.1f / %.1f ly (%s%.0f%%%s)',
            $power->getCoreLife(),
            $model->coreType->coreLife(),
            $this->getColorForPercent($corePercent),
            $corePercent,
            '%n'
        )));
        WP_CLI::log(WP_CLI::colorize(sprintf('  Status:     %s', $power->isDepleted() ? '%RDEPLETED%n' : '%GOPERATIONAL%n')));
        WP_CLI::log('');

        // Propulsion
        WP_CLI::log(WP_CLI::colorize('%Y▸ PROPULSION%n'));
        $propulsion = $ship->propulsion();
        WP_CLI::log(sprintf('  Max Range:  %.2f ly', $propulsion->getMaxRange()));
        WP_CLI::log(sprintf('  Sustain:    %.1f ly (base)', $propulsion->getSustain()));
        WP_CLI::log(sprintf('  Perf Ratio: %.2f', $propulsion->getPerformanceRatio()));
        WP_CLI::log(sprintf('  5 ly jump:  %d seconds', $propulsion->getJumpDuration(5.0)));
        WP_CLI::log('');

        // Sensors
        WP_CLI::log(WP_CLI::colorize('%Y▸ SENSORS%n'));
        $sensors = $ship->sensors();
        WP_CLI::log(sprintf('  Range:      %.2f ly (effective)', $sensors->getRange()));
        WP_CLI::log(sprintf('  Base Range: %.1f ly', $sensors->getBaseRange()));
        WP_CLI::log(sprintf('  Accuracy:   %.0f%%', $sensors->getScanSuccessChance() * 100));
        WP_CLI::log('');

        // Shields
        WP_CLI::log(WP_CLI::colorize('%Y▸ SHIELDS%n'));
        $shields = $ship->shields();
        $shieldPercent = $shields->getMaxStrength() > 0
            ? ($shields->getCurrentStrength() / $shields->getMaxStrength()) * 100
            : 0;
        WP_CLI::log(WP_CLI::colorize(sprintf(
            '  Strength:   %.1f / %.1f (%s%.0f%%%s)',
            $shields->getCurrentStrength(),
            $shields->getMaxStrength(),
            $this->getColorForPercent($shieldPercent),
            $shieldPercent,
            '%n'
        )));
        WP_CLI::log(sprintf('  Regen:      %.1f units/hour', $shields->getRegenRate()));
        WP_CLI::log('');

        // Hull
        WP_CLI::log(WP_CLI::colorize('%Y▸ HULL%n'));
        $hull = $ship->hull();
        $hullPercent = $hull->getIntegrityPercent() * 100;
        WP_CLI::log(WP_CLI::colorize(sprintf(
            '  Integrity:  %.1f / %.1f (%s%.0f%%%s)',
            $hull->getIntegrity(),
            $hull->getMaxIntegrity(),
            $this->getColorForPercent($hullPercent),
            $hullPercent,
            '%n'
        )));
        WP_CLI::log(WP_CLI::colorize(sprintf('  Status:     %s', $model->isDestroyed() ? '%RDESTROYED%n' : '%GINTACT%n')));
        WP_CLI::log('');

        // Navigation
        WP_CLI::log(WP_CLI::colorize('%Y▸ NAVIGATION%n'));
        $nav = $ship->navigation();
        $position = $nav->getCurrentPosition();
        WP_CLI::log(sprintf('  Position:   %s', $position !== null ? "Node #$position" : 'Unknown'));
        WP_CLI::log(sprintf('  Nav Skill:  %.0f%%', $nav->getSkill() * 100));
        WP_CLI::log(sprintf('  Efficiency: %.0f%%', $nav->getEfficiency() * 100));
        WP_CLI::log('');

        // Cargo
        WP_CLI::log(WP_CLI::colorize('%Y▸ CARGO%n'));
        if ($model->cargo === []) {
            WP_CLI::log('  (empty)');
        } else {
            foreach ($model->cargo as $resource => $quantity) {
                WP_CLI::log(sprintf('  %s: %d', ucfirst($resource), $quantity));
            }
        }
        WP_CLI::log('');

        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
    }

    /**
     * Output diagnostic as JSON.
     */
    private function outputJson(ShipLink $ship, ShipPost $shipPost): void
    {
        $model = $ship->getModel();
        $power = $ship->power();
        $propulsion = $ship->propulsion();
        $sensors = $ship->sensors();
        $shields = $ship->shields();
        $hull = $ship->hull();
        $nav = $ship->navigation();

        $data = [
            'identity' => [
                'post_id' => $model->postId,
                'ship_id' => $shipPost->shipId(),
                'name' => $model->name,
                'owner_id' => $model->ownerId,
            ],
            'modules' => [
                'core' => [
                    'type' => $model->coreType->slug(),
                    'label' => $model->coreType->label(),
                ],
                'drive' => [
                    'type' => $model->driveType->slug(),
                    'label' => $model->driveType->label(),
                ],
                'sensors' => [
                    'type' => $model->sensorType->slug(),
                    'label' => $model->sensorType->label(),
                ],
                'shields' => [
                    'type' => $model->shieldType->slug(),
                    'label' => $model->shieldType->label(),
                ],
                'nav_computer' => [
                    'tier' => $model->navTier->value,
                    'label' => $model->navTier->label(),
                ],
            ],
            'power' => [
                'current' => $power->getCurrentPower(),
                'max' => $power->getMaxPower(),
                'regen_rate' => $power->getRegenRate(),
                'output_multiplier' => $power->getOutputMultiplier(),
            ],
            'core_life' => [
                'remaining' => $power->getCoreLife(),
                'max' => $model->coreType->coreLife(),
                'depleted' => $power->isDepleted(),
            ],
            'propulsion' => [
                'max_range' => $propulsion->getMaxRange(),
                'sustain' => $propulsion->getSustain(),
                'performance_ratio' => $propulsion->getPerformanceRatio(),
                'consumption' => $propulsion->getConsumption(),
            ],
            'sensors' => [
                'effective_range' => $sensors->getRange(),
                'base_range' => $sensors->getBaseRange(),
                'scan_success_chance' => $sensors->getScanSuccessChance(),
            ],
            'shields' => [
                'current' => $shields->getCurrentStrength(),
                'max' => $shields->getMaxStrength(),
                'regen_rate' => $shields->getRegenRate(),
            ],
            'hull' => [
                'integrity' => $hull->getIntegrity(),
                'max' => $hull->getMaxIntegrity(),
                'percent' => $hull->getIntegrityPercent(),
                'destroyed' => $model->isDestroyed(),
            ],
            'navigation' => [
                'position_node_id' => $nav->getCurrentPosition(),
                'skill' => $nav->getSkill(),
                'efficiency' => $nav->getEfficiency(),
            ],
            'cargo' => $model->cargo,
        ];

        WP_CLI::log(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Get color code for a percentage value.
     */
    private function getColorForPercent(float $percent): string
    {
        if ($percent >= 75) {
            return '%G'; // Green
        }
        if ($percent >= 50) {
            return '%Y'; // Yellow
        }
        if ($percent >= 25) {
            return '%C'; // Cyan (orange-ish in some terminals)
        }
        return '%R'; // Red
    }
}
