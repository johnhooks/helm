<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Events\Contracts\Event;
use Helm\Events\Contracts\EventDispatcher;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\Models\Item;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\RandomSource;
use Helm\Origin\Origin;
use Helm\Origin\OriginConfig;
use Helm\Products\Contracts\ProductRepository;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Actions\ScanRoute\Rules;
use Helm\ShipLink\Actions\ScanRoute\RuntimeState;
use Helm\ShipLink\Actions\ScanRoute\StopReason;
use Helm\ShipLink\Components\PowerMode;
use Helm\lucatume\DI52\Container;
use InvalidArgumentException;
use Monolog\Handler\TestHandler;
use Monolog\Logger;
use Monolog\LogRecord;
use Monolog\Processor\PsrLogMessageProcessor;
use Psr\Log\LoggerInterface;

/** Bounded scenarios using production actions in a detached memory container. */
final class ScanRunner
{
    /**
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    public function run(array $config): array
    {
        $trials = (int) ($config['trials'] ?? 10);
        $distance = (float) ($config['distance_ly'] ?? 2.416);
        $seed = (string) ($config['seed'] ?? 'scan-study');
        $sensor = (string) ($config['sensor'] ?? 'vrs_mk1');
        $nav = (int) ($config['nav_tier'] ?? 3);
        $intensity = (string) ($config['intensity'] ?? 'normal');
        $life = (int) ($config['core_life'] ?? 1000);
        $coreSlug = (string) ($config['core'] ?? 'epoch_s');
        $powerMode = PowerMode::fromSlug((string) ($config['power_mode'] ?? 'normal'));
        if (
            $trials < 1 || $trials > 30 || !is_finite($distance) || $distance <= 0 || $distance > 30
            || strlen($seed) > 64 || $nav < 1 || $nav > 5 || $life < 1 || $life > 10000
            || !in_array($sensor, ['vrs_mk1', 'dsc_mk1', 'acu_mk1'], true)
            || !in_array($intensity, ['economy', 'normal', 'fast'], true) || $powerMode === null
        ) {
            throw new InvalidArgumentException('Invalid or excessive scan simulation configuration.');
        }
        $config = [...$config, 'trials' => $trials, 'distance_ly' => $distance, 'seed' => $seed,
            'sensor' => $sensor, 'nav_tier' => $nav, 'intensity' => $intensity,
            'core_life' => $life, 'core' => $coreSlug, 'power_mode' => $powerMode->slug()];
        $previousTime = Date::getTestNow();
        $runs = [];
        try {
            for ($trial = 0; $trial < $trials; $trial++) {
                $container = new Container();
                $container->singleton(Origin::class, Origin::detached(new OriginConfig('simulation', $seed)));
                $container->singleton(EventDispatcher::class, new class implements EventDispatcher {
                    public function dispatch(Event $event): void
                    {
                    }
                });
                $provider = new Provider($container);
                $provider->register();
                $provider->boot();
                // Only retain diagnostics for the first trial; other trials use NullLogger.
                $trace = new TestHandler();
                if ($trial === 0) {
                    $logger = new Logger('helm.simulation', [$trace], [new PsrLogMessageProcessor()]);
                    $logger->pushProcessor(static function (LogRecord $record) use ($seed, $trial): LogRecord {
                        return $record->with(context: $record->context + ['seed' => $seed, 'trial' => $trial]);
                    });
                    $container->singleton(LoggerInterface::class, $logger);
                }
                $container->singleton(RandomSource::class, new SimulationRandomSource("$seed:$trial"));
                Date::setTestNow('2300-01-01 00:00:00');
                /** @var Simulation $simulation */
                $simulation = $container->get(Simulation::class);
                /** @var NodeRepository $nodes */
                $nodes = $container->get(NodeRepository::class);
                $origin = $nodes->create(0, 0, 0);
                $target = $nodes->create($distance, 0, 0);
                $ship = $simulation->createShipAtNode('Simulated explorer', 1, $origin->id);
                /** @var ProductRepository $products */
                $products = $container->get(ProductRepository::class);
                /** @var InventoryRepository $inventory */
                $inventory = $container->get(InventoryRepository::class);
                foreach (['sensor' => $sensor, 'nav' => 'nav_tier_' . $nav, 'core' => $coreSlug] as $slot => $slug) {
                    $product = $products->findBySlug($slug);
                    if ($product === null || $product->type !== $slot) {
                        throw new InvalidArgumentException('Unknown simulation product: ' . $slug);
                    }
                    $component = match ($slot) {
                        'sensor' => $ship->getLoadout()->sensor(),
                        'nav' => $ship->getLoadout()->nav(),
                        'core' => $ship->getLoadout()->core(),
                    };
                    $item = new Item([...$component->component()->toArray(), 'product_id' => $product->id]);
                    if ($slot === 'core') {
                        $item->life = $life;
                    }
                    $inventory->update($item);
                }
                $ship->getState()->power_mode = $powerMode;
                $started = Date::now()->getTimestamp();
                try {
                    $action = $simulation->dispatch($ship->getId(), ActionType::ScanRoute, ['target_node_id' => $target->id, 'intensity' => $intensity]);
                } catch (ActionException $error) {
                    $container->get(LoggerInterface::class)->warning('Simulation trial {trial} rejected: {reason}', [
                        'event' => 'simulation.rejected',
                        'trial' => $trial,
                        'seed' => $seed,
                        'reason' => $error->errorCode->value,
                    ]);
                    $runs[] = ['trial' => $trial, 'status' => 'rejected', 'error' => $error->toWpError()->get_error_code()];
                    continue;
                }
                if (($config['catch_up'] ?? false) === true) {
                    $simulation->advance(86400 * 30);
                }
                $simulation->advanceUntilIdle();
                $action = $simulation->findAction($action->id);
                assert($action !== null);
                $stopReason = isset($action->result['stop_reason']) ? StopReason::from($action->result['stop_reason']) : null;
                $progress = $container->get(Rules::class)->progress(
                    RuntimeState::fromArray($action->runtime_state ?? []),
                    $action->status->isFinalState(),
                    $stopReason,
                );
                $runs[] = [
                    'trial' => $trial, 'status' => $action->status->value,
                    'hours' => (($action->deferred_until?->getTimestamp() ?? $started) - $started) / 3600,
                    'cycles' => $progress['completed_cycles'] ?? 0,
                    'core_spent' => $progress['spent']['core_life'] ?? 0,
                    'stop_reason' => $progress['stop_reason'] ?? null,
                    'discoveries' => count($action->result['discovered_edge_ids'] ?? []),
                    'history' => array_values(array_map(
                        static fn (LogRecord $record): array => $record->context,
                        array_filter($trace->getRecords(), static fn (LogRecord $record): bool => ($record->context['event'] ?? null) === 'scan.cycle_processed'),
                    )),
                ];
            }
        } finally {
            Date::setTestNow($previousTime);
        }
        $hours = array_column($runs, 'hours');
        sort($hours);
        $quantile = static fn (float $p): ?float => $hours === [] ? null : $hours[max(0, (int) ceil(count($hours) * $p) - 1)];
        return ['configuration' => $config, 'runs' => $runs, 'summary' => [
            'trials' => $trials, 'rejected' => $trials - count($hours),
            'completed' => count(array_filter($runs, static fn (array $run): bool => $run['status'] === 'fulfilled' && ($run['stop_reason'] ?? null) === null)),
            'partial' => count(array_filter($runs, static fn (array $run): bool => $run['status'] === 'partial')),
            'mean_core_spent' => $hours === [] ? null : array_sum(array_column($runs, 'core_spent')) / count($hours),
            'p10_hours' => $quantile(0.1), 'median_hours' => $quantile(0.5),
            'p90_hours' => $quantile(0.9), 'p99_hours' => $quantile(0.99),
        ]];
    }
}
