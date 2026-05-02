import { passiveReport, informationTier } from '@helm/formulas';
import type { SensorAffinity, InformationTier } from '@helm/formulas';
import type { Clock } from '../clock';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionStatus, isActionComplete } from '../enums/action-status';
import { ActionType } from '../enums/action-type';
import type { Ship } from '../ship';
import type { NavGraph } from '../nav-graph';
import type {
	Action,
	ActionContext,
	ActionPreview,
	EmissionDeclaration,
	EmissionRecord,
} from './types';
import { ActionError, ActionErrorCode } from './types';
import { getHandler } from './registry';
import { computeEMSnapshot } from '../em-snapshot';
import type { EMSnapshot } from '../em-snapshot';

export interface EnrichedDetection {
	confidence: number;
	tier: InformationTier | null;
	label?: string;
}

export interface PassiveDetectionResult {
	snapshot: EMSnapshot;
	detections: EnrichedDetection[];
	sensorAffinity: SensorAffinity;
	integrationSeconds: number;
}

export class Engine implements ActionContext {
	readonly clock: Clock;
	private readonly graph?: NavGraph;
	private readonly actions: Action[] = [];
	private readonly currentActionByShip = new Map<string, number>();
	private readonly shipsByAction = new Map<number, Ship>();
	private readonly shipRegistry = new Map<string, Ship>();
	private readonly emissions: EmissionRecord[] = [];
	private nextActionId = 1;
	private nextEmissionId = 1;

	constructor(clock: Clock, graph?: NavGraph) {
		this.clock = clock;
		this.graph = graph;
	}

	registerShip(id: string, ship: Ship): void {
		this.shipRegistry.set(id, ship);
	}

	getShip(id: string): Ship | undefined {
		return this.shipRegistry.get(id);
	}

	getGraph(): NavGraph | undefined {
		return this.graph;
	}

	getActiveEmissions(nodeId: number, atTime?: number): EmissionRecord[] {
		const t = atTime ?? this.clock.now();
		return this.emissions.filter(
			(e) =>
				e.nodeId === nodeId &&
				e.startedAt <= t &&
				(e.endedAt === null || e.endedAt > t)
		);
	}

	getAllEmissions(): readonly EmissionRecord[] {
		return this.emissions;
	}

	private recordEmissions(
		shipId: string,
		actionId: number,
		declarations: EmissionDeclaration[],
		startedAt: number,
		defaultNodeId: number
	): void {
		for (const decl of declarations) {
			this.emissions.push({
				id: this.nextEmissionId++,
				shipId,
				actionId,
				nodeId: decl.nodeId ?? defaultNodeId,
				emissionType: decl.emissionType,
				spectralType: decl.spectralType,
				basePower: decl.basePower,
				startedAt,
				endedAt: null,
				envelope: decl.envelope,
				label: decl.label,
			});
		}
	}

	private endEmissions(actionId: number, endedAt: number): void {
		for (const emission of this.emissions) {
			if (emission.actionId === actionId && emission.endedAt === null) {
				emission.endedAt = endedAt;
			}
		}
	}

	submitAction(
		ship: Ship,
		type: ActionType,
		params: Record<string, unknown> = {}
	): Action {
		const shipId = ship.resolve().id;

		// Auto-register ship if not already registered
		if (!this.shipRegistry.has(shipId)) {
			this.shipRegistry.set(shipId, ship);
		}

		if (this.currentActionByShip.has(shipId)) {
			throw new ActionError(
				ActionErrorCode.ActionInProgress,
				'An action is already in progress'
			);
		}

		const handler = getHandler(type);
		if (!handler) {
			throw new ActionError(
				ActionErrorCode.ActionNoHandler,
				`No handler registered for action type: ${type}`
			);
		}

		handler.validate(ship, params, this);

		const now = this.clock.now();
		const intent = handler.handle(ship, params, now, this);

		const action: Action = {
			id: this.nextActionId++,
			shipId,
			type,
			params: { ...params },
			status: ActionStatus.Pending,
			createdAt: now,
			deferredUntil: intent.deferredUntil,
			result: { ...intent.result },
		};

		this.actions.push(action);
		this.shipsByAction.set(action.id, ship);

		const nodeId = ship.resolve().nodeId ?? 0;

		if (intent.emissions?.length) {
			this.recordEmissions(
				shipId,
				action.id,
				intent.emissions,
				now,
				nodeId
			);
		}

		if (intent.deferredUntil === null) {
			const outcome = handler.resolve(ship, action, this);
			this.endEmissions(action.id, now);
			action.status = outcome.status;
			Object.assign(action.result, outcome.result);
		} else {
			this.currentActionByShip.set(shipId, action.id);
		}

		return action;
	}

	advance(seconds: number): Action[] {
		this.clock.advance(seconds);
		const resolved = this.resolveReady();
		const passiveScans = this.processPassiveScans();
		return [...resolved, ...passiveScans];
	}

	advanceUntilIdle(): Action[] {
		const all: Action[] = [];
		let iterations = 0;

		while (this.currentActionByShip.size > 0 && iterations < 1000) {
			const earliestDeferral = this.findEarliestDeferral();
			if (earliestDeferral === null) {
				break;
			}

			const nextPassiveScan =
				this.findNextPassiveScanBefore(earliestDeferral);
			if (nextPassiveScan !== null) {
				this.clock.advanceTo(nextPassiveScan);
				all.push(...this.processPassiveScans());
			} else {
				this.clock.advanceTo(earliestDeferral);
				all.push(...this.resolveReady());
			}
			iterations++;
		}

		return all;
	}

	private findEarliestDeferral(): number | null {
		let earliest: number | null = null;
		for (const actionId of this.currentActionByShip.values()) {
			const action = this.actions.find((a) => a.id === actionId);
			if (
				action?.deferredUntil !== null &&
				action?.deferredUntil !== undefined
			) {
				if (earliest === null || action.deferredUntil < earliest) {
					earliest = action.deferredUntil;
				}
			}
		}
		return earliest;
	}

	private findNextPassiveScanBefore(deadline: number): number | null {
		let earliest: number | null = null;
		for (const [, ship] of this.shipRegistry) {
			if (!ship.sensors.getSensorAffinity()) {
				continue;
			}
			const nextScan = ship.getNextPassiveScanAt();
			if (nextScan <= deadline) {
				if (earliest === null || nextScan < earliest) {
					earliest = nextScan;
				}
			}
		}
		return earliest;
	}

	previewAction(
		ship: Ship,
		type: ActionType,
		params: Record<string, unknown> = {}
	): ActionPreview {
		const handler = getHandler(type);
		if (!handler) {
			return {
				valid: false,
				error: `No handler for action type: ${type}`,
			};
		}

		const clonedClock = createClock(this.clock.now());
		const clonedRng = createRng(0);
		const clone = ship.createClone(clonedClock, clonedRng);

		try {
			handler.validate(clone, params, this);
		} catch (e) {
			if (e instanceof ActionError) {
				return { valid: false, error: e.message };
			}
			throw e;
		}

		const now = clonedClock.now();
		const intent = handler.handle(clone, params, now, this);

		const tempAction: Action = {
			id: 0,
			shipId: ship.resolve().id,
			type,
			params: { ...params },
			status: ActionStatus.Pending,
			createdAt: now,
			deferredUntil: intent.deferredUntil,
			result: { ...intent.result },
		};

		// Resolve all phases (multi-phase support)
		let iterations = 0;
		while (iterations < 100) {
			if (tempAction.deferredUntil !== null) {
				clonedClock.advanceTo(tempAction.deferredUntil);
			}

			const outcome = handler.resolve(clone, tempAction, this);
			Object.assign(tempAction.result, outcome.result);
			tempAction.status = outcome.status;

			if (
				outcome.deferredUntil !== null &&
				outcome.deferredUntil !== undefined &&
				!isActionComplete(outcome.status)
			) {
				tempAction.deferredUntil = outcome.deferredUntil;
				iterations++;
			} else {
				break;
			}
		}

		return {
			valid: true,
			intent,
			projectedState: clone.resolve(),
		};
	}

	getCurrentAction(ship: Ship): Action | null {
		const shipId = ship.resolve().id;
		const actionId = this.currentActionByShip.get(shipId);
		if (actionId === undefined) {
			return null;
		}
		return this.actions.find((a) => a.id === actionId) ?? null;
	}

	getActions(ship?: Ship): readonly Action[] {
		if (!ship) {
			return this.actions;
		}
		const shipId = ship.resolve().id;
		return this.actions.filter((a) => a.shipId === shipId);
	}

	getShipsAtNode(nodeId: number): Array<{ shipId: string; ship: Ship }> {
		const result: Array<{ shipId: string; ship: Ship }> = [];
		for (const [shipId, ship] of this.shipRegistry) {
			if (ship.resolve().nodeId === nodeId) {
				result.push({ shipId, ship });
			}
		}
		return result;
	}

	computeEMSnapshot(nodeId: number, atTime?: number): EMSnapshot {
		const t = atTime ?? this.clock.now();

		// Determine spectral class from graph node
		let spectralClass = 'G'; // default for waypoints / no graph
		if (this.graph) {
			const node = this.graph.getNode(nodeId);
			if (node?.star?.spectralClass) {
				spectralClass = node.star.spectralClass;
			}
		}

		const actionEmissions = this.getActiveEmissions(nodeId, t);
		const shipsAtNode = this.getShipsAtNode(nodeId);

		return computeEMSnapshot(
			nodeId,
			spectralClass,
			actionEmissions,
			shipsAtNode,
			t
		);
	}

	queryPassiveDetection(
		shipId: string,
		integrationSeconds: number,
		atTime?: number
	): PassiveDetectionResult | null {
		const ship = this.shipRegistry.get(shipId);
		if (!ship) {
			return null;
		}

		const state = ship.resolve();
		if (state.nodeId === null) {
			return null;
		}

		const sensorAffinity = ship.sensors.getSensorAffinity();
		if (!sensorAffinity) {
			return null;
		}

		const t = atTime ?? this.clock.now();
		const snapshot = this.computeEMSnapshot(state.nodeId, t);

		// Filter out querying ship's own emissions from sources
		// (own emissions still contribute to noise floor via the snapshot)
		const otherSources = snapshot.sources.filter(
			(s) => s.shipId !== shipId
		);

		const detections = passiveReport(
			otherSources,
			snapshot.noiseFloor,
			sensorAffinity,
			integrationSeconds
		);

		const enriched: EnrichedDetection[] = detections.map((d) => ({
			confidence: d.confidence,
			tier: informationTier(d.confidence),
			label: d.label,
		}));

		return {
			snapshot,
			detections: enriched,
			sensorAffinity,
			integrationSeconds,
		};
	}

	processPassiveScans(): Action[] {
		const now = this.clock.now();
		const created: Action[] = [];

		for (const [shipId, ship] of this.shipRegistry) {
			if (ship.getNextPassiveScanAt() > now) {
				continue;
			}

			const action = this.createPassiveScanAction(shipId, ship, now);
			if (action) {
				created.push(action);
			}
			ship.scheduleNextPassiveScan(now);
		}

		return created;
	}

	processPassiveScan(shipId: string): Action | null {
		const ship = this.shipRegistry.get(shipId);
		if (!ship) {
			return null;
		}

		const now = this.clock.now();
		const action = this.createPassiveScanAction(shipId, ship, now);
		if (action) {
			ship.scheduleNextPassiveScan(now);
		}
		return action;
	}

	private createPassiveScanAction(
		shipId: string,
		ship: Ship,
		now: number
	): Action | null {
		const state = ship.resolve();
		const integrationSeconds = state.passiveScanInterval;

		const result = this.queryPassiveDetection(
			shipId,
			integrationSeconds,
			now
		);
		if (!result || result.detections.length === 0) {
			return null;
		}

		const action: Action = {
			id: this.nextActionId++,
			shipId,
			type: ActionType.ScanPassive,
			params: {},
			status: ActionStatus.Fulfilled,
			createdAt: now,
			deferredUntil: null,
			result: {
				detections: result.detections,
				noise_floor: result.snapshot.noiseFloor,
				stellar_baseline: result.snapshot.stellarBaseline,
				ecm_noise: result.snapshot.ecmNoise,
				source_count: result.snapshot.sources.length,
				integration_seconds: result.integrationSeconds,
			},
		};

		this.actions.push(action);
		return action;
	}

	private resolveReady(): Action[] {
		const resolved: Action[] = [];
		const now = this.clock.now();

		for (const [shipId, actionId] of this.currentActionByShip) {
			const action = this.actions.find((a) => a.id === actionId);
			if (
				!action ||
				action.deferredUntil === null ||
				action.deferredUntil > now
			) {
				continue;
			}

			const handler = getHandler(action.type);
			if (!handler) {
				continue;
			}

			const ship = this.shipsByAction.get(actionId);
			if (!ship) {
				continue;
			}

			const outcome = handler.resolve(ship, action, this);

			// End emissions from prior phase
			this.endEmissions(actionId, now);

			// Merge result
			Object.assign(action.result, outcome.result);

			if (
				outcome.deferredUntil !== null &&
				outcome.deferredUntil !== undefined &&
				!isActionComplete(outcome.status)
			) {
				// Multi-phase: action continues to next phase
				action.status = outcome.status;
				action.deferredUntil = outcome.deferredUntil;

				// Record new emissions for this phase
				if (outcome.emissions?.length) {
					const currentNodeId = ship.resolve().nodeId ?? 0;
					this.recordEmissions(
						action.shipId,
						actionId,
						outcome.emissions,
						now,
						currentNodeId
					);
				}
			} else {
				// Terminal: action is done
				action.status = outcome.status;
				this.currentActionByShip.delete(shipId);
				resolved.push(action);
			}
		}

		return resolved;
	}
}

export function createEngine(clock: Clock, graph?: NavGraph): Engine {
	return new Engine(clock, graph);
}
