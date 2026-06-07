<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

/**
 * Helpers for canonical broadcast channel names.
 */
final class Channel
{
    public static function privateShip(int $shipPostId): string
    {
        return sprintf('private-ship.%d', $shipPostId);
    }
}
