/**
 * Helpers for building holodeck system objects from shared JSON fixtures.
 *
 * These fixtures live in tests/_data/fixtures/ship-state/ and are shared
 * with the PHP contract tests. Both sides produce the same output from
 * the same fixture, ensuring cross-platform computation parity.
 */
import { DEFAULT_PILOT_SKILLS } from '@helm/formulas';
import { buildLoadout } from '../loadout-builder';
import type { InternalShipState } from '../state';
import type { Loadout } from '../types/loadout';
import { PowerSystem } from './power';
import { ShieldSystem } from './shields';
import { PropulsionSystem } from './propulsion';
import { SensorSystem } from './sensors';

export interface FixtureState {
	power_max?: number;
	power_full_at?: number | null;
	power_mode?: string;
	shields_max?: number;
	shields_full_at?: number | null;
	hull_integrity?: number;
	hull_max?: number;
	[key: string]: unknown;
}

export interface FixtureLoadout {
	core?: string;
	drive?: string;
	sensor?: string;
	shield?: string;
	nav?: string;
}

export interface FixtureCase {
	label: string;
	state: FixtureState;
	loadout: FixtureLoadout;
	now?: number;
	distance?: number;
	skip_ts?: boolean;
	expected: Record<string, number>;
}

export function loadoutFromFixture(fixture: FixtureCase): Loadout {
	return buildLoadout('pioneer', {
		core: fixture.loadout.core ?? 'epoch_s',
		drive: fixture.loadout.drive ?? 'dr_505',
		sensor: fixture.loadout.sensor ?? 'vrs_mk1',
		shield: fixture.loadout.shield ?? 'aegis_delta',
		nav: fixture.loadout.nav ?? 'nav_tier_1',
	});
}

export function stateFromFixture(fixture: FixtureCase): InternalShipState {
	const loadout = loadoutFromFixture(fixture);
	const s = fixture.state;

	return {
		id: 'contract-test',
		loadout,
		shieldPriority: 1.0,
		powerFullAt: s.power_full_at ?? null,
		powerMax: s.power_max ?? 100,
		shieldsFullAt: s.shields_full_at ?? null,
		shieldsMax: s.shields_max ?? 100,
		hullIntegrity: s.hull_integrity ?? 100,
		hullMax: s.hull_max ?? 100,
		coreLife: loadout.core.life ?? loadout.core.product.hp ?? 0,
		nodeId: null,
		cargo: {},
		ammo: {},
		activeEquipment: new Set(),
		pilot: { ...DEFAULT_PILOT_SKILLS },
	};
}

export interface FixtureSystems {
	state: InternalShipState;
	power: PowerSystem;
	shields: ShieldSystem;
	propulsion: PropulsionSystem;
	sensors: SensorSystem;
}

export function systemsFromFixture(fixture: FixtureCase): FixtureSystems {
	const state = stateFromFixture(fixture);
	const power = new PowerSystem(state, state.loadout);
	const shields = new ShieldSystem(state, state.loadout);
	const propulsion = new PropulsionSystem(state, state.loadout, power);
	const sensors = new SensorSystem(state, state.loadout, power);

	return { state, power, shields, propulsion, sensors };
}
