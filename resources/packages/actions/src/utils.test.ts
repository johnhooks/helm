import { describe, expect, it } from 'vitest';
import type { ShipAction } from './store/types';
import { getActionError } from './utils';

const baseAction: ShipAction<'jump'> = {
	id: 1,
	ship_post_id: 42,
	type: 'jump',
	status: 'failed',
	params: {
		from_node_id: 1,
		target_node_id: 2,
		route: [101],
	},
	result: null,
	deferred_until: null,
	created_at: '2026-02-16T12:00:00Z',
	updated_at: '2026-02-16T12:00:00Z',
};

describe('getActionError', () => {
	it('returns null when the action has no result error', () => {
		expect(getActionError(baseAction)).toBeNull();
		expect(
			getActionError({
				...baseAction,
				result: {},
			})
		).toBeNull();
	});

	it('extracts a HelmError from a serialized WP REST error', () => {
		const error = getActionError({
			...baseAction,
			result: {
				error: {
					code: 'helm.ship.insufficient_core',
					message: 'Core life too low for this jump',
					data: { status: 422 },
				},
			},
		});

		expect(error?.message).toBe('helm.ship.insufficient_core');
		expect(error?.detail).toBe('Core life too low for this jump');
		expect(error?.status).toBe(422);
	});

	it('can extract errors from partial actions', () => {
		const error = getActionError({
			...baseAction,
			status: 'partial',
			result: {
				remaining_core_life: 12,
				core_before: 20,
				error: {
					code: 'helm.navigation.no_route',
					message: 'Route can no longer continue',
				},
			},
		});

		expect(error?.message).toBe('helm.navigation.no_route');
		expect(error?.detail).toBe('Route can no longer continue');
	});
});
