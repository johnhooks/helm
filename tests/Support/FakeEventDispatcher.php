<?php

declare(strict_types=1);

namespace Tests\Support;

use Helm\Events\Contracts\Event;
use Helm\Events\Contracts\EventDispatcher;
use PHPUnit\Framework\Assert;

/**
 * Fake domain event dispatcher that records dispatched events for tests.
 */
final class FakeEventDispatcher implements EventDispatcher
{
    /**
     * @var array<Event>
     */
    public array $events = [];

    public function dispatch(Event $event): void
    {
        $this->events[] = $event;
    }

    public function reset(): void
    {
        $this->events = [];
    }

    /**
     * Get dispatched events, optionally filtered by class.
     *
     * @template T of Event
     * @param class-string<T>|null $eventClass
     * @return array<Event>|array<T>
     */
    public function dispatched(?string $eventClass = null): array
    {
        if ($eventClass === null) {
            return $this->events;
        }

        return array_values(array_filter(
            $this->events,
            static fn (Event $event): bool => $event instanceof $eventClass
        ));
    }

    /**
     * Count dispatched events, optionally filtered by class.
     *
     * @param class-string<Event>|null $eventClass
     */
    public function dispatchedCount(?string $eventClass = null): int
    {
        return count($this->dispatched($eventClass));
    }

    /**
     * Check whether an event class was dispatched.
     *
     * @param class-string<Event> $eventClass
     */
    public function hasDispatched(string $eventClass): bool
    {
        return $this->dispatched($eventClass) !== [];
    }

    /**
     * Assert that the expected number of events were dispatched.
     *
     * @param class-string<Event>|null $eventClass
     */
    public function assertDispatchedCount(int $expected, ?string $eventClass = null): void
    {
        Assert::assertSame($expected, $this->dispatchedCount($eventClass));
    }

    /**
     * Assert that an event class was dispatched.
     *
     * The optional callback can inspect the event payload and should return true
     * for a matching dispatch.
     *
     * @template T of Event
     * @param class-string<T> $eventClass
     * @param callable(T): bool|null $callback
     */
    public function assertDispatched(string $eventClass, ?callable $callback = null): void
    {
        foreach ($this->dispatched($eventClass) as $event) {
            if ($callback === null || $callback($event)) {
                Assert::assertTrue(true);
                return;
            }
        }

        Assert::fail(sprintf('Failed asserting that [%s] was dispatched.', $eventClass));
    }

    /**
     * Assert that an event class was not dispatched.
     *
     * @param class-string<Event> $eventClass
     */
    public function assertNotDispatched(string $eventClass): void
    {
        Assert::assertSame([], $this->dispatched($eventClass));
    }

    /**
     * Get the last dispatched event, optionally filtered by class.
     *
     * @template T of Event
     * @param class-string<T>|null $eventClass
     * @return Event|T|null
     */
    public function lastDispatched(?string $eventClass = null): ?Event
    {
        $events = $this->dispatched($eventClass);

        if ($events === []) {
            return null;
        }

        return $events[array_key_last($events)];
    }
}
