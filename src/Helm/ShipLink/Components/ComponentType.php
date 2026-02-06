<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Component type categories for system types.
 */
enum ComponentType: string
{
    case Core = 'core';
    case Drive = 'drive';
    case Sensor = 'sensor';
    case Shield = 'shield';
    case Nav = 'nav';
    case Equipment = 'equipment';
}
