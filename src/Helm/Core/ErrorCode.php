<?php

declare(strict_types=1);

namespace Helm\Core;

/**
 * Centralized error codes for the Helm system.
 *
 * All error codes use dot notation: helm.{domain}.{error}
 * Use the code() method to get the full prefixed string.
 *
 * @see docs/dev/errors.md for documentation
 */
enum ErrorCode: string
{
    // Navigation errors
    case NavigationInvalidNode = 'navigation.invalid_node';
    case NavigationInvalidTarget = 'navigation.invalid_target';
    case NavigationNoRoute = 'navigation.no_route';
    case NavigationBeyondRange = 'navigation.beyond_range';
    case NavigationInsufficientFuel = 'navigation.insufficient_fuel';
    case NavigationScanFailed = 'navigation.scan_failed';

    // Ship errors
    case ShipNotFound = 'ship.not_found';
    case ShipInvalidState = 'ship.invalid_state';

    // Star errors
    case StarNotFound = 'star.not_found';

    // Origin errors
    case OriginNotInitialized = 'origin.not_initialized';
    case OriginAlreadyInitialized = 'origin.already_initialized';

    /**
     * Get the full error code with helm. prefix.
     */
    public function code(): string
    {
        return 'helm.' . $this->value;
    }

    /**
     * Create a WP_Error with this error code.
     *
     * @param string $message Error message
     * @param mixed $data Optional additional data
     */
    public function error(string $message, mixed $data = null): \WP_Error
    {
        return new \WP_Error($this->code(), $message, $data);
    }

    /**
     * Check if a WP_Error has this error code.
     */
    public function matches(\WP_Error $error): bool
    {
        return $error->get_error_code() === $this->code();
    }
}
