import type { WpRestErrorResponse } from '@helm/errors';

/**
 * Per-action-type contracts for params and results at each lifecycle stage.
 *
 * Uses declaration merging: extend ActionTypeMap to add new action types.
 */

interface ActionResultError {
	error?: WpRestErrorResponse;
}

type FailedResult<T extends ActionResultError> = Partial<T> & ActionResultError;

// -- Scan Route ---------------------------------------------------------------

interface ScanRouteParams {
	target_node_id: number;
	source_node_id: number;
	distance_ly: number;
}

interface ScanRouteActiveResult extends ActionResultError {
	from_node_id: number;
	to_node_id: number;
	skill: number;
	efficiency: number;
	duration: number;
	waypoints_created?: number;
	discovered_edge_ids?: number[];
	discovered_node_ids?: number[];
}

interface ScanRouteFulfilledResult extends ScanRouteActiveResult {
	success: boolean;
	complete: boolean;
	discovered_edge_ids: number[];
	discovered_node_ids: number[];
	edges_discovered: number;
	waypoints_created: number;
	path: number[];
}

type ScanRouteFailedResult = FailedResult<ScanRouteActiveResult>;

interface ScanRouteContract {
	params: ScanRouteParams;
	activeResult: ScanRouteActiveResult;
	fulfilledResult: ScanRouteFulfilledResult;
	failedResult: ScanRouteFailedResult;
}

// -- Jump ---------------------------------------------------------------------

interface JumpParams {
	from_node_id: number;
	target_node_id: number;
	route: number[];
}

interface JumpRoutePhase {
	core_cost: number;
	core_before: number;
	remaining_core_life: number;
	completed_at: string;
}

interface JumpActiveResult extends ActionResultError {
	phases?: JumpRoutePhase[];
	current_node_id?: number;
	remaining_core_life?: number;
	core_before?: number;
}

interface JumpFulfilledResult extends JumpActiveResult {
	remaining_core_life: number;
	core_before: number;
}

type JumpFailedResult = FailedResult<JumpActiveResult>;

interface JumpContract {
	params: JumpParams;
	activeResult: JumpActiveResult;
	fulfilledResult: JumpFulfilledResult;
	failedResult: JumpFailedResult;
}

// -- Map & lookup -------------------------------------------------------------

/**
 * Maps action type strings to their typed contracts.
 *
 * Extend this interface via declaration merging to register new action types.
 */
export interface ActionTypeMap {
	scan_route: ScanRouteContract;
	jump: JumpContract;
}

export interface DefaultActionContract {
	params: Record<string, unknown>;
	activeResult: Record<string, unknown>;
	fulfilledResult: Record<string, unknown>;
	failedResult: Record<string, unknown>;
}

/**
 * Resolves the contract for an action type string.
 * Known types get their full contract; unknown types fall back to DefaultActionContract.
 */
export type ActionContract<T extends string> = T extends keyof ActionTypeMap
	? ActionTypeMap[T]
	: DefaultActionContract;
