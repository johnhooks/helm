<?php

declare(strict_types=1);

namespace Helm\ShipLink\Resources;

use Helm\Resources\Resource;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Actions\ScanRoute\Rules;
use Helm\ShipLink\Actions\ScanRoute\RuntimeState;
use Helm\ShipLink\Actions\ScanRoute\StopReason;

/**
 * Client-facing representation of a ship action.
 *
 * @extends Resource<Action>
 */
final class ActionResource extends Resource
{
    public function __construct(Action $action)
    {
        parent::__construct($action);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $action = $this->resource;
        $result = $action->result;
        if ($action->type === ActionType::ScanRoute && isset($action->runtime_state['powerCost'])) {
            $result ??= [];
            $stopReason = isset($result['stop_reason']) ? StopReason::from($result['stop_reason']) : null;
            $result['progress'] = [
                ...helm(Rules::class)->progress(
                    RuntimeState::fromArray($action->runtime_state),
                    $action->status->isFinalState(),
                    $stopReason,
                ),
            ];
            // Present the stop outcome with calculated progress.
            unset($result['stop_reason']);
        }

        return [
            'id'             => $action->id,
            'ship_post_id'   => $action->ship_post_id,
            'type'           => $action->type->value,
            'status'         => $action->status->value,
            'params'         => $action->params,
            'result'         => $result,
            'deferred_until' => $action->deferred_until?->format('c'),
            'created_at'     => $action->created_at->format('c'),
            'updated_at'     => $action->updated_at->format('c'),
        ];
    }
}
