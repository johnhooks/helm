import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { reducer, initializeDefaultState } from '../reducer';
import {
	createShipState,
	createSystemComponent,
	createEditsState,
	createState,
} from './fixtures';

function reduce(
	state = initializeDefaultState(),
	action: Parameters<typeof reducer>[1]
) {
	return reducer(state, action);
}

describe('reducer', () => {
	describe('initializeDefaultState', () => {
		it('returns null ship, systems, and initial edits', () => {
			expect(initializeDefaultState()).toEqual({
				ship: { ship: null, error: null },
				systems: { systems: null, error: null },
				edits: {
					ship: null,
					isSubmitting: false,
					error: null,
				},
			});
		});
	});

	describe('FETCH_SHIP_FINISHED', () => {
		it('stores the ship and clears ship error', () => {
			const ship = createShipState();
			const prev = createState({
				ship: { error: new HelmError('helm.test', 'Error') },
			});

			const state = reduce(prev, {
				type: 'FETCH_SHIP_FINISHED',
				ship,
			});

			expect(state.ship.ship).toBe(ship);
			expect(state.ship.error).toBeNull();
		});

		it('replaces an existing ship', () => {
			const original = createShipState({ hull_integrity: 80 });
			const updated = createShipState({ hull_integrity: 100 });
			const prev = createState({ ship: { ship: original } });

			const state = reduce(prev, {
				type: 'FETCH_SHIP_FINISHED',
				ship: updated,
			});

			expect(state.ship.ship?.hull_integrity).toBe(100);
		});

		it('does not affect systems', () => {
			const systems = [createSystemComponent()];
			const prev = createState({ systems: { systems } });

			const state = reduce(prev, {
				type: 'FETCH_SHIP_FINISHED',
				ship: createShipState(),
			});

			expect(state.systems.systems).toBe(systems);
		});
	});

	describe('FETCH_SHIP_FAILED', () => {
		it('stores the error', () => {
			const error = new HelmError('helm.ship.not_found', 'Not found');

			const state = reduce(undefined, {
				type: 'FETCH_SHIP_FAILED',
				error,
			});

			expect(state.ship.error).toBe(error);
		});

		it('does not remove existing ship data', () => {
			const ship = createShipState();
			const prev = createState({ ship: { ship } });

			const state = reduce(prev, {
				type: 'FETCH_SHIP_FAILED',
				error: new HelmError('helm.test', 'Error'),
			});

			expect(state.ship.ship).toBe(ship);
		});
	});

	describe('RECEIVE_SHIP', () => {
		it('stores the ship and clears ship error', () => {
			const ship = createShipState();
			const prev = createState({
				ship: { error: new HelmError('helm.test', 'Error') },
			});

			const state = reduce(prev, {
				type: 'RECEIVE_SHIP',
				ship,
			});

			expect(state.ship.ship).toBe(ship);
			expect(state.ship.error).toBeNull();
		});
	});

	describe('FETCH_SYSTEMS_FINISHED', () => {
		it('stores the systems and clears systems error', () => {
			const systems = [createSystemComponent()];
			const prev = createState({
				systems: { error: new HelmError('helm.test', 'Error') },
			});

			const state = reduce(prev, {
				type: 'FETCH_SYSTEMS_FINISHED',
				systems,
			});

			expect(state.systems.systems).toBe(systems);
			expect(state.systems.error).toBeNull();
		});

		it('replaces existing systems', () => {
			const original = [createSystemComponent({ condition: 0.5 })];
			const updated = [createSystemComponent({ condition: 1.0 })];
			const prev = createState({ systems: { systems: original } });

			const state = reduce(prev, {
				type: 'FETCH_SYSTEMS_FINISHED',
				systems: updated,
			});

			expect(state.systems.systems?.[0].condition).toBe(1.0);
		});

		it('does not affect ship', () => {
			const ship = createShipState();
			const prev = createState({ ship: { ship } });

			const state = reduce(prev, {
				type: 'FETCH_SYSTEMS_FINISHED',
				systems: [createSystemComponent()],
			});

			expect(state.ship.ship).toBe(ship);
		});
	});

	describe('FETCH_SYSTEMS_FAILED', () => {
		it('stores the error', () => {
			const error = new HelmError('helm.test', 'Error');

			const state = reduce(undefined, {
				type: 'FETCH_SYSTEMS_FAILED',
				error,
			});

			expect(state.systems.error).toBe(error);
		});

		it('does not remove existing systems data', () => {
			const systems = [createSystemComponent()];
			const prev = createState({ systems: { systems } });

			const state = reduce(prev, {
				type: 'FETCH_SYSTEMS_FAILED',
				error: new HelmError('helm.test', 'Error'),
			});

			expect(state.systems.systems).toBe(systems);
		});
	});

	describe('RECEIVE_SYSTEMS', () => {
		it('stores the systems and clears systems error', () => {
			const systems = [createSystemComponent()];
			const prev = createState({
				systems: { error: new HelmError('helm.test', 'Error') },
			});

			const state = reduce(prev, {
				type: 'RECEIVE_SYSTEMS',
				systems,
			});

			expect(state.systems.systems).toBe(systems);
			expect(state.systems.error).toBeNull();
		});
	});

	describe('EDIT_SHIP', () => {
		it('merges edits into edits.ship', () => {
			const state = reduce(undefined, {
				type: 'EDIT_SHIP',
				edits: { power_mode: 'overdrive' },
			});

			expect(state.edits.ship).toEqual({ power_mode: 'overdrive' });
		});

		it('accumulates multiple edits', () => {
			const first = reduce(undefined, {
				type: 'EDIT_SHIP',
				edits: { power_mode: 'overdrive' },
			});

			const second = reduce(first, {
				type: 'EDIT_SHIP',
				edits: { hull_integrity: 50 },
			});

			expect(second.edits.ship).toEqual({
				power_mode: 'overdrive',
				hull_integrity: 50,
			});
		});

		it('does not affect other state', () => {
			const ship = createShipState();
			const prev = createState({ ship: { ship } });

			const state = reduce(prev, {
				type: 'EDIT_SHIP',
				edits: { power_mode: 'overdrive' },
			});

			expect(state.ship.ship).toBe(ship);
		});
	});

	describe('PATCH_SHIP_START', () => {
		it('sets isSubmitting and clears error', () => {
			const prev = createState({
				edits: createEditsState({
					error: new HelmError('helm.test', 'Error'),
				}),
			});

			const state = reduce(prev, { type: 'PATCH_SHIP_START' });

			expect(state.edits.isSubmitting).toBe(true);
			expect(state.edits.error).toBeNull();
		});

		it('merges edits when provided', () => {
			const state = reduce(undefined, {
				type: 'PATCH_SHIP_START',
				edits: { power_mode: 'overdrive' },
			});

			expect(state.edits.ship).toEqual({ power_mode: 'overdrive' });
			expect(state.edits.isSubmitting).toBe(true);
		});

		it('preserves existing staged edits', () => {
			const prev = createState({
				edits: createEditsState({
					ship: { power_mode: 'overdrive' },
				}),
			});

			const state = reduce(prev, { type: 'PATCH_SHIP_START' });

			expect(state.edits.ship).toEqual({ power_mode: 'overdrive' });
		});
	});

	describe('PATCH_SHIP_FINISHED', () => {
		it('stores the ship and resets edits', () => {
			const ship = createShipState({ power_mode: 'overdrive' });
			const prev = createState({
				edits: createEditsState({
					ship: { power_mode: 'overdrive' },
					isSubmitting: true,
				}),
			});

			const state = reduce(prev, {
				type: 'PATCH_SHIP_FINISHED',
				ship,
			});

			expect(state.ship.ship).toBe(ship);
			expect(state.edits.ship).toBeNull();
			expect(state.edits.isSubmitting).toBe(false);
			expect(state.edits.error).toBeNull();
		});
	});

	describe('PATCH_SHIP_FAILED', () => {
		it('stores the error and clears isSubmitting', () => {
			const error = new HelmError(
				'helm.ships.patch_failed',
				'Patch failed'
			);
			const prev = createState({
				edits: createEditsState({
					ship: { power_mode: 'overdrive' },
					isSubmitting: true,
				}),
			});

			const state = reduce(prev, {
				type: 'PATCH_SHIP_FAILED',
				error,
			});

			expect(state.edits.error).toBe(error);
			expect(state.edits.isSubmitting).toBe(false);
		});

		it('preserves staged edits', () => {
			const prev = createState({
				edits: createEditsState({
					ship: { power_mode: 'overdrive' },
					isSubmitting: true,
				}),
			});

			const state = reduce(prev, {
				type: 'PATCH_SHIP_FAILED',
				error: new HelmError('helm.test', 'Error'),
			});

			expect(state.edits.ship).toEqual({ power_mode: 'overdrive' });
		});

		it('does not remove existing ship data', () => {
			const ship = createShipState();
			const prev = createState({
				ship: { ship },
				edits: createEditsState({ isSubmitting: true }),
			});

			const state = reduce(prev, {
				type: 'PATCH_SHIP_FAILED',
				error: new HelmError('helm.test', 'Error'),
			});

			expect(state.ship.ship).toBe(ship);
		});
	});

	describe('unknown action', () => {
		it('returns the same state', () => {
			const prev = initializeDefaultState();
			const state = reduce(prev, { type: 'UNKNOWN' } as never);

			expect(state).toEqual(prev);
		});
	});
});
