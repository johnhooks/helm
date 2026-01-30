<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use Helm\ShipLink\Action;
use Helm\ShipLink\ActionResult;
use Helm\Ships\Ship;

/**
 * ShipLink contract - the starship interface.
 *
 * From the outside, ShipLink IS the ship. Internal systems are
 * implementation details accessed through this interface.
 */
interface ShipLink
{
    /**
     * Get the underlying ship model.
     */
    public function getShip(): Ship;

    /**
     * Get the ship ID.
     */
    public function getId(): int;

    /**
     * Get the owner's user ID.
     */
    public function getOwnerId(): int;

    /**
     * Process an action and return the result.
     *
     * Systems are invoked internally, model is mutated,
     * and aggregate result is returned.
     */
    public function process(Action $action): ActionResult;

    /**
     * Check if an action can be processed (validation only, no mutation).
     */
    public function canProcess(Action $action): bool;

    /**
     * Access the power system.
     */
    public function power(): PowerSystem;

    /**
     * Access the propulsion system.
     */
    public function propulsion(): Propulsion;

    /**
     * Access the sensor system.
     */
    public function sensors(): Sensors;

    /**
     * Access the navigation system.
     */
    public function navigation(): Navigation;

    /**
     * Access the shield system.
     */
    public function shields(): Shields;

    /**
     * Access the hull system.
     */
    public function hull(): Hull;
}
