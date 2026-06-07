<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

use DateTimeImmutable;
use DateTimeZone;
use Helm\Lib\Date;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * A durable client-facing broadcast event.
 *
 * Broadcast events are delivery records, not authoritative gameplay history.
 * The id is the client cursor used by Heartbeat polling and future transports.
 *
 * @property int|null $id
 * @property string $channel
 * @property EventType $type
 * @property array<string, mixed> $payload
 * @property string|null $resource_type
 * @property int|null $resource_id
 * @property DateTimeImmutable $created_at
 */
final class Event extends Model
{
    /**
     * @inheritDoc
     */
    protected static function properties(): array
    {
        return [
            'id' => (new ModelPropertyDefinition())
                ->type('int')
                ->nullable(),

            'channel' => (new ModelPropertyDefinition())
                ->type('string')
                ->required(),

            'type' => (new ModelPropertyDefinition())
                ->type(EventType::class)
                ->castWith(static fn ($v) => $v instanceof EventType ? $v : EventType::from($v))
                ->required(),

            'payload' => (new ModelPropertyDefinition())
                ->type('array')
                ->castWith(static fn ($v) => self::castJson($v))
                ->default(static fn () => []),

            'resource_type' => (new ModelPropertyDefinition())
                ->type('string')
                ->nullable(),

            'resource_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->nullable(),

            'created_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v))
                ->default(static fn () => Date::now()),
        ];
    }

    /**
     * Cast a value to DateTimeImmutable in UTC.
     */
    private static function castDateTime(mixed $value): ?DateTimeImmutable
    {
        if ($value instanceof DateTimeImmutable) {
            return $value;
        }

        if ($value === null || $value === '' || $value === '0000-00-00 00:00:00') {
            return null;
        }

        if (! is_string($value)) {
            return null;
        }

        $result = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value, new DateTimeZone('UTC'));
        return $result !== false ? $result : null;
    }

    /**
     * Cast a value to array from JSON.
     *
     * @return array<string, mixed>
     */
    private static function castJson(mixed $json): array
    {
        if (is_array($json)) {
            /** @var array<string, mixed> */
            return $json;
        }

        if ($json === null || $json === '') {
            return [];
        }

        if (! is_string($json)) {
            return [];
        }

        /** @var array<string, mixed> */
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR) ?? [];
    }
}
