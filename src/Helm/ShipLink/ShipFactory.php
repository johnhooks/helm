<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Navigation\NavigationService;
use Helm\ShipLink\Contracts\ShipLink as ShipLinkContract;
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
 * Loads data from CPT and systems table, combines into ShipModel,
 * and constructs a configured ShipLink with all systems wired together.
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
     * Build a ShipLink from a ship post ID.
     *
     * @throws \InvalidArgumentException If ship post not found
     */
    public function build(int $shipPostId): ShipLinkContract
    {
        $shipPost = ShipPost::fromId($shipPostId);

        if ($shipPost === null) {
            throw new \InvalidArgumentException("Ship post not found: {$shipPostId}");
        }

        return $this->buildFromPost($shipPost);
    }

    /**
     * Build a ShipLink from a ShipPost.
     */
    public function buildFromPost(ShipPost $shipPost): ShipLinkContract
    {
        $systems = $this->systemsRepository->findOrCreate($shipPost->postId());
        $model = ShipModel::fromParts($shipPost, $systems);

        return $this->buildFromModel($model);
    }

    /**
     * Build a ShipLink from existing parts.
     *
     * Useful when you already have loaded the post and systems.
     */
    public function buildFromParts(ShipPost $shipPost, ShipSystems $systems): ShipLinkContract
    {
        $model = ShipModel::fromParts($shipPost, $systems);

        return $this->buildFromModel($model);
    }

    /**
     * Build a ShipLink from a ShipModel directly.
     *
     * Useful for testing or when you've already built the model.
     */
    public function buildFromModel(ShipModel $model): ShipLinkContract
    {
        // Build power system first - other systems depend on it
        $power = new Power($model);

        // Build systems that need core output readings
        $propulsion = new Propulsion($model, $power);
        $sensors = new Sensors($model, $power);

        // Build remaining systems
        $navigation = new Navigation($model, $this->navigationService);
        $shields = new Shields($model);
        $hull = new Hull($model);

        return new Ship(
            model: $model,
            powerSystem: $power,
            propulsionSystem: $propulsion,
            sensorSystem: $sensors,
            navigationSystem: $navigation,
            shieldSystem: $shields,
            hullSystem: $hull,
        );
    }
}
