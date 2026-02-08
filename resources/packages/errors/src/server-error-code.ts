/**
 * Server-side error codes mirroring the PHP ErrorCode enum.
 *
 * Used to match against errors received from the server via REST responses.
 * These are never used to construct PluginErrors in client code.
 * All codes use dot notation: helm.{domain}.{error}
 */
export enum ServerErrorCode {
	// Action errors
	ActionNotFound = 'helm.action.not_found',
	ActionNotReady = 'helm.action.not_ready',
	ActionClaimFailed = 'helm.action.claim_failed',
	ActionInProgress = 'helm.action.in_progress',
	ActionNoHandler = 'helm.action.no_handler',
	ActionNoResolver = 'helm.action.no_resolver',
	ActionInsertFailed = 'helm.action.insert_failed',
	ActionFailed = 'helm.action.failed',
	ActionCancelled = 'helm.action.cancelled',

	// Navigation errors
	NavigationInvalidNode = 'helm.navigation.invalid_node',
	NavigationInvalidTarget = 'helm.navigation.invalid_target',
	NavigationMissingTarget = 'helm.navigation.missing_target',
	NavigationNoRoute = 'helm.navigation.no_route',
	NavigationRouteLost = 'helm.navigation.route_lost',
	NavigationAlreadyAtTarget = 'helm.navigation.already_at_target',
	NavigationBeyondRange = 'helm.navigation.beyond_range',
	NavigationInsufficientFuel = 'helm.navigation.insufficient_fuel',
	NavigationScanFailed = 'helm.navigation.scan_failed',

	// Ship errors
	ShipNotFound = 'helm.ship.not_found',
	ShipNoPosition = 'helm.ship.no_position',
	ShipInvalidState = 'helm.ship.invalid_state',
	ShipInsufficientCore = 'helm.ship.insufficient_core',
	ShipSystemsNotFound = 'helm.ship.systems_not_found',

	// Product errors
	ProductNotFound = 'helm.product.not_found',

	// Star errors
	StarNotFound = 'helm.star.not_found',

	// Node errors
	NodeNotFound = 'helm.node.not_found',

	// Station errors
	StationNotFound = 'helm.station.not_found',

	// Anomaly errors
	AnomalyNotFound = 'helm.anomaly.not_found',

	// Origin errors
	OriginNotInitialized = 'helm.origin.not_initialized',
	OriginAlreadyInitialized = 'helm.origin.already_initialized',
}
