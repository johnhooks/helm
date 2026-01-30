<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\ShipLink\Contracts\ShipLink as ShipLinkContract;
use Helm\Ships\ShipPost;

/**
 * Factory for building ShipLink instances.
 *
 * Loads data from CPT and systems table, combines into ShipModel,
 * and constructs a configured ShipLink with all systems.
 */
final class ShipFactory
{
    public function __construct(
        private readonly ShipSystemsRepository $systemsRepository,
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

        return new Ship($model);
    }

    /**
     * Build a ShipLink from existing parts.
     *
     * Useful when you already have loaded the post and systems.
     */
    public function buildFromParts(ShipPost $shipPost, ShipSystems $systems): ShipLinkContract
    {
        $model = ShipModel::fromParts($shipPost, $systems);

        return new Ship($model);
    }

    /**
     * Build a ShipLink from a ShipModel directly.
     *
     * Useful for testing or when you've already built the model.
     */
    public function buildFromModel(ShipModel $model): ShipLinkContract
    {
        return new Ship($model);
    }
}
