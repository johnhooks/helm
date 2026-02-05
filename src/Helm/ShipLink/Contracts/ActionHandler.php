<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Handles action processing.
 *
 * Used for both creation-time handlers and resolution-time resolvers.
 * The difference is when they're called, not what they do:
 *
 * - Handler: Called at creation. Sets up the action (status, deferred_until, result).
 * - Resolver: Called when deferred_until passes. Executes the work, updates result.
 *
 * Both mutate the Action and potentially the Ship systems.
 */
interface ActionHandler
{
    /**
     * Handle the action.
     *
     * @param Action $action The action to handle (mutates result, status, etc.)
     * @param Ship $ship The ship performing the action (mutates systems)
     */
    public function handle(Action $action, Ship $ship): void;
}
