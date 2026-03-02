<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\NodeType;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\LoadoutFactory;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\ProcessingResult;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;

/**
 * Scenario driver for simulation testing.
 *
 * Creates ships, dispatches actions, advances time, and processes
 * results — all backed by in-memory repositories.
 */
final class Simulation
{
    private int $nextShipId = 1;

    /** @var array<int, MemoryShipIdentity> */
    private array $identities = [];

    public function __construct(
        private readonly ShipFactory $shipFactory,
        private readonly LoadoutFactory $loadoutFactory,
        private readonly ShipStateRepository $stateRepository,
        private readonly ActionFactory $actionFactory,
        private readonly ActionProcessor $processor,
        private readonly NodeRepository $nodeRepository,
        private readonly EdgeRepository $edgeRepository,
    ) {
        $this->shipFactory->setIdentityResolver(
            fn (int $id) => $this->identities[$id] ?? null
        );
    }

    /**
     * Create a ship with default loadout.
     */
    public function createShip(string $name, int $ownerId): Ship
    {
        $postId = $this->nextShipId++;
        $identity = new MemoryShipIdentity($postId, $name, $ownerId);
        $this->identities[$postId] = $identity;

        $state = ShipState::defaults($postId);
        $this->stateRepository->insert($state);
        $loadout = $this->loadoutFactory->buildDefaults($postId, $ownerId);

        return $this->shipFactory->buildFromParts($identity, $state, $loadout);
    }

    /**
     * Dispatch an action for a ship.
     *
     * @param array<string, mixed> $params
     */
    public function dispatch(int $shipPostId, ActionType $type, array $params = []): Action
    {
        return $this->actionFactory->create($shipPostId, $type, $params);
    }

    /**
     * Advance clock by seconds and process ready actions.
     */
    public function advance(int $seconds): ProcessingResult
    {
        Date::advanceTestNow($seconds);

        return $this->processor->processReady();
    }

    /**
     * Process any currently ready actions without advancing time.
     */
    public function processReady(): ProcessingResult
    {
        return $this->processor->processReady();
    }

    /**
     * Rebuild a ship from current state.
     */
    public function getShip(int $shipPostId): Ship
    {
        return $this->shipFactory->build($shipPostId);
    }

    /**
     * Seed navigation graph from the catalog JSON.
     *
     * Loads nodes and edges from the exported graph format.
     */
    public function seedGraph(string $path): void
    {
        $json = file_get_contents($path);
        if ($json === false) {
            throw new \RuntimeException("Cannot read graph file: {$path}");
        }

        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        // Seed nodes
        foreach ($data['nodes'] as $nodeData) {
            $type = $nodeData['type'] === 'system' ? NodeType::System : NodeType::Waypoint;
            $this->nodeRepository->create(
                x: (float) $nodeData['x'],
                y: (float) $nodeData['y'],
                z: (float) $nodeData['z'],
                type: $type,
            );
        }

        // Seed edges
        foreach ($data['edges'] as $edgeData) {
            $this->edgeRepository->create(
                nodeA: (int) $edgeData['from'],
                nodeB: (int) $edgeData['to'],
                distance: (float) $edgeData['distance'],
            );
        }
    }
}
