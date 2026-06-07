<?php

declare(strict_types=1);

namespace Helm\Events;

use Helm\Events\Contracts\Event;
use Helm\Events\Contracts\EventDispatcher;

/**
 * WordPress-backed Helm domain event dispatcher.
 */
final class Dispatcher implements EventDispatcher
{
    public const HOOK = 'helm_event';

    public function dispatch(Event $event): void
    {
        do_action(self::HOOK, $event);
    }
}
