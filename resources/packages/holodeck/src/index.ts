// Enums
export { ActionType, actionRequiresTime, actionLabel } from './enums/action-type';
export { ActionStatus, isActionComplete, isActionSuccess } from './enums/action-status';
export { ShipFittingSlot, REQUIRED_SLOTS, EQUIPMENT_SLOTS, isRequiredSlot } from './enums/fitting-slot';

// Types
export type { Hull } from './types/hull';
export type { InstalledComponent } from './types/component';
export type { Loadout } from './types/loadout';
export type { ShipState } from './types/ship-state';
export type { ShipAction } from './types/action';
export type { CatalogProduct, TuningConfig, DriveDSP } from './types/catalog';

// Data
export { HULLS, getHull } from './data/hulls';
export {
	getProduct, getProductsByType, getProductSlugs, getAllProducts,
	DEFAULT_LOADOUT_SLUGS,
} from './data/products';
export type { ComponentType } from './data/products';

// Loadout builder
export { buildLoadout } from './loadout-builder';

// Clock & RNG
export { createClock } from './clock';
export type { Clock } from './clock';
export { createRng } from './rng';
export type { Rng } from './rng';

// Internal state
export { createInternalState } from './state';
export type { InternalShipState, InternalStateConfig } from './state';

// Ship
export { Ship } from './ship';
export { createShip } from './factory';
export type { ShipConfig } from './factory';

// Systems
export { PowerSystem } from './systems/power';
export { PropulsionSystem } from './systems/propulsion';
export { SensorSystem } from './systems/sensors';
export { ShieldSystem } from './systems/shields';
export { HullSystem } from './systems/hull';
export { NavigationSystem } from './systems/navigation';
export { CargoSystem } from './systems/cargo';

// Actions
export { ActionError, ActionErrorCode } from './actions/types';
export type {
	Action, ActionContext, ActionHandler, ActionIntent, ActionOutcome, ActionPreview,
	EmissionDeclaration, EmissionRecord,
} from './actions/types';

// Emissions
export { computeEquipmentEmissions, emissionPowerAtTime } from './emissions';
export { registerHandler, getHandler } from './actions/registry';
export { jumpHandler } from './actions/jump';
export { scanRouteHandler } from './actions/scan-route';
export { firePhaserHandler } from './actions/fire-phaser';
export { fireTorpedoHandler } from './actions/fire-torpedo';

// Engine
export { Engine, createEngine } from './actions/engine';
export type { EnrichedDetection, PassiveDetectionResult } from './actions/engine';

// EM Snapshot
export { computeEMSnapshot } from './em-snapshot';
export type { EMSnapshot, EMSnapshotSource } from './em-snapshot';

// NavGraph
export { NavGraph, createNavGraph, createEmptyNavGraph } from './nav-graph';
export type { GraphNode, GraphEdge, GraphStar } from './data/graph';
export { GRAPH_NODES, GRAPH_EDGES, GRAPH_META, getGraphNode } from './data/graph';

// Nav Generator
export {
	sha256, corridorSeed, seededFloat, waypointHash,
	computeWaypoint, canDirectJump, corridorDifficulty,
} from './nav-generator';
export type { WaypointData } from './nav-generator';
