<?php

declare(strict_types=1);

namespace Helm\ShipLink\Resources;

use Helm\Resources\Resource;
use Helm\ShipLink\Models\ShipState;

/**
 * Client-facing representation of operational ship state.
 *
 * @extends Resource<ShipState>
 */
final class ShipStateResource extends Resource
{
    public function __construct(ShipState $state)
    {
        parent::__construct($state);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $state = $this->resource;

        return [
            'id'                => $state->ship_post_id,
            'power_mode'        => $state->power_mode->slug(),
            'power_full_at'     => $state->power_full_at?->format('c'),
            'power_max'         => $state->power_max,
            'shields_full_at'   => $state->shields_full_at?->format('c'),
            'shields_max'       => $state->shields_max,
            'hull_integrity'    => $state->hull_integrity,
            'hull_max'          => $state->hull_max,
            'node_id'           => $state->node_id,
            'current_action_id' => $state->current_action_id,
            'created_at'        => $state->created_at->format('c'),
            'updated_at'        => $state->updated_at->format('c'),
        ];
    }
}
