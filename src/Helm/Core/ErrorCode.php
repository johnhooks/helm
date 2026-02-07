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
    // Action errors
    case ActionNotFound = 'action.not_found';
    case ActionNotReady = 'action.not_ready';
    case ActionClaimFailed = 'action.claim_failed';
    case ActionInProgress = 'action.in_progress';
    case ActionNoHandler = 'action.no_handler';
    case ActionNoResolver = 'action.no_resolver';
    case ActionInsertFailed = 'action.insert_failed';
    case ActionFailed = 'action.failed';
    case ActionCancelled = 'action.cancelled';

    // Navigation errors
    case NavigationInvalidNode = 'navigation.invalid_node';
    case NavigationInvalidTarget = 'navigation.invalid_target';
    case NavigationMissingTarget = 'navigation.missing_target';
    case NavigationNoRoute = 'navigation.no_route';
    case NavigationRouteLost = 'navigation.route_lost';
    case NavigationAlreadyAtTarget = 'navigation.already_at_target';
    case NavigationBeyondRange = 'navigation.beyond_range';
    case NavigationInsufficientFuel = 'navigation.insufficient_fuel';
    case NavigationScanFailed = 'navigation.scan_failed';

    // Ship errors
    case ShipNotFound = 'ship.not_found';
    case ShipNoPosition = 'ship.no_position';
    case ShipInvalidState = 'ship.invalid_state';
    case ShipInsufficientCore = 'ship.insufficient_core';
    case ShipSystemsNotFound = 'ship.systems_not_found';

    // Product errors
    case ProductNotFound = 'product.not_found';

    // Star errors
    case StarNotFound = 'star.not_found';

    // Node errors
    case NodeNotFound = 'node.not_found';

    // Station errors
    case StationNotFound = 'station.not_found';

    // Anomaly errors
    case AnomalyNotFound = 'anomaly.not_found';

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
     * Get the HTTP status code for this error.
     */
    public function httpStatus(): int
    {
        return match ($this) {
            // Not found
            self::ShipNotFound,
            self::ActionNotFound,
            self::StarNotFound,
            self::NodeNotFound,
            self::StationNotFound,
            self::AnomalyNotFound,
            self::ShipSystemsNotFound,
            self::ProductNotFound => 404,

            // Conflict
            self::ActionInProgress => 409,

            // Server error
            self::ActionInsertFailed => 500,

            // Unprocessable (validation)
            self::NavigationInvalidNode,
            self::NavigationInvalidTarget,
            self::NavigationMissingTarget,
            self::NavigationNoRoute,
            self::NavigationAlreadyAtTarget,
            self::NavigationBeyondRange,
            self::NavigationInsufficientFuel,
            self::NavigationScanFailed,
            self::NavigationRouteLost,
            self::ShipNoPosition,
            self::ShipInvalidState,
            self::ShipInsufficientCore => 422,

            // Bad request (default)
            default => 400,
        };
    }

    /**
     * Check if a WP_Error has this error code.
     */
    public function matches(\WP_Error $error): bool
    {
        return $error->get_error_code() === $this->code();
    }
}
