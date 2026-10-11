<?php

declare(strict_types=1);

namespace Helm\ShipLink\Resources;

use Helm\Resources\Resource;
use Helm\ShipLink\Models\Action;

/**
 * Complete action record for trusted diagnostics, including private execution state.
 *
 * @extends Resource<Action>
 */
final class DiagnosticActionResource extends Resource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $action = $this->resource;

        return [
            'id' => $action->id,
            'ship_post_id' => $action->ship_post_id,
            'type' => $action->type->value,
            'status' => $action->status->value,
            'params' => $action->params,
            'result' => $action->result,
            'runtime_state' => $action->runtime_state,
            'deferred_until' => $action->deferred_until?->format('c'),
            'processing_at' => $action->processing_at?->format('c'),
            'attempts' => $action->attempts,
            'created_at' => $action->created_at->format('c'),
            'updated_at' => $action->updated_at->format('c'),
        ];
    }
}
