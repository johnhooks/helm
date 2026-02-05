<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Exceptions\HelmException;

/**
 * Exception thrown when an action fails.
 *
 * Creators and resolvers throw this to indicate failure.
 * The ActionFactory/ActionResolver catch it and mark the action as failed.
 */
class ActionException extends HelmException
{
}
