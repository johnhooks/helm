<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Lib\Date;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Ship;
use Helm\Simulation\Simulation;
use WP_CLI;

/**
 * Simulation commands — inspect ships and run scenarios without a database.
 *
 * Boots the simulation layer (in-memory repositories), creates ships,
 * dispatches actions, and reports results. Uses the same scenario JSON
 * format as the TS workbench.
 */
class SimCommand
{
    private const GRAPH_PATH = 'tests/_data/catalog/graph.json';
    private const START_TIME = '2025-01-01 00:00:00';

    private const SUPPORTED_ACTIONS = [
        'scan_route',
        'jump',
    ];

    /**
     * Inspect a simulated ship's system readings.
     *
     * Boots the simulation, creates a ship with the default loadout at
     * node 1, and dumps all system values. Quick way to verify
     * "what does this ship look like?" without a database.
     *
     * ## OPTIONS
     *
     * [--format=<format>]
     * : Output format. Options: table, json. Default: table.
     *
     * ## EXAMPLES
     *
     *     # Inspect a simulated ship
     *     wp helm sim ship
     *
     *     # Get ship data as JSON
     *     wp helm sim ship --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function ship(array $args, array $assoc_args): void
    {
        $format = $assoc_args['format'] ?? 'table';

        $sim = $this->boot();
        $ship = $sim->createShip('Pioneer', 1);

        if ($format === 'json') {
            $this->outputShipJson($ship);
            return;
        }

        $this->outputShipTable($ship);
    }

    /**
     * Run a scenario file through the real PHP game code.
     *
     * Reads the same scenario JSON format as the TS workbench. Each action
     * is dispatched, time advances until it resolves, and a state snapshot
     * is captured. Only scan_route and jump actions are supported.
     *
     * ## OPTIONS
     *
     * <scenario>
     * : Path to the scenario JSON file.
     *
     * [--format=<format>]
     * : Output format. Options: table, json. Default: table.
     *
     * ## EXAMPLES
     *
     *     # Run a scenario
     *     wp helm sim run resources/packages/workbench/data/scenarios/scan-and-jump.json
     *
     *     # Run scenario and get JSON output
     *     wp helm sim run resources/packages/workbench/data/scenarios/scan-and-jump.json --format=json
     *
     * @when after_wp_load
     *
     * @param array<string> $args
     * @param array<string, string> $assoc_args
     */
    public function run(array $args, array $assoc_args): void
    {
        $scenarioPath = $args[0] ?? null;
        $format = $assoc_args['format'] ?? 'table';

        if ($scenarioPath === null) {
            WP_CLI::error('Please provide a path to a scenario JSON file.');
        }

        if (!file_exists($scenarioPath)) {
            WP_CLI::error(sprintf('Scenario file not found: %s', $scenarioPath));
        }

        $json = file_get_contents($scenarioPath);
        if ($json === false) {
            WP_CLI::error(sprintf('Cannot read scenario file: %s', $scenarioPath));
        }

        /** @var array{name: string, description: string, masterSeed?: string, ships: array<string, array{node?: int}>, actions: array<array{ship: string, type: string, params?: array<string, mixed>}>} $scenario */
        $scenario = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        $sim = $this->boot();
        $sim->seedGraph($this->graphPath());

        // Create ships
        /** @var array<string, int> Ship name → post ID */
        $shipMap = [];
        foreach ($scenario['ships'] as $name => $spec) {
            $nodeId = $spec['node'] ?? 1;
            $ship = $sim->createShipAtNode(ucfirst($name), 1, $nodeId);
            $shipMap[$name] = $ship->getId();
        }

        // Initial snapshot
        $timeline = [];
        $timeline[] = $this->buildTimelineEntry(
            $sim,
            $shipMap,
            0,
            null,
            null,
        );

        // Execute actions
        $startTimestamp = Date::now()->getTimestamp();

        foreach ($scenario['actions'] as $actionSpec) {
            $shipName = $actionSpec['ship'];
            $typeString = $actionSpec['type'];
            $params = $actionSpec['params'] ?? [];

            if (!in_array($typeString, self::SUPPORTED_ACTIONS, true)) {
                WP_CLI::warning(sprintf('Skipping unsupported action type: %s', $typeString));
                continue;
            }

            $shipPostId = $shipMap[$shipName] ?? null;
            if ($shipPostId === null) {
                WP_CLI::warning(sprintf('Unknown ship: %s', $shipName));
                continue;
            }

            $type = ActionType::from($typeString);
            $action = $sim->dispatch($shipPostId, $type, $params);
            $sim->advanceUntilIdle();

            // Reload the action to get its result
            $resolved = $sim->findAction($action->id);
            $actionResult = $resolved?->result;

            $elapsed = Date::now()->getTimestamp() - $startTimestamp;

            $timeline[] = $this->buildTimelineEntry(
                $sim,
                $shipMap,
                $elapsed,
                ['ship' => $shipName, 'type' => $typeString, 'params' => $params],
                $actionResult,
            );
        }

        if ($format === 'json') {
            $this->outputRunJson($scenario, $timeline);
            return;
        }

        $this->outputRunTable($scenario, $timeline);
    }

    /**
     * Boot the simulation layer.
     */
    private function boot(): Simulation
    {
        $provider = new \Helm\Simulation\Provider(helm()->getContainer());
        $provider->register();
        $provider->boot();

        Date::setTestNow(self::START_TIME);

        return helm(Simulation::class);
    }

    /**
     * Get the path to the navigation graph JSON.
     */
    private function graphPath(): string
    {
        return dirname(__DIR__, 3) . '/' . self::GRAPH_PATH;
    }

    /**
     * Build a state snapshot for a ship.
     *
     * @return array<string, mixed>
     */
    private function snapshotShip(Ship $ship): array
    {
        $power = $ship->power();
        $shields = $ship->shields();
        $hull = $ship->hull();
        $nav = $ship->navigation();

        return [
            'power' => round($power->getCurrentPower(), 1),
            'powerMax' => round($power->getMaxPower(), 1),
            'shield' => round($shields->getCurrentStrength(), 1),
            'shieldMax' => round($shields->getMaxStrength(), 1),
            'hull' => round($hull->getIntegrity(), 1),
            'hullMax' => round($hull->getMaxIntegrity(), 1),
            'coreLife' => round($power->getCoreLife(), 1),
            'nodeId' => $nav->getCurrentPosition(),
        ];
    }

    /**
     * Build a timeline entry with all ship snapshots.
     *
     * @param array<string, int> $shipMap
     * @param array{ship: string, type: string, params: array<string, mixed>}|null $action
     * @param array<string, mixed>|null $result
     * @return array<string, mixed>
     */
    private function buildTimelineEntry(
        Simulation $sim,
        array $shipMap,
        int $elapsed,
        ?array $action,
        ?array $result,
    ): array {
        $ships = [];
        foreach ($shipMap as $name => $postId) {
            $ship = $sim->getShip($postId);
            $ships[$name] = $this->snapshotShip($ship);
        }

        return [
            't' => $elapsed,
            'action' => $action,
            'result' => $result,
            'ships' => $ships,
        ];
    }

    // ─── Ship output ──────────────────────────────────────────────

    /**
     * Output simulated ship as formatted table.
     */
    private function outputShipTable(Ship $ship): void
    {
        $power = $ship->power();
        $shields = $ship->shields();
        $propulsion = $ship->propulsion();
        $sensors = $ship->sensors();
        $hull = $ship->hull();
        $nav = $ship->navigation();

        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  SIMULATED SHIP: %W' . $ship->getName() . '%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════%n'));
        WP_CLI::log('');

        // Power
        WP_CLI::log(WP_CLI::colorize('%Y▸ POWER%n'));
        WP_CLI::log(sprintf('  Current Power   %.1f / %.1f', $power->getCurrentPower(), $power->getMaxPower()));
        WP_CLI::log(sprintf('  Regen Rate      %.1f /hr', $power->getRegenRate()));
        WP_CLI::log(sprintf('  Output Mult     %.2f', $power->getOutputMultiplier()));
        WP_CLI::log(sprintf('  Core Life       %d', (int) $power->getCoreLife()));
        WP_CLI::log('');

        // Shields
        WP_CLI::log(WP_CLI::colorize('%Y▸ SHIELDS%n'));
        WP_CLI::log(sprintf('  Strength        %.1f / %.1f', $shields->getCurrentStrength(), $shields->getMaxStrength()));
        WP_CLI::log(sprintf('  Regen Rate      %.1f /hr', $shields->getRegenRate()));
        WP_CLI::log('');

        // Propulsion
        WP_CLI::log(WP_CLI::colorize('%Y▸ PROPULSION%n'));
        WP_CLI::log(sprintf('  Perf Ratio      %.2f', $propulsion->getPerformanceRatio()));
        WP_CLI::log(sprintf('  Comfort Range   %.1f ly', $propulsion->getSustain()));
        $jumpDuration = $propulsion->getJumpDuration(5.0);
        $jumpHours = $jumpDuration / 3600.0;
        WP_CLI::log(sprintf(
            '  Jump (5 ly)     %ds (%.1fh)  cost: %.1f core',
            $jumpDuration,
            $jumpHours,
            $propulsion->calculateCoreCost(5.0),
        ));
        WP_CLI::log('');

        // Sensors
        WP_CLI::log(WP_CLI::colorize('%Y▸ SENSORS%n'));
        WP_CLI::log(sprintf('  Range           %.1f ly', $sensors->getRange()));
        $scanDuration = $sensors->getRouteScanDuration(3.0);
        $scanHours = $scanDuration / 3600.0;
        WP_CLI::log(sprintf(
            '  Scan (3 ly)     %ds (%.1fh)  cost: %.1f power',
            $scanDuration,
            $scanHours,
            $sensors->getRouteScanCost(3.0),
        ));
        WP_CLI::log('');

        // Hull
        WP_CLI::log(WP_CLI::colorize('%Y▸ HULL%n'));
        WP_CLI::log(sprintf('  Integrity       %d / %d', (int) $hull->getIntegrity(), (int) $hull->getMaxIntegrity()));
        WP_CLI::log('');

        // Position
        WP_CLI::log(WP_CLI::colorize('%Y▸ POSITION%n'));
        $position = $nav->getCurrentPosition();
        WP_CLI::log(sprintf('  Node            %s', $position !== null ? (string) $position : 'Unknown'));
        WP_CLI::log('');
    }

    /**
     * Output simulated ship as JSON.
     */
    private function outputShipJson(Ship $ship): void
    {
        $power = $ship->power();
        $shields = $ship->shields();
        $propulsion = $ship->propulsion();
        $sensors = $ship->sensors();
        $hull = $ship->hull();
        $nav = $ship->navigation();

        $data = [
            'name' => $ship->getName(),
            'power' => [
                'current' => round($power->getCurrentPower(), 1),
                'max' => round($power->getMaxPower(), 1),
                'regen_rate' => round($power->getRegenRate(), 1),
                'output_multiplier' => round($power->getOutputMultiplier(), 2),
                'core_life' => round($power->getCoreLife(), 1),
            ],
            'shields' => [
                'current' => round($shields->getCurrentStrength(), 1),
                'max' => round($shields->getMaxStrength(), 1),
                'regen_rate' => round($shields->getRegenRate(), 1),
            ],
            'propulsion' => [
                'performance_ratio' => round($propulsion->getPerformanceRatio(), 2),
                'comfort_range' => round($propulsion->getSustain(), 1),
                'max_range' => round($propulsion->getMaxRange(), 1),
            ],
            'sensors' => [
                'range' => round($sensors->getRange(), 1),
                'scan_success_chance' => round($sensors->getScanSuccessChance(), 2),
            ],
            'hull' => [
                'integrity' => round($hull->getIntegrity(), 1),
                'max' => round($hull->getMaxIntegrity(), 1),
            ],
            'navigation' => [
                'node_id' => $nav->getCurrentPosition(),
            ],
        ];

        WP_CLI::log((string) json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    // ─── Run output ───────────────────────────────────────────────

    /**
     * Output scenario run as formatted table.
     *
     * @param array<string, mixed> $scenario
     * @param array<array<string, mixed>> $timeline
     */
    private function outputRunTable(array $scenario, array $timeline): void
    {
        WP_CLI::log('');
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log(WP_CLI::colorize('%G  SCENARIO: %W' . ($scenario['name'] ?? 'Unnamed') . '%n'));
        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
        WP_CLI::log('');

        if (isset($scenario['description'])) {
            WP_CLI::log(sprintf('  %s', $scenario['description']));
            WP_CLI::log('');
        }

        foreach ($timeline as $entry) {
            $t = $entry['t'];
            $hours = $t / 3600.0;
            $action = $entry['action'];

            if ($action === null) {
                WP_CLI::log(WP_CLI::colorize(sprintf('%Y▸ t=%ds (%.1fh) — INITIAL STATE%n', $t, $hours)));
            } else {
                WP_CLI::log(WP_CLI::colorize(sprintf(
                    '%%Y▸ t=%ds (%.1fh) — %s → %s%%n',
                    $t,
                    $hours,
                    $action['type'],
                    $action['ship'],
                )));
            }

            // Show result summary if present
            if ($entry['result'] !== null) {
                $result = $entry['result'];
                $summary = [];
                if (isset($result['success'])) {
                    $summary[] = ((bool) $result['success']) ? 'success' : 'failed';
                }
                if (isset($result['edges_discovered'])) {
                    $summary[] = sprintf('edges: %d', $result['edges_discovered']);
                }
                if (isset($result['distance'])) {
                    $summary[] = sprintf('dist: %.2f ly', $result['distance']);
                }
                if ($summary !== []) {
                    WP_CLI::log(sprintf('  Result: %s', implode(', ', $summary)));
                }
            }

            // Show ship states
            foreach ($entry['ships'] as $name => $snap) {
                WP_CLI::log(sprintf(
                    '  %-12s  power: %.0f/%.0f  shield: %.0f/%.0f  hull: %.0f/%.0f  core: %.0f  node: %s',
                    $name,
                    $snap['power'],
                    $snap['powerMax'],
                    $snap['shield'],
                    $snap['shieldMax'],
                    $snap['hull'],
                    $snap['hullMax'],
                    $snap['coreLife'],
                    $snap['nodeId'] ?? '?',
                ));
            }

            WP_CLI::log('');
        }

        WP_CLI::log(WP_CLI::colorize('%G═══════════════════════════════════════════════════════════════%n'));
    }

    /**
     * Output scenario run as JSON.
     *
     * @param array<string, mixed> $scenario
     * @param array<array<string, mixed>> $timeline
     */
    private function outputRunJson(array $scenario, array $timeline): void
    {
        $output = [
            'scenario' => $scenario['name'] ?? 'Unnamed',
            'description' => $scenario['description'] ?? '',
            'shipCount' => count($scenario['ships']),
            'actionCount' => count($scenario['actions']),
            'snapshotCount' => count($timeline),
            'timeline' => $timeline,
        ];

        WP_CLI::log((string) json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
}
