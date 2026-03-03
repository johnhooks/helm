/**
 * Shared holodeck setup helpers for DSP/detection workbench commands.
 *
 * Provides functions to create engines, ships, and read catalog values
 * so the 4 DSP commands don't duplicate engine setup logic.
 */

import {
	createShip,
	createClock,
	createRng,
	createEngine,
	buildLoadout,
	createNavGraph,
	getProduct,
	getHull,
	registerHandler,
	ActionType,
	jumpHandler,
	scanRouteHandler,
	firePhaserHandler,
	fireTorpedoHandler,
} from '@helm/holodeck';
import type {
	Engine,
	Ship,
	Clock,
	Rng,
	Hull,
} from '@helm/holodeck';
import type { SensorAffinity } from '@helm/formulas';

// ── Engine setup ─────────────────────────────────────────────

let handlersRegistered = false;

function ensureHandlers(): void {
	if (handlersRegistered) { return; }
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
	registerHandler(ActionType.FirePhaser, firePhaserHandler);
	registerHandler(ActionType.FireTorpedo, fireTorpedoHandler);
	handlersRegistered = true;
}

/**
 * Create a detection-ready engine with a NavGraph.
 * Clock starts at 0 and the graph uses a fixed seed.
 */
export function createDetectionEngine(seed: string = 'helm'): {
	engine: Engine;
	clock: Clock;
	rng: Rng;
} {
	ensureHandlers();
	const clock = createClock(0);
	const rng = createRng(42);
	const graph = createNavGraph(seed);
	const engine = createEngine(clock, graph);
	return { engine, clock, rng };
}

// ── Ship construction ────────────────────────────────────────

export interface ShipComponents {
	core?: string;
	drive?: string;
	sensor?: string;
	shield?: string;
	nav?: string;
}

export interface ShipOptions {
	nodeId?: number;
	equipment?: string[];
	ammo?: Record<string, number>;
	activeEquipment?: string[];
}

/**
 * Build a loadout and create a Ship registered with the engine.
 */
export function createShipAtNode(
	engine: Engine,
	clock: Clock,
	rng: Rng,
	id: string,
	hullSlug: string,
	components?: ShipComponents,
	options?: ShipOptions,
): Ship {
	const loadout = buildLoadout(
		hullSlug,
		{
			core: components?.core,
			drive: components?.drive,
			sensor: components?.sensor,
			shield: components?.shield,
			nav: components?.nav,
		},
		options?.equipment,
	);

	// Compute default ammo from weapon capacity
	const defaultAmmo: Record<string, number> = {};
	for (const eq of loadout.equipment) {
		if (eq.product.type === 'weapon' && eq.product.capacity) {
			defaultAmmo[eq.product.slug] = eq.product.capacity;
		}
	}

	const ship = createShip(loadout, clock, rng, {
		id,
		nodeId: options?.nodeId ?? 1,
		ammo: options?.ammo ?? defaultAmmo,
		activeEquipment: options?.activeEquipment,
	});

	engine.registerShip(id, ship);
	return ship;
}

// ── Catalog access helpers ───────────────────────────────────

export interface WeaponStats {
	slug: string;
	damage: number;
	accuracy: number;
	capacity: number;
	draw: number;
}

export interface ShieldStats {
	slug: string;
	capacity: number;
	rate: number;
	draw: number;
}

export interface CoreStats {
	slug: string;
	capacity: number;
	rate: number;
}

/**
 * Read weapon stats from the product catalog.
 * mult_a = damage/drain rate, mult_b = accuracy, capacity = ammo count.
 */
export function getWeaponStats(slug: string): WeaponStats {
	const p = getProduct(slug);
	if (!p) { throw new Error(`Unknown weapon product: ${slug}`); }
	return {
		slug: p.slug,
		damage: p.mult_a ?? 0,
		accuracy: p.mult_b ?? 0,
		capacity: p.capacity ?? 0,
		draw: p.draw ?? 0,
	};
}

/**
 * Read shield stats from the product catalog.
 * capacity = max shield HP, rate = regen per hour, draw = power consumption.
 */
export function getShieldStats(slug: string): ShieldStats {
	const p = getProduct(slug);
	if (!p) { throw new Error(`Unknown shield product: ${slug}`); }
	return {
		slug: p.slug,
		capacity: p.capacity ?? 0,
		rate: p.rate ?? 0,
		draw: p.draw ?? 0,
	};
}

/**
 * Read core stats from the product catalog.
 * capacity = max power, rate = regen per hour.
 */
export function getCoreStats(slug: string): CoreStats {
	const p = getProduct(slug);
	if (!p) { throw new Error(`Unknown core product: ${slug}`); }
	return {
		slug: p.slug,
		capacity: p.capacity ?? 0,
		rate: p.rate ?? 0,
	};
}

/**
 * Read hull data with defaults for optional multipliers.
 */
export function getHullData(slug: string): Hull & {
	shieldCapacityMultiplier: number;
	weaponDrawMultiplier: number;
	stealthDrawMultiplier: number;
} {
	const hull = getHull(slug);
	if (!hull) { throw new Error(`Unknown hull: ${slug}`); }
	return {
		...hull,
		shieldCapacityMultiplier: hull.shieldCapacityMultiplier ?? 1.0,
		weaponDrawMultiplier: hull.weaponDrawMultiplier ?? 1.0,
		stealthDrawMultiplier: hull.stealthDrawMultiplier ?? 1.0,
	};
}

/**
 * Get sensor affinity from a sensor product's sensorDsp field.
 */
export function getSensorAffinity(slug: string): SensorAffinity {
	const p = getProduct(slug);
	if (!p) { throw new Error(`Unknown sensor product: ${slug}`); }
	if (!p.sensorDsp) { throw new Error(`Sensor ${slug} has no sensorDsp`); }
	return p.sensorDsp;
}

// Re-export commonly used holodeck items for convenience
export {
	getProduct,
	getHull,
	HULLS,
	buildLoadout,
} from '@helm/holodeck';
export type { Engine, Ship, Clock, Rng, Hull, CatalogProduct, Loadout } from '@helm/holodeck';
