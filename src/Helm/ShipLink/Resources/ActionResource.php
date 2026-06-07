<?php

declare(strict_types=1);

namespace Helm\ShipLink\Resources;

use Helm\Resources\Resource;
use Helm\ShipLink\Models\Action;

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

        return [
            'id'             => $action->id,
            'ship_post_id'   => $action->ship_post_id,
            'type'           => $action->type->value,
            'status'         => $action->status->value,
            'params'         => $action->params,
            'result'         => $action->result,
            'deferred_until' => $action->deferred_until?->format('c'),
            'created_at'     => $action->created_at->format('c'),
            'updated_at'     => $action->updated_at->format('c'),
        ];
    }
}
