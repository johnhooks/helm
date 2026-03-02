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
use Helm\Ships\ShipIdentity;
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
    /** @var (callable(int): ?ShipIdentity)|null */
    private $identityResolver;

    public function __construct(
        private readonly ShipStateRepository $stateRepository,
        private readonly Contracts\LoadoutFactory $loadoutFactory,
        private readonly NavigationService $navigationService,
        private readonly InventoryRepository $inventoryRepository,
        private readonly ProductRepository $productRepository,
    ) {
    }

    /**
     * Set a custom identity resolver.
     *
     * When set, build() uses this instead of ShipPost::fromId().
     * Used by the simulation to resolve ship identities from memory.
     *
     * @param (callable(int): ?ShipIdentity)|null $resolver
     */
    public function setIdentityResolver(?callable $resolver): void
    {
        $this->identityResolver = $resolver;
    }

    /**
     * Build a Ship from a ship post ID.
     *
     * @throws \InvalidArgumentException If ship post not found
     */
    public function build(int $shipPostId): Ship
    {
        $identity = $this->identityResolver !== null
            ? ($this->identityResolver)($shipPostId)
            : ShipPost::fromId($shipPostId);

        if ($identity === null) {
            throw new \InvalidArgumentException("Ship not found: {$shipPostId}");
        }

        return $this->buildFromPost($identity);
    }

    /**
     * Build a Ship from a ShipIdentity.
     */
    public function buildFromPost(ShipIdentity $ship): Ship
    {
        $state = $this->stateRepository->findOrCreate($ship->postId());
        $loadout = $this->loadoutFactory->build($ship->postId());

        return $this->buildFromParts($ship, $state, $loadout);
    }

    /**
     * Build a Ship from existing parts.
     *
     * Useful when you already have loaded the identity, state, and loadout.
     */
    public function buildFromParts(ShipIdentity $ship, ShipState $state, Loadout $loadout): Ship
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
            $ship->postId(),
            $ship->ownerId(),
        );

        return new Ship(
            identity: $ship,
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
