<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use Helm\ShipLink\Loadout;

/**
 * Builds Loadout instances for ships.
 */
interface LoadoutFactory
{
    /**
     * Build a Loadout for an existing ship.
     */
    public function build(int $shipPostId): Loadout;

    /**
     * Create default components and inventory items for a new ship.
     */
    public function buildDefaults(int $shipPostId, int $ownerId): Loadout;
}
