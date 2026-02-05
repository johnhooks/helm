<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Navigation\NavigationService;
use Helm\ShipLink\Models\ShipSystems;
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
 * Loads data from CPT and systems table, and constructs a configured
 * ShipLink with all systems wired together.
 *
 * This is the only place that knows how to construct and wire Ship systems.
 */
final class ShipFactory
{
    public function __construct(
        private readonly ShipSystemsRepository $systemsRepository,
        private readonly NavigationService $navigationService,
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
        $systems = $this->systemsRepository->findOrCreate($shipPost->postId());

        return $this->buildFromParts($shipPost, $systems);
    }

    /**
     * Build a Ship from existing parts.
     *
     * Useful when you already have loaded the post and systems.
     */
    public function buildFromParts(ShipPost $shipPost, ShipSystems $systems): Ship
    {
        // Build power system first - other systems depend on it for calculations
        $power = new Power($systems);

        // Build systems that need power readings
        $propulsion = new Propulsion($systems, $power);
        $sensors = new Sensors($systems, $power);

        // Build remaining systems
        $navigation = new Navigation($systems, $this->navigationService);
        $shields = new Shields($systems);
        $hull = new Hull($systems);
        $cargo = new Cargo($systems);

        return new Ship(
            post: $shipPost,
            systems: $systems,
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
