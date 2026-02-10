<?php

declare(strict_types=1);

namespace Helm\Rest;

/**
 * WP REST link relation identifiers registered by the Helm plugin.
 */
enum LinkRel: string
{
    case Inventory = 'helm:inventory';
    case Product   = 'helm:product';
    case Ship      = 'helm:ship';
    case Systems   = 'helm:systems';
}
