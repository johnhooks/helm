<?php

declare(strict_types=1);

namespace Tests\Wpunit\Events;

use Helm\Events\Contracts\Event;
use Helm\Events\Contracts\EventDispatcher;
use Helm\Events\Dispatcher;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Events\Dispatcher
 */
class DispatcherTest extends WPTestCase
{
    public function test_dispatch_fires_helm_event_action(): void
    {
        $dispatcher = helm(EventDispatcher::class);
        $event = new class implements Event {
        };

        $received = null;
        $listener = static function (Event $event) use (&$received): void {
            $received = $event;
        };

        add_action(Dispatcher::HOOK, $listener);

        try {
            $dispatcher->dispatch($event);
        } finally {
            remove_action(Dispatcher::HOOK, $listener);
        }

        $this->assertSame($event, $received);
    }
}
