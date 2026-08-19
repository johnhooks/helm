<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use Codeception\Module;
use Codeception\TestInterface;
use DateTimeImmutable;
use Helm\Events\Contracts\EventDispatcher;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\RandomSource;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavComputer;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
use Helm\Navigation\NodeGenerator;
use Helm\Navigation\NodeType;
use Helm\Origin\Origin;
use Helm\Products\Contracts\ProductRepository;
use Helm\Products\Models\Product;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionResolver;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\LoadoutFactory;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ProcessingResult;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;
use Helm\Simulation\Provider;
use Helm\Simulation\SimulationRandomSource;
use Helm\Simulation\Simulation as Driver;
use Tests\Support\FakeEventDispatcher;

/**
 * Codeception fixtures and controls for the PHP simulation.
 * Restores the original services and clock after each test.
 */
class Simulation extends Module
{
    private ?Driver $simulation = null;
    private ?DateTimeImmutable $previousTime = null;

    /** @var array<class-string, object> */
    private array $previousServices = [];

    public function _after(TestInterface $test): void
    {
        $this->restore();
    }

    /**
     * Start an empty simulation with seeded products and a fixed clock.
     * Navigation rolls are repeatable for the supplied seed.
     */
    public function haveSimulation(
        string $seed = 'simulation-test',
        string $startedAt = '2300-01-01 00:00:00',
    ): Driver {
        $this->restore();
        $container = helm()->getContainer();
        $this->previousTime = Date::getTestNow();
        $services = [
            ShipStateRepository::class,
            ActionRepository::class,
            InventoryRepository::class,
            ProductRepository::class,
            NodeRepository::class,
            EdgeRepository::class,
            UserEdgeRepository::class,
            LoadoutFactory::class,
            Origin::class,
            NodeGenerator::class,
            RandomSource::class,
            NavComputer::class,
            NavigationService::class,
            ShipFactory::class,
            ActionFactory::class,
            ActionResolver::class,
            ActionProcessor::class,
            EventDispatcher::class,
        ];
        foreach ($services as $service) {
            $this->previousServices[$service] = $container->get($service);
        }

        Date::setTestNow($startedAt);
        $origin = new Origin();
        $origin->reset();
        $origin->initialize('simulation-test', $seed);
        $container->singleton(Origin::class, $origin);
        $container->singleton(NodeGenerator::class);
        $container->singleton(EventDispatcher::class, new FakeEventDispatcher());
        $provider = new Provider($container);
        $provider->register();
        $provider->boot();
        $container->singleton(RandomSource::class, new SimulationRandomSource($seed));
        $this->simulation = helm(Driver::class);
        return $this->simulation;
    }

    /** Script the next rolls; seeded randomness resumes after these are consumed. */
    public function haveSimulationRolls(float ...$rolls): void
    {
        $this->driver();
        $source = helm(RandomSource::class);
        assert($source instanceof SimulationRandomSource);
        $source->setRolls($rolls);
    }

    public function haveSimulationNode(float $x, float $y = 0.0, float $z = 0.0, NodeType $type = NodeType::System): Node
    {
        $this->driver();
        return helm(NodeRepository::class)->create($x, $y, $z, $type);
    }

    public function haveSimulationShip(string $name = 'Explorer', int $ownerId = 1, int $nodeId = 1): Ship
    {
        return $this->driver()->createShipAtNode($name, $ownerId, $nodeId);
    }

    /**
     * Add a product fixture, optionally overriding a seeded product's fields.
     *
     * @param array<string, mixed> $attributes
     */
    public function haveSimulationProduct(string $slug, array $attributes): Product
    {
        $this->driver();
        $repository = helm(ProductRepository::class);
        $product = $repository->findBySlug($slug);
        if ($product === null) {
            return $repository->upsert(['slug' => $slug, ...$attributes]);
        }
        foreach ($attributes as $key => $value) {
            $product->$key = $value;
        }
        return $product;
    }

    /** @param array<string, mixed> $params */
    public function dispatchSimulationAction(int $shipId, ActionType $type, array $params = []): Action
    {
        return $this->driver()->dispatch($shipId, $type, $params);
    }

    public function grabSimulationAction(int $actionId): Action
    {
        return $this->driver()->findAction($actionId)
            ?? throw new \RuntimeException("Simulation action {$actionId} not found");
    }

    public function grabSimulationShip(int $shipId): Ship
    {
        return $this->driver()->getShip($shipId);
    }

    public function grabSimulationNode(int $nodeId): Node
    {
        $this->driver();
        return helm(NodeRepository::class)->get($nodeId)
            ?? throw new \RuntimeException("Simulation node {$nodeId} not found");
    }

    public function setSimulationCoreLife(int $shipId, int $life): void
    {
        $core = $this->grabSimulationShip($shipId)->getLoadout()->core()->component();
        $core->life = $life;
        helm(InventoryRepository::class)->update($core);
    }

    public function advanceSimulation(int $seconds): ProcessingResult
    {
        return $this->driver()->advance($seconds);
    }

    public function advanceSimulationToNextCheckpoint(): ProcessingResult
    {
        return $this->driver()->advanceToNextCheckpoint();
    }

    public function advanceSimulationUntilIdle(): ProcessingResult
    {
        return $this->driver()->advanceUntilIdle();
    }

    public function processSimulationReadyActions(): ProcessingResult
    {
        return $this->driver()->processReady();
    }

    private function driver(): Driver
    {
        return $this->simulation ?? throw new \LogicException('Call haveSimulation() before using simulation helpers');
    }

    private function restore(): void
    {
        if ($this->previousServices === []) {
            return;
        }
        $container = helm()->getContainer();
        foreach ($this->previousServices as $service => $instance) {
            $container->singleton($service, $instance);
        }
        unset($container[Driver::class]);
        Date::setTestNow($this->previousTime);
        $this->simulation = null;
        $this->previousServices = [];
    }
}
