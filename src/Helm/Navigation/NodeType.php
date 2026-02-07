<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * How a navigation node was created.
 *
 * Any node can have celestials attached regardless of type —
 * a waypoint could gain a station or anomaly later.
 */
enum NodeType: int
{
    case System = 1;    // Created from star catalog data
    case Waypoint = 2;  // Algorithmically generated navigation point
}
