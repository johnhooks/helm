<?php

declare(strict_types=1);

namespace Helm\Ships;

/**
 * Identity values the game loop needs from a ship.
 *
 * ShipPost implements this for production (WordPress CPT).
 * Simulation can use a plain DTO without touching wp_posts.
 */
interface ShipIdentity
{
    public function postId(): int;

    public function name(): string;

    public function ownerId(): int;
}
