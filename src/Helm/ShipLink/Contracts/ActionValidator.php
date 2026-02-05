<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use Helm\ShipLink\ActionException;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Validates an action can be performed.
 *
 * Validators check preconditions before an action is created.
 * They throw ActionException on failure, return void on success.
 *
 * Validation happens at creation time - "can this ship do this action right now?"
 */
interface ActionValidator
{
    /**
     * Validate that an action can be performed.
     *
     * @param Action $action The action to validate (not yet persisted)
     * @param Ship $ship The ship performing the action
     *
     * @throws ActionException If validation fails
     */
    public function validate(Action $action, Ship $ship): void;
}
