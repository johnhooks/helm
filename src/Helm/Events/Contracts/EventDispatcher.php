<?php

declare(strict_types=1);

namespace Helm\Events\Contracts;

/**
 * Dispatches Helm domain events.
 */
interface EventDispatcher
{
    public function dispatch(Event $event): void;
}
