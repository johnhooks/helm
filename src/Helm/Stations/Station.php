<?php

declare(strict_types=1);

namespace Helm\Stations;

/**
 * Station value object.
 *
 * Represents a space station at a navigation node.
 */
final class Station
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?string $type,
        public readonly ?int $ownerId,
    ) {
    }
}
