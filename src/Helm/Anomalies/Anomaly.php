<?php

declare(strict_types=1);

namespace Helm\Anomalies;

/**
 * Anomaly value object.
 *
 * Represents an anomalous discovery at a navigation node.
 */
final class Anomaly
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?string $type,
    ) {
    }
}
