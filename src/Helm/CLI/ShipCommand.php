<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Navigation\NodeRepository;
use Helm\PostTypes\PostTypeRegistry;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipSystemsRepository;
use Helm\Ships\ShipPost;
use Helm\Stars\StarPost;
use WP_CLI;

/**
 * Ship management commands.
 */
class ShipCommand
{
    public function __construct(
        private readonly ShipFactory $factory,
        private readonly ShipSystemsRepository $systemsRepository,
        private readonly NodeRepository $nodeRepository,
        private readonly EdgeRepository $edgeRepository,
        private readonly NavigationService $navigationService,
        private readonly ActionFactory $actionFactory,
        private readonly ActionRepository $actionRepository,
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
     * Show astrometrics - nearby stars within sensor range.
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
     *     # Show nearby stars for ship 42
     *     wp helm ship astro 42
     *
     *     # Get astrometrics as JSON
     *     wp helm ship astro 42 --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function astro(array $args, array $assoc_args): void
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

        $positionNodeId = $ship->navigation()->getCurrentPosition();

        if ($positionNodeId === null) {
            WP_CLI::error('Ship has no known position. Assign to a node first.');
        }

        $sensorRange = $ship->sensors()->getRange();

        // Get nearby stars with batch-loaded relations (no N+1)
        $nearbyStars = $this->navigationService->getNearbyStars($positionNodeId, $sensorRange);

        // Get current location name
        $currentNode = $this->nodeRepository->get($positionNodeId);
        $currentLocationName = 'Unknown';
        if ($currentNode !== null) {
            if ($currentNode->isStar() && $currentNode->starPostId !== null) {
                $currentStarPost = StarPost::fromId($currentNode->starPostId);
                if ($currentStarPost !== null) {
                    $currentLocationName = $currentStarPost->displayName();
                }
            } else {
                $currentLocationName = sprintf('Waypoint #%d', $currentNode->id);
            }
        }

        // Convert to display format (already sorted by distance)
        $stars = array_map(fn($nearby) => [
            'node_id' => $nearby->node->id,
            'name' => $nearby->star->displayName(),
            'distance' => $nearby->distance,
            'has_route' => $nearby->hasRoute,
        ], $nearbyStars);

        if ($format === 'json') {
            $this->outputAstroJson($ship->getName(), $currentLocationName, $currentNode->id, $sensorRange, $stars);
            return;
        }

        $this->outputAstroTable($ship->getName(), $currentLocationName, $currentNode->id, $sensorRange, $ship, $stars);
    }

    /**
     * Output astrometrics as formatted table.
     *
     * @param array<array{node_id: int, name: string, distance: float, has_route: bool}> $stars
     */
    private function outputAstroTable(
        string $shipName,
        string $locationName,
        int $nodeId,
        float $sensorRange,
        ShipLink $ship,
        array $stars
    ): void {
        $sensors = $ship->sensors();
        $power = $ship->power();

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  ASTROMETRICS: %W' . $shipName . '%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');

        WP_CLI::log(WP_CLI::colorize('%Y▸ POSITION%n'));
        WP_CLI::log(sprintf('  Location:     %s (Node #%d)', $locationName, $nodeId));
        WP_CLI::log(
            sprintf(
                '  Sensor Range: %.2f ly (%s × %.2f output)',
                $sensorRange,
                $ship->getRecord()->sensor_type->label(),
                $power->getOutputMultiplier()
            )
        );
        WP_CLI::log('');

        WP_CLI::log(WP_CLI::colorize('%Y▸ NEARBY STARS%n'));

        if ($stars === []) {
            WP_CLI::log('  No stars within sensor range.');
        } else {
            foreach ($stars as $star) {
                $routeIndicator = $star['has_route']
                    ? WP_CLI::colorize('%G[route]%n')
                    : WP_CLI::colorize('%Y[no route]%n');

                WP_CLI::log(
                    sprintf(
                        '  %4d  %-20s %6.2f ly  %s',
                        $star['node_id'],
                        $star['name'],
                        $star['distance'],
                        $routeIndicator
                    )
                );
            }
        }

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
    }

    /**
     * Output astrometrics as JSON.
     *
     * @param array<array{node_id: int, name: string, distance: float, has_route: bool}> $stars
     */
    private function outputAstroJson(
        string $shipName,
        string $locationName,
        int $nodeId,
        float $sensorRange,
        array $stars
    ): void {
        $data = [
            'ship' => $shipName,
            'position' => [
                'name' => $locationName,
                'node_id' => $nodeId,
            ],
            'sensor_range' => $sensorRange,
            'nearby_stars' => array_map(fn($s) => [
                'node_id' => $s['node_id'],
                'name' => $s['name'],
                'distance_ly' => round($s['distance'], 2),
                'route_known' => $s['has_route'],
            ], $stars),
        ];

        WP_CLI::log(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
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
                'Core' => $systems?->core_type->label() ?? 'N/A',
                'Drive' => $systems?->drive_type->label() ?? 'N/A',
                'Core Life' => $systems !== null ? sprintf('%.1f ly', $systems->core_life) : 'N/A',
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
        $record = $ship->getRecord();

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  SHIP DIAGNOSTIC: %W' . $ship->getName() . '%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');

        // Identity
        WP_CLI::log(WP_CLI::colorize('%Y▸ IDENTITY%n'));
        WP_CLI::log(sprintf('  Post ID:    %d', $ship->getId()));
        WP_CLI::log(sprintf('  Ship ID:    %s', $shipPost->shipId()));
        WP_CLI::log(sprintf('  Owner:      %d', $ship->getOwnerId()));
        WP_CLI::log('');

        // Modules
        WP_CLI::log(WP_CLI::colorize('%Y▸ INSTALLED MODULES%n'));
        WP_CLI::log(sprintf('  Core:       %s', $record->core_type->label()));
        WP_CLI::log(sprintf('  Drive:      %s', $record->drive_type->label()));
        WP_CLI::log(sprintf('  Sensors:    %s', $record->sensor_type->label()));
        WP_CLI::log(sprintf('  Shields:    %s', $record->shield_type->label()));
        WP_CLI::log(sprintf('  Nav Comp:   %s', $record->nav_tier->label()));
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
        $corePercent = $record->core_type->coreLife() > 0
            ? ($power->getCoreLife() / $record->core_type->coreLife()) * 100
            : 0;
        WP_CLI::log(WP_CLI::colorize(sprintf(
            '  Remaining:  %.1f / %.1f ly (%s%.0f%%%s)',
            $power->getCoreLife(),
            $record->core_type->coreLife(),
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
        WP_CLI::log(WP_CLI::colorize(sprintf('  Status:     %s', $hull->isDestroyed() ? '%RDESTROYED%n' : '%GINTACT%n')));
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
        if ($record->cargo === []) {
            WP_CLI::log('  (empty)');
        } else {
            foreach ($record->cargo as $resource => $quantity) {
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
        $record = $ship->getRecord();
        $power = $ship->power();
        $propulsion = $ship->propulsion();
        $sensors = $ship->sensors();
        $shields = $ship->shields();
        $hull = $ship->hull();
        $nav = $ship->navigation();

        $data = [
            'identity' => [
                'post_id' => $ship->getId(),
                'ship_id' => $shipPost->shipId(),
                'name' => $ship->getName(),
                'owner_id' => $ship->getOwnerId(),
            ],
            'modules' => [
                'core' => [
                    'type' => $record->core_type->slug(),
                    'label' => $record->core_type->label(),
                ],
                'drive' => [
                    'type' => $record->drive_type->slug(),
                    'label' => $record->drive_type->label(),
                ],
                'sensors' => [
                    'type' => $record->sensor_type->slug(),
                    'label' => $record->sensor_type->label(),
                ],
                'shields' => [
                    'type' => $record->shield_type->slug(),
                    'label' => $record->shield_type->label(),
                ],
                'nav_computer' => [
                    'tier' => $record->nav_tier->value,
                    'label' => $record->nav_tier->label(),
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
                'max' => $record->core_type->coreLife(),
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
                'destroyed' => $hull->isDestroyed(),
            ],
            'navigation' => [
                'position_node_id' => $nav->getCurrentPosition(),
                'skill' => $nav->getSkill(),
                'efficiency' => $nav->getEfficiency(),
            ],
            'cargo' => $record->cargo,
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

    /**
     * Jump to a node (god mode - instant teleport).
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the ship.
     *
     * --target=<node-id>
     * : The target node ID to jump to.
     *
     * ## EXAMPLES
     *
     *     # Jump ship 1 to node 5 (Proxima Centauri)
     *     wp helm ship jump 1 --target=5
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function jump(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);
        $targetNodeId = (int) ($assoc_args['target'] ?? 0);

        if ($postId <= 0) {
            WP_CLI::error('Please provide a valid ship post ID');
        }

        if ($targetNodeId <= 0) {
            WP_CLI::error('Please provide a target node ID with --target=<node-id>');
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

        $record = $ship->getRecord();
        $currentNodeId = $ship->navigation()->getCurrentPosition();

        // Get target node
        $targetNode = $this->nodeRepository->get($targetNodeId);
        if ($targetNode === null) {
            WP_CLI::error(sprintf('Target node %d not found', $targetNodeId));
        }

        // Get target name
        $targetName = sprintf('Node #%d', $targetNodeId);
        if ($targetNode->isStar() && $targetNode->starPostId !== null) {
            $targetStarPost = StarPost::fromId($targetNode->starPostId);
            if ($targetStarPost !== null) {
                $targetName = $targetStarPost->displayName();
            }
        }

        // Calculate distance (if we have a current position)
        $distance = 0.0;
        if ($currentNodeId !== null) {
            $currentNode = $this->nodeRepository->get($currentNodeId);
            if ($currentNode !== null) {
                $distance = $currentNode->distanceTo($targetNode);
            }
        }

        // Calculate what it WOULD cost in normal play
        $propulsion = $ship->propulsion();
        $power = $ship->power();

        $coreCost = $distance
            * $record->core_type->jumpCostMultiplier()
            * $propulsion->getCoreDecayMultiplier()
            * $power->getDecayMultiplier();
        $duration = $propulsion->getJumpDuration($distance);
        $maxRange = $propulsion->getMaxRange();
        $hasRoute = $currentNodeId !== null && $this->edgeRepository->exists($currentNodeId, $targetNodeId);

        // Create route using navigation system (god mode = skill 1.0, efficiency 1.0)
        $scanResult = null;
        $waypointsCreated = 0;
        $edgesCreated = 0;

        if ($currentNodeId !== null && !$hasRoute) {
            $scanResult = $this->navigationService->scan(
                fromNodeId: $currentNodeId,
                toNodeId: $targetNodeId,
                skill: 1.0,
                efficiency: 1.0,
            );

            if (!$scanResult->failed) {
                // Count waypoints (nodes that aren't stars)
                foreach ($scanResult->nodes as $node) {
                    if (!$node->isStar()) {
                        $waypointsCreated++;
                    }
                }
                $edgesCreated = count($scanResult->edges);
            }
        }

        // Execute the jump (god mode - no checks)
        // Mutate the systems record directly (CLI has god-mode access)
        $record->node_id = $targetNodeId;

        // Save state
        $this->systemsRepository->save($record);

        // Output
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  JUMP COMPLETE (GOD MODE)%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');
        WP_CLI::log(sprintf('  Ship:        %s', $ship->getName()));
        WP_CLI::log(sprintf('  Destination: %s (Node #%d)', $targetName, $targetNodeId));
        WP_CLI::log(sprintf('  Distance:    %.2f ly', $distance));
        WP_CLI::log('');

        if ($scanResult !== null && !$scanResult->failed) {
            WP_CLI::log(WP_CLI::colorize('%Y▸ ROUTE DISCOVERED:%n'));
            WP_CLI::log(sprintf('  Waypoints:   %d', $waypointsCreated));
            WP_CLI::log(sprintf('  Edges:       %d', $edgesCreated));
            WP_CLI::log(sprintf('  Complete:    %s', $scanResult->complete ? 'Yes' : 'Partial'));
            WP_CLI::log('');
        } elseif ($hasRoute) {
            WP_CLI::log(WP_CLI::colorize('%Y▸ ROUTE:%n'));
            WP_CLI::log('  Using existing route');
            WP_CLI::log('');
        }

        WP_CLI::log(WP_CLI::colorize('%Y▸ NORMAL PLAY WOULD REQUIRE:%n'));
        WP_CLI::log(sprintf('  In range:    %s (max %.2f ly)', $distance <= $maxRange ? 'Yes' : WP_CLI::colorize('%RNo%n'), $maxRange));
        WP_CLI::log(sprintf('  Core cost:   %.2f ly', $coreCost));
        WP_CLI::log(sprintf('  Duration:    %s', $this->formatDuration($duration)));
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
    }

    /**
     * Scan for a route to a target node (god mode - instant).
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the ship.
     *
     * --target=<node-id>
     * : The target node ID to scan for a route to.
     *
     * ## EXAMPLES
     *
     *     # Scan for route from ship 1's position to node 5
     *     wp helm ship scan-route 1 --target=5
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function scanRoute(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);
        $targetNodeId = (int) ($assoc_args['target'] ?? 0);

        if ($postId <= 0) {
            WP_CLI::error('Please provide a valid ship post ID');
        }

        if ($targetNodeId <= 0) {
            WP_CLI::error('Please provide a target node ID with --target=<node-id>');
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

        $currentNodeId = $ship->navigation()->getCurrentPosition();

        if ($currentNodeId === null) {
            WP_CLI::error('Ship has no known position. Use jump command first.');
        }

        $currentNode = $this->nodeRepository->get($currentNodeId);
        if ($currentNode === null) {
            WP_CLI::error(sprintf('Current node %d not found', $currentNodeId));
        }

        $targetNode = $this->nodeRepository->get($targetNodeId);
        if ($targetNode === null) {
            WP_CLI::error(sprintf('Target node %d not found', $targetNodeId));
        }

        // Get names
        $currentName = sprintf('Node #%d', $currentNodeId);
        if ($currentNode->isStar() && $currentNode->starPostId !== null) {
            $currentStarPost = StarPost::fromId($currentNode->starPostId);
            if ($currentStarPost !== null) {
                $currentName = $currentStarPost->displayName();
            }
        }

        $targetName = sprintf('Node #%d', $targetNodeId);
        if ($targetNode->isStar() && $targetNode->starPostId !== null) {
            $targetStarPost = StarPost::fromId($targetNode->starPostId);
            if ($targetStarPost !== null) {
                $targetName = $targetStarPost->displayName();
            }
        }

        $distance = $currentNode->distanceTo($targetNode);
        $sensors = $ship->sensors();
        $sensorRange = $sensors->getRange();
        $inRange = $distance <= $sensorRange;

        // Check if route already exists
        $routeExists = $this->edgeRepository->exists($currentNodeId, $targetNodeId);

        // Calculate what it would cost
        $powerCost = $sensors->getRouteScanCost($distance);
        $duration = $sensors->getRouteScanDuration($distance);
        $successChance = $sensors->getScanSuccessChance();

        // Output header
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  ROUTE SCAN (GOD MODE)%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');
        WP_CLI::log(sprintf('  Ship:     %s', $ship->getName()));
        WP_CLI::log(sprintf('  From:     %s', $currentName));
        WP_CLI::log(sprintf('  To:       %s', $targetName));
        WP_CLI::log(sprintf('  Distance: %.2f ly', $distance));
        WP_CLI::log('');

        if ($routeExists) {
            WP_CLI::log(WP_CLI::colorize('%Y▸ ROUTE ALREADY KNOWN%n'));
            WP_CLI::log('  No scan needed - route already discovered.');
        } else {
            // Create the edge (god mode - instant discovery)
            $this->edgeRepository->create(
                $currentNodeId,
                $targetNodeId,
                $distance,
                $shipPost->shipId(),
            );

            WP_CLI::log(WP_CLI::colorize('%Y▸ ROUTE DISCOVERED%n'));
            WP_CLI::log(sprintf('  In range:       %s (sensor range %.2f ly)', $inRange ? 'Yes' : WP_CLI::colorize('%RNo - would fail%n'), $sensorRange));
            WP_CLI::log(sprintf('  Success chance: %.0f%%', $successChance * 100));
        }

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%Y▸ NORMAL PLAY WOULD REQUIRE:%n'));
        WP_CLI::log(sprintf('  Power cost: %.1f units', $powerCost));
        WP_CLI::log(sprintf('  Duration:   %s', $this->formatDuration($duration)));
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
    }

    /**
     * Initiate travel to a star (real async jump).
     *
     * This queues a jump action that will complete after the travel duration.
     * The ship cannot perform other actions while traveling.
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the ship.
     *
     * --target=<node-id>
     * : The target node ID to travel to.
     *
     * ## EXAMPLES
     *
     *     # Start travel from ship 1 to node 5 (Proxima Centauri)
     *     wp helm ship travel 1 --target=5
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function travel(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);
        $targetNodeId = (int) ($assoc_args['target'] ?? 0);

        if ($postId <= 0) {
            WP_CLI::error('Please provide a valid ship post ID');
        }

        if ($targetNodeId <= 0) {
            WP_CLI::error('Please provide a target node ID with --target=<node-id>');
        }

        $shipPost = ShipPost::fromId($postId);
        if ($shipPost === null) {
            WP_CLI::error(sprintf('Ship post %d not found', $postId));
        }

        // Get target node info
        $targetNode = $this->nodeRepository->get($targetNodeId);
        if ($targetNode === null) {
            WP_CLI::error(sprintf('Target node %d not found', $targetNodeId));
        }

        $targetName = sprintf('Node #%d', $targetNodeId);
        if ($targetNode->isStar() && $targetNode->starPostId !== null) {
            $targetStarPost = StarPost::fromId($targetNode->starPostId);
            if ($targetStarPost !== null) {
                $targetName = $targetStarPost->displayName();
            }
        }

        // Get current position for output before dispatching
        $ship = $this->factory->build($postId);
        $currentNodeId = $ship->navigation()->getCurrentPosition();
        $currentName = 'Unknown';
        if ($currentNodeId !== null) {
            $currentNode = $this->nodeRepository->get($currentNodeId);
            if ($currentNode !== null && $currentNode->isStar() && $currentNode->starPostId !== null) {
                $currentStarPost = StarPost::fromId($currentNode->starPostId);
                if ($currentStarPost !== null) {
                    $currentName = $currentStarPost->displayName();
                }
            }
        }

        // Calculate distance
        $distance = 0.0;
        if ($currentNodeId !== null) {
            $currentNode = $this->nodeRepository->get($currentNodeId);
            if ($currentNode !== null) {
                $distance = $currentNode->distanceTo($targetNode);
            }
        }

        // Dispatch the jump action
        try {
            $result = $this->actionFactory->create($postId, ActionType::Jump, ['target_node_id' => $targetNodeId]);
        } catch (ActionException $e) {
            WP_CLI::error($e->getMessage());
        }

        $remainingSeconds = 0;
        if ($result->deferred_until !== null) {
            $remainingSeconds = max(0, $result->deferred_until->getTimestamp() - time());
        }

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  JUMP INITIATED%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');
        WP_CLI::log(sprintf('  Ship:        %s', $shipPost->name()));
        WP_CLI::log(sprintf('  From:        %s', $currentName));
        WP_CLI::log(sprintf('  To:          %s (Node #%d)', $targetName, $targetNodeId));
        WP_CLI::log(sprintf('  Distance:    %.2f ly', $distance));
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%Y▸ TRAVEL TIME%n'));
        WP_CLI::log(sprintf('  Duration:    %s', $this->formatDuration($remainingSeconds)));
        WP_CLI::log(sprintf('  Arrives at:  %s', $result->deferred_until?->format('Y-m-d H:i:s') ?? 'unknown'));
        WP_CLI::log(sprintf('  Action ID:   %d', $result->id));
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');
        WP_CLI::log('Use "wp helm ship status ' . $postId . '" to check travel progress.');
    }

    /**
     * Show ship status including any in-progress actions.
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the ship.
     *
     * ## EXAMPLES
     *
     *     # Check status of ship 1
     *     wp helm ship status 1
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function status(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);

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

        $currentNodeId = $ship->navigation()->getCurrentPosition();

        // Get current location name
        $currentName = 'Unknown';
        if ($currentNodeId !== null) {
            $currentNode = $this->nodeRepository->get($currentNodeId);
            if ($currentNode !== null && $currentNode->isStar() && $currentNode->starPostId !== null) {
                $currentStarPost = StarPost::fromId($currentNode->starPostId);
                if ($currentStarPost !== null) {
                    $currentName = $currentStarPost->displayName();
                }
            }
        }

        // Check for current action
        $currentAction = $this->actionRepository->findCurrentForShip($postId);

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  SHIP STATUS: %W' . $ship->getName() . '%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');
        WP_CLI::log(sprintf('  Location:   %s (Node #%d)', $currentName, $currentNodeId ?? 0));
        WP_CLI::log(sprintf('  Core Life:  %.1f ly remaining', $ship->power()->getCoreLife()));
        WP_CLI::log('');

        if ($currentAction === null) {
            WP_CLI::log(WP_CLI::colorize('%Y▸ STATUS: %GIDLE%n'));
            WP_CLI::log('  Ship is ready for commands.');
        } else {
            $remaining = null;
            if ($currentAction->deferred_until !== null) {
                $remaining = max(0, $currentAction->deferred_until->getTimestamp() - time());
            }

            $actionLabel = $currentAction->type->label();
            $statusColor = $currentAction->status->value === 'pending' ? '%Y' : '%C';

            WP_CLI::log(WP_CLI::colorize('%Y▸ CURRENT ACTION%n'));
            WP_CLI::log(sprintf('  Type:       %s', $actionLabel));
            WP_CLI::log(WP_CLI::colorize(sprintf('  Status:     %s%s%%n', $statusColor, ucfirst($currentAction->status->value))));

            if ($currentAction->type === ActionType::Jump) {
                $targetNodeId = $currentAction->params['target_node_id'] ?? null;
                if ($targetNodeId !== null) {
                    $targetNode = $this->nodeRepository->get($targetNodeId);
                    $targetName = sprintf('Node #%d', $targetNodeId);
                    if ($targetNode !== null && $targetNode->isStar() && $targetNode->starPostId !== null) {
                        $targetStarPost = StarPost::fromId($targetNode->starPostId);
                        if ($targetStarPost !== null) {
                            $targetName = $targetStarPost->displayName();
                        }
                    }
                    WP_CLI::log(sprintf('  Target:     %s', $targetName));
                }
            }

            if ($remaining !== null && $currentAction->deferred_until !== null) {
                WP_CLI::log(sprintf('  Remaining:  %s', $this->formatDuration($remaining)));
                WP_CLI::log(sprintf('  Completes:  %s', $currentAction->deferred_until->format('Y-m-d H:i:s')));
            }

            WP_CLI::log(sprintf('  Action ID:  %d', $currentAction->id));
        }

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
    }

    /**
     * Cancel an in-progress action (e.g., cancel travel).
     *
     * ## OPTIONS
     *
     * <post-id>
     * : The WordPress post ID of the ship.
     *
     * ## EXAMPLES
     *
     *     # Cancel travel for ship 1
     *     wp helm ship cancel 1
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function cancel(array $args, array $assoc_args): void
    {
        $postId = (int) ($args[0] ?? 0);

        if ($postId <= 0) {
            WP_CLI::error('Please provide a valid ship post ID');
        }

        $shipPost = ShipPost::fromId($postId);
        if ($shipPost === null) {
            WP_CLI::error(sprintf('Ship post %d not found', $postId));
        }

        $action = $this->actionRepository->findCurrentForShip($postId);

        if ($action === null || $action->status !== ActionStatus::Pending) {
            WP_CLI::warning('No pending action to cancel.');
            return;
        }

        // Mark as failed (cancelled)
        $action->fail(ErrorCode::ActionCancelled->error(__('Action was cancelled', 'helm')));
        $this->actionRepository->update($action);

        // Clear ship's current action
        $this->systemsRepository->updateCurrentAction($postId, null);

        WP_CLI::success('Action cancelled.');
    }

    /**
     * Format duration in human readable form.
     */
    private function formatDuration(int $seconds): string
    {
        if ($seconds < 60) {
            return sprintf('%d seconds', $seconds);
        }
        if ($seconds < 3600) {
            $minutes = (int) floor($seconds / 60);
            $secs = $seconds % 60;
            return $secs > 0 ? sprintf('%d min %d sec', $minutes, $secs) : sprintf('%d min', $minutes);
        }

        $hours = (int) floor($seconds / 3600);
        $minutes = (int) floor(($seconds % 3600) / 60);
        return $minutes > 0 ? sprintf('%d hr %d min', $hours, $minutes) : sprintf('%d hr', $hours);
    }
}
