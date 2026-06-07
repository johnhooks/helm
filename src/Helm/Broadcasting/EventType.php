<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

/**
 * Client-facing broadcast event types.
 *
 * Each event type owns its payload contract. The database stores the event type
 * and payload, while the browser maps event types to the appropriate handler.
 */
enum EventType: string
{
    case ShipActionUpdated = 'ship.action.updated';
    case ShipStateUpdated = 'ship.state.updated';
}
