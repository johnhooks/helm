/**
 * Client-side error codes for the Helm plugin.
 *
 * Used to construct PluginErrors in JavaScript code.
 * All codes use dot notation: helm.{domain}.{error}
 */
export enum ErrorCode {
	Unknown = 'helm.unknown_error',

	// Datacore errors
	DatacoreUnsupported = 'helm.datacore.unsupported',
	DatacoreWorkerError = 'helm.datacore.worker_error',
	DatacoreUnexpectedResponse = 'helm.datacore.unexpected_response',

	// Cache errors
	CacheFetchFailed = 'helm.cache.fetch_failed',
	CacheSyncFailed = 'helm.cache.sync_failed',

	// Ships errors
	ShipsInvalidResponse = 'helm.ships.invalid_response',
	ShipsSystemsInvalidResponse = 'helm.ships.systems_invalid_response',
	ShipsPatchFailed = 'helm.ships.patch_failed',
	ShipsNotLoaded = 'helm.ships.not_loaded',
	ShipsSystemsNotLoaded = 'helm.ships.systems_not_loaded',
	ShipsMissingSystem = 'helm.ships.missing_system',
	ShipsLoadoutFailed = 'helm.ships.loadout_failed',
	ShipsUnavailable = 'helm.ships.unavailable',
	ShipsSystemsUnavailable = 'helm.ships.systems_unavailable',
	ShipsNoProvider = 'helm.ships.no_provider',

	// Products errors
	ProductsInvalidResponse = 'helm.products.invalid_response',
	ProductsNotPreloaded = 'helm.products.not_preloaded',

	// Actions errors
	ActionsCreateFailed = 'helm.actions.create_failed',
	ActionsInvalidResponse = 'helm.actions.invalid_response',
	ActionsNoDraft = 'helm.actions.no_draft',
	ActionsMissingFill = 'helm.actions.missing_fill',
	ActionsRenderFailed = 'helm.actions.render_failed',

	// Nav errors
	NavNodeNotFound = 'helm.nav.node_not_found',
}
