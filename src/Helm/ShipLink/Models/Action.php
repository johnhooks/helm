<?php

declare(strict_types=1);

namespace Helm\ShipLink\Models;

use DateTimeImmutable;
use DateTimeZone;
use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * Represents a ship action in the helm_ship_actions table.
 *
 * Actions track intent and lifecycle - from pending through completion.
 *
 * @property int|null $id
 * @property int $ship_post_id
 * @property ActionType $type
 * @property array<string, mixed> $params
 * @property ActionStatus $status
 * @property DateTimeImmutable|null $deferred_until
 * @property DateTimeImmutable|null $processing_at Timestamp lock for concurrent workers
 * @property int $attempts Processing attempts (0 = never picked up, 1 = first attempt, etc.)
 * @property array<string, mixed>|null $result
 * @property DateTimeImmutable $created_at
 * @property DateTimeImmutable $updated_at
 */
final class Action extends Model
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

            'ship_post_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required(),

            'type' => (new ModelPropertyDefinition())
                ->type(ActionType::class)
                ->castWith(static fn ($v) => ActionType::from($v))
                ->required(),

            'params' => (new ModelPropertyDefinition())
                ->type('array')
                ->castWith(static fn ($v) => self::castJson($v))
                ->default(static fn () => []),

            'status' => (new ModelPropertyDefinition())
                ->type(ActionStatus::class)
                ->castWith(static fn ($v) => $v instanceof ActionStatus ? $v : ActionStatus::from($v))
                ->default(static fn () => ActionStatus::Pending),

            'deferred_until' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->nullable()
                ->castWith(static fn ($v) => self::castDateTime($v)),

            'processing_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->nullable()
                ->castWith(static fn ($v) => self::castDateTime($v)),

            'attempts' => (new ModelPropertyDefinition())
                ->type('int')
                ->default(0),

            'result' => (new ModelPropertyDefinition())
                ->type('array')
                ->nullable()
                ->castWith(static fn ($v) => self::castJson($v)),

            'created_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),

            'updated_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),
        ];
    }

    /**
     * Get a parameter value.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    /**
     * Check if this action is ready to process.
     */
    public function isReady(?DateTimeImmutable $now = null): bool
    {
        if ($this->status !== ActionStatus::Pending) {
            return false;
        }

        if ($this->deferred_until === null) {
            return true;
        }

        $now ??= Date::now();
        return $this->deferred_until <= $now;
    }

    /**
     * Check if action requires time to complete.
     */
    public function requiresTime(): bool
    {
        return $this->type->requiresTime();
    }

    /**
     * Mark the action as fulfilled.
     *
     * If result is provided, it merges into the existing result.
     * If not provided (null), keeps the existing result as-is.
     *
     * @param array<string, mixed>|null $result
     */
    public function fulfill(?array $result = null): self
    {
        $this->status = ActionStatus::Fulfilled;
        if ($result !== null) {
            $this->result = array_merge($this->result ?? [], $result);
        }
        $this->processing_at = null;
        return $this;
    }

    /**
     * Mark the action as failed with an error.
     *
     * Serializes the WP_Error using REST conventions and stores in result.error.
     */
    public function fail(\WP_Error $error): self
    {
        $this->status = ActionStatus::Failed;
        $this->result = array_merge($this->result ?? [], [
            'error' => rest_convert_error_to_response($error)->get_data(),
        ]);
        $this->processing_at = null;
        return $this;
    }

    /**
     * Mark the action as running and set processing lock.
     */
    public function start(): self
    {
        $this->status = ActionStatus::Running;
        $this->processing_at = Date::now();
        return $this;
    }

    /**
     * Check if action is currently being processed.
     */
    public function isProcessing(): bool
    {
        return $this->processing_at !== null;
    }

    /**
     * Check if processing lock has expired.
     */
    public function isProcessingStale(int $timeoutSeconds = 300): bool
    {
        if ($this->processing_at === null) {
            return false;
        }

        $staleThreshold = Date::subSeconds(Date::now(), $timeoutSeconds);
        return $this->processing_at < $staleThreshold;
    }

    /**
     * Release the processing lock for retry.
     */
    public function releaseForRetry(\DateTimeImmutable $retryAt): self
    {
        $this->processing_at = null;
        $this->deferred_until = $retryAt;
        $this->attempts += 1;
        return $this;
    }

    /**
     * Clear the processing lock.
     */
    public function clearProcessingLock(): self
    {
        $this->processing_at = null;
        return $this;
    }

    /**
     * Cast a value to DateTimeImmutable (UTC).
     */
    private static function castDateTime(mixed $value): ?DateTimeImmutable
    {
        if ($value instanceof DateTimeImmutable) {
            return $value;
        }

        if ($value === null || $value === '' || $value === '0000-00-00 00:00:00') {
            return null;
        }

        if (!is_string($value)) {
            return null;
        }

        $result = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value, new DateTimeZone('UTC'));
        return $result !== false ? $result : null;
    }

    /**
     * Cast a value to array (from JSON).
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

        if (!is_string($json)) {
            return [];
        }

        /** @var array<string, mixed> */
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR) ?? [];
    }
}
