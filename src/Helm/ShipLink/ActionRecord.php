<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;

/**
 * Represents an action record from the helm_ship_actions table.
 *
 * This is the persisted form of an action - tracking its lifecycle
 * from pending through completion.
 */
final class ActionRecord
{
    /**
     * @param array<string, mixed> $params
     * @param array<string, mixed>|null $result
     */
    public function __construct(
        public readonly ?int $id,
        public readonly int $shipPostId,
        public readonly ActionType $type,
        public readonly array $params,
        public readonly ActionStatus $status,
        public readonly ?DateTimeImmutable $deferredUntil,
        public readonly ?array $result,
        public readonly DateTimeImmutable $createdAt,
        public readonly DateTimeImmutable $updatedAt,
    ) {
    }

    /**
     * Create a new pending action record.
     *
     * @param array<string, mixed> $params
     */
    public static function pending(
        int $shipPostId,
        ActionType $type,
        array $params = [],
        ?DateTimeImmutable $deferredUntil = null,
    ): self {
        $now = new DateTimeImmutable();

        return new self(
            id: null,
            shipPostId: $shipPostId,
            type: $type,
            params: $params,
            status: ActionStatus::Pending,
            deferredUntil: $deferredUntil,
            result: null,
            createdAt: $now,
            updatedAt: $now,
        );
    }

    /**
     * Create from an Action object.
     */
    public static function fromAction(int $shipPostId, Action $action, ?DateTimeImmutable $deferredUntil = null): self
    {
        return self::pending($shipPostId, $action->type, $action->params, $deferredUntil);
    }

    /**
     * Create from database row.
     *
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: (int) $row['id'],
            shipPostId: (int) $row['ship_post_id'],
            type: ActionType::from($row['action_type']),
            params: self::decodeJson($row['params'] ?? null),
            status: ActionStatus::from($row['status']),
            deferredUntil: self::parseDateTime($row['deferred_until'] ?? null),
            result: self::decodeJson($row['result'] ?? null),
            createdAt: self::parseDateTime($row['created_at']) ?? new DateTimeImmutable(),
            updatedAt: self::parseDateTime($row['updated_at']) ?? new DateTimeImmutable(),
        );
    }

    /**
     * Convert to database row format.
     *
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        $row = [
            'ship_post_id' => $this->shipPostId,
            'action_type' => $this->type->value,
            'params' => json_encode($this->params, JSON_THROW_ON_ERROR),
            'status' => $this->status->value,
            'deferred_until' => $this->deferredUntil?->format('Y-m-d H:i:s'),
            'result' => $this->result !== null ? json_encode($this->result, JSON_THROW_ON_ERROR) : null,
        ];

        if ($this->id !== null) {
            $row['id'] = $this->id;
        }

        return $row;
    }

    /**
     * Create a copy with updated status.
     *
     * @param array<string, mixed>|null $result
     */
    public function withStatus(ActionStatus $status, ?array $result = null): self
    {
        return new self(
            id: $this->id,
            shipPostId: $this->shipPostId,
            type: $this->type,
            params: $this->params,
            status: $status,
            deferredUntil: $this->deferredUntil,
            result: $result ?? $this->result,
            createdAt: $this->createdAt,
            updatedAt: new DateTimeImmutable(),
        );
    }

    /**
     * Create an Action object from this record.
     */
    public function toAction(): Action
    {
        return new Action($this->type, $this->params);
    }

    /**
     * Check if this action is ready to process (not deferred or deferral has passed).
     */
    public function isReady(?DateTimeImmutable $now = null): bool
    {
        if ($this->status !== ActionStatus::Pending) {
            return false;
        }

        if ($this->deferredUntil === null) {
            return true;
        }

        $now ??= new DateTimeImmutable();
        return $this->deferredUntil <= $now;
    }

    /**
     * Parse a datetime string.
     */
    private static function parseDateTime(?string $value): ?DateTimeImmutable
    {
        if ($value === null || $value === '' || $value === '0000-00-00 00:00:00') {
            return null;
        }

        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value);
        return $dt !== false ? $dt : null;
    }

    /**
     * Decode JSON column.
     *
     * @return array<string, mixed>
     */
    private static function decodeJson(?string $json): array
    {
        if ($json === null || $json === '') {
            return [];
        }

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR) ?? [];
    }
}
