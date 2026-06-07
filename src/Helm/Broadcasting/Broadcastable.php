<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

use Helm\Events\Contracts\Event;

/**
 * Contract for events that can be persisted into the broadcast stream.
 */
interface Broadcastable extends Event
{
    public function channel(): string;

    public function type(): EventType;

    /**
     * @return array<string, mixed>
     */
    public function payload(): array;

    public function resourceType(): ?string;

    public function resourceId(): ?int;
}
