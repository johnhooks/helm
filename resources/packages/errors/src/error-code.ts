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

	// Products errors
	ProductsInvalidResponse = 'helm.products.invalid_response',

	// Actions errors
	ActionsCreateFailed = 'helm.actions.create_failed',
	ActionsInvalidResponse = 'helm.actions.invalid_response',
}
