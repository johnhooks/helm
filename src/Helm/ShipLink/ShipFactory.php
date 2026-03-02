<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Navigation\NavigationService;
use Helm\Products\Contracts\ProductRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\System\Cargo;
use Helm\ShipLink\System\Hull;
use Helm\ShipLink\System\Navigation;
use Helm\ShipLink\System\Power;
use Helm\ShipLink\System\Propulsion;
use Helm\ShipLink\System\Sensors;
use Helm\ShipLink\System\Shields;
use Helm\Ships\ShipPost;

/**
 * Factory for building ShipLink instances.
 *
 * Loads data from CPT, state table, and loadout, then constructs
 * a configured ShipLink with all systems wired together.
 *
 * This is the only place that knows how to construct and wire Ship systems.
 */
final class ShipFactory
{
    public function __construct(
        private readonly ShipStateRepository $stateRepository,
        private readonly LoadoutFactory $loadoutFactory,
        private readonly NavigationService $navigationService,
        private readonly InventoryRepository $inventoryRepository,
        private readonly ProductRepository $productRepository,
    ) {
    }

    /**
     * Build a Ship from a ship post ID.
     *
     * @throws \InvalidArgumentException If ship post not found
     */
    public function build(int $shipPostId): Ship
    {
        $shipPost = ShipPost::fromId($shipPostId);

        if ($shipPost === null) {
            throw new \InvalidArgumentException("Ship post not found: {$shipPostId}");
        }

        return $this->buildFromPost($shipPost);
    }

    /**
     * Build a Ship from a ShipPost.
     */
    public function buildFromPost(ShipPost $shipPost): Ship
    {
        $state = $this->stateRepository->findOrCreate($shipPost->postId());
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        return $this->buildFromParts($shipPost, $state, $loadout);
    }

    /**
     * Build a Ship from existing parts.
     *
     * Useful when you already have loaded the post, state, and loadout.
     */
    public function buildFromParts(ShipPost $shipPost, ShipState $state, Loadout $loadout): Ship
    {
        // Build power system first - needs state (power_full_at etc.) + loadout (core stats)
        $power = new Power($state, $loadout);

        // Build systems that need power readings + loadout
        $propulsion = new Propulsion($loadout, $power);
        $sensors = new Sensors($loadout, $power);

        // Build remaining systems
        $navigation = new Navigation($state, $loadout, $this->navigationService);
        $shields = new Shields($state, $loadout);
        $hull = new Hull($state);
        $cargo = new Cargo(
            $this->inventoryRepository,
            $this->productRepository,
            $shipPost->postId(),
            $shipPost->ownerId(),
        );

        return new Ship(
            post: $shipPost,
            state: $state,
            loadout: $loadout,
            powerSystem: $power,
            propulsionSystem: $propulsion,
            sensorSystem: $sensors,
            navigationSystem: $navigation,
            shieldSystem: $shields,
            hullSystem: $hull,
            cargoSystem: $cargo,
        );
    }
}
