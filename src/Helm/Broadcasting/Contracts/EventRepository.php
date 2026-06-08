<?php

declare(strict_types=1);

namespace Helm\Broadcasting\Contracts;

use Helm\Broadcasting\Event;

/**
 * Repository contract for durable broadcast event delivery records.
 */
interface EventRepository
{
    public const DEFAULT_LIMIT = 100;

    public function append(Event $event): Event;

    /**
     * Find events for a channel after a client cursor.
     *
     * @return Event[]
     */
    public function findAfterCursorForChannel(
        string $channel,
        int $cursor,
        int $limit = self::DEFAULT_LIMIT
    ): array;

    public function latestCursorForChannel(string $channel): int;
}
