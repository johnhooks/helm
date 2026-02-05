<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Result of batch action processing.
 */
final class ProcessingResult
{
    public function __construct(
        public readonly int $processed,
        public readonly int $failed,
    ) {
    }

    public function total(): int
    {
        return $this->processed + $this->failed;
    }

    public function succeeded(): int
    {
        return $this->processed;
    }
}
