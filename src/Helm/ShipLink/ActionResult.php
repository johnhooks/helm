<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use WP_Error;

/**
 * Collects outcomes from each system involved in processing an action.
 *
 * Each system adds its result (success data or WP_Error) during processing.
 * The aggregate result is returned to the caller.
 */
class ActionResult
{
    /** @var array<string, SystemResult|WP_Error> */
    private array $outcomes = [];

    private bool $queued = false;
    private ?int $completesAt = null;
    private ?int $actionRecordId = null;

    /**
     * Add a system outcome.
     */
    public function add(string $system, SystemResult|WP_Error $outcome): self
    {
        $this->outcomes[$system] = $outcome;
        return $this;
    }

    /**
     * Get a specific system's outcome.
     */
    public function get(string $system): SystemResult|WP_Error|null
    {
        return $this->outcomes[$system] ?? null;
    }

    /**
     * Get all outcomes.
     *
     * @return array<string, SystemResult|WP_Error>
     */
    public function all(): array
    {
        return $this->outcomes;
    }

    /**
     * Check if any system returned an error.
     */
    public function hasErrors(): bool
    {
        foreach ($this->outcomes as $outcome) {
            if (is_wp_error($outcome)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if any system returned a critical error.
     *
     * Critical errors prevent saving the mutated model.
     */
    public function hasCriticalErrors(): bool
    {
        foreach ($this->outcomes as $outcome) {
            if (is_wp_error($outcome) && (bool) $outcome->get_error_data('critical')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all errors.
     *
     * @return array<string, WP_Error>
     */
    public function getErrors(): array
    {
        return array_filter($this->outcomes, 'is_wp_error');
    }

    /**
     * Check if the action was queued for later completion.
     */
    public function isQueued(): bool
    {
        return $this->queued;
    }

    /**
     * Get the timestamp when the queued action will complete.
     */
    public function getCompletesAt(): ?int
    {
        return $this->completesAt;
    }

    /**
     * Get the action record ID for queued actions.
     */
    public function getActionRecordId(): ?int
    {
        return $this->actionRecordId;
    }

    /**
     * Mark result as queued.
     */
    public function markQueued(int $completesAt, int $actionRecordId): self
    {
        $this->queued = true;
        $this->completesAt = $completesAt;
        $this->actionRecordId = $actionRecordId;
        return $this;
    }

    /**
     * Convert to array for REST responses.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $data = [
            'success' => !$this->hasCriticalErrors(),
            'queued' => $this->queued,
            'outcomes' => [],
        ];

        if ($this->queued) {
            $data['completes_at'] = $this->completesAt;
            $data['action_record_id'] = $this->actionRecordId;
        }

        foreach ($this->outcomes as $system => $outcome) {
            if (is_wp_error($outcome)) {
                $data['outcomes'][$system] = [
                    'success' => false,
                    'error' => $outcome->get_error_code(),
                    'message' => $outcome->get_error_message(),
                ];
            } else {
                $data['outcomes'][$system] = [
                    'success' => true,
                    'data' => $outcome->toArray(),
                ];
            }
        }

        return $data;
    }

    /**
     * Create a result with a single error (for early failures).
     */
    public static function withError(string $system, WP_Error $error): self
    {
        $result = new self();
        $result->add($system, $error);
        return $result;
    }

    /**
     * Create a queued result.
     */
    public static function queued(int $completesAt, int $actionRecordId): self
    {
        $result = new self();
        $result->markQueued($completesAt, $actionRecordId);
        return $result;
    }
}
