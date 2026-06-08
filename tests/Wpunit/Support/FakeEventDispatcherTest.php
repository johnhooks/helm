<?php

declare(strict_types=1);

namespace Tests\Wpunit\Support;

use Helm\Events\Contracts\Event;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\FakeEventDispatcher;

/**
 * @covers \Tests\Support\FakeEventDispatcher
 */
class FakeEventDispatcherTest extends WPTestCase
{
    public function test_records_and_filters_dispatched_events(): void
    {
        $dispatcher = new FakeEventDispatcher();
        $first = new class implements Event {
        };
        $second = new class implements Event {
        };
        $firstClass = $first::class;
        $secondClass = $second::class;

        $dispatcher->dispatch($first);
        $dispatcher->dispatch($second);

        $this->assertSame([$first, $second], $dispatcher->dispatched());
        $this->assertSame([$first], $dispatcher->dispatched($firstClass));
        $this->assertSame(2, $dispatcher->dispatchedCount());
        $this->assertSame(1, $dispatcher->dispatchedCount($secondClass));
        $this->assertTrue($dispatcher->hasDispatched($firstClass));
    }

    public function test_asserts_dispatched_events_with_optional_callback(): void
    {
        $dispatcher = new FakeEventDispatcher();
        $event = new class implements Event {
            public function value(): string
            {
                return 'matched';
            }
        };

        $dispatcher->dispatch($event);

        $dispatcher->assertDispatched($event::class);
        $dispatcher->assertDispatched(
            $event::class,
            static fn (Event $dispatched): bool => method_exists($dispatched, 'value')
                && $dispatched->value() === 'matched'
        );

        $this->addToAssertionCount(2);
    }

    public function test_asserts_events_were_not_dispatched(): void
    {
        $dispatcher = new FakeEventDispatcher();
        $event = new class implements Event {
        };

        $dispatcher->assertNotDispatched($event::class);

        $this->addToAssertionCount(1);
    }

    public function test_returns_last_dispatched_event(): void
    {
        $dispatcher = new FakeEventDispatcher();
        $first = new class implements Event {
        };
        $second = new class implements Event {
        };

        $dispatcher->dispatch($first);
        $dispatcher->dispatch($second);

        $this->assertSame($second, $dispatcher->lastDispatched());
        $this->assertSame($first, $dispatcher->lastDispatched($first::class));
    }

    public function test_reset_clears_recorded_events(): void
    {
        $dispatcher = new FakeEventDispatcher();
        $event = new class implements Event {
        };

        $dispatcher->dispatch($event);
        $dispatcher->reset();

        $this->assertSame([], $dispatcher->dispatched());
        $this->assertSame(0, $dispatcher->dispatchedCount());
        $this->assertNull($dispatcher->lastDispatched());
    }
}
