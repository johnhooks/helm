<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

use Helm\Broadcasting\Contracts\EventRepository;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\Lib\HydratesModels;
use Helm\StellarWP\Models\Model;
use RuntimeException;

/**
 * Broadcast event repository backed by wpdb.
 */
final class WpdbEventRepository implements EventRepository
{
    use HydratesModels;

    private const COLUMN_MAP = ['type' => 'event_type'];

    public function append(Event $event): Event
    {
        global $wpdb;

        if (! $event->isSet('created_at')) {
            $event->created_at = Date::now();
        }

        $row = $this->serializeToDbRow($event->toArray(), $event, self::COLUMN_MAP);

        $inserted = $wpdb->insert(
            Schema::table(Schema::TABLE_BROADCAST_EVENTS),
            $row
        );

        if ($inserted === false) {
            throw new RuntimeException('Unable to append broadcast event.');
        }

        $event->id = (int) $wpdb->insert_id;
        $event->syncOriginal();

        return $event;
    }

    /**
     * @return Event[]
     */
    public function findAfterCursorForChannel(string $channel, int $cursor, int $limit = self::DEFAULT_LIMIT): array
    {
        global $wpdb;

        $limit = max(1, min(500, $limit));
        $cursor = max(0, $cursor);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                'SELECT * FROM %i WHERE channel = %s AND id > %d ORDER BY id ASC LIMIT %d',
                Schema::table(Schema::TABLE_BROADCAST_EVENTS),
                $channel,
                $cursor,
                $limit,
            ),
            ARRAY_A
        );

        return array_map(
            fn (array $row): Event => $this->hydrate($row),
            $rows ?? []
        );
    }

    public function latestCursorForChannel(string $channel): int
    {
        global $wpdb;

        $cursor = $wpdb->get_var(
            $wpdb->prepare(
                'SELECT MAX(id) FROM %i WHERE channel = %s',
                Schema::table(Schema::TABLE_BROADCAST_EVENTS),
                $channel,
            )
        );

        return max(0, (int) $cursor);
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Event
    {
        if (isset($row['event_type'])) {
            $row['type'] = $row['event_type'];
            unset($row['event_type']);
        }

        $model = Event::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }
}
