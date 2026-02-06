<?php

declare(strict_types=1);

namespace Helm\Inventory;

/**
 * Types of inventory storage locations.
 *
 * Whether an item is "fitted" or "loose" is determined by the slot column:
 * - slot IS NULL = loose/cargo/storage
 * - slot = 'core' etc = fitted in that slot
 */
enum LocationType: int
{
    case Personal = 1; // User's personal inventory
    case Ship = 2;     // On a ship (fitted or cargo)
    case Station = 3;  // At a station
    case Gate = 4;     // At a gate
}
