import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderJumpAction } from './jump-action';

const nav = vi.hoisted(() => ({
	findKnownPath: vi.fn(),
	getUserEdges: vi.fn(),
	getNode: vi.fn(),
	expectNode: vi.fn(),
	isCreating: () => false,
}));

vi.mock('@wordpress/data', async (importOriginal) => ({
	...(await importOriginal<typeof import('@wordpress/data')>()),
	useSelect: (callback: (select: () => typeof nav) => unknown) =>
		callback(() => nav),
	useDispatch: () => ({ clearDraft: vi.fn(), createAction: vi.fn() }),
}));
vi.mock('@helm/ships', () => ({ useShip: () => ({ shipId: 42 }) }));

const draft = {
	type: 'jump' as const,
	params: { from_node_id: 1, target_node_id: 7, route: [101, 102] },
};

beforeEach(() => {
	vi.clearAllMocks();
	nav.findKnownPath.mockReturnValue({
		edgeIds: [201, 202],
		nodeIds: [1, 3, 7],
	});
	nav.getUserEdges.mockReturnValue([
		{ id: 101, node_a_id: 1, node_b_id: 2 },
		{ id: 102, node_a_id: 2, node_b_id: 7 },
		{ id: 201, node_a_id: 1, node_b_id: 3 },
		{ id: 202, node_a_id: 3, node_b_id: 7 },
		{ id: 999, node_a_id: 98, node_b_id: 99 },
	]);
	nav.getNode.mockImplementation((id: number) => ({
		title: `Star ${id}`,
		spectral_class: 'M',
	}));
	nav.expectNode.mockReturnValue({ title: 'Tau Ceti' });
});

describe('jump route details', () => {
	it.each(['draft', 'running', 'fulfilled'] as const)(
		'only reads accepted route nodes for %s cards',
		(status) => {
			const props =
				status === 'draft'
					? { draft }
					: {
							action: {
								...draft,
								id: 1,
								ship_post_id: 42,
								status,
								created_at: '2026-10-11T12:00:00Z',
								updated_at: '2026-10-11T12:00:00Z',
								deferred_until: null,
								result: {
									phases: [],
									remaining_core_life: 100,
									current_node_id: 1,
								},
							},
					  };
			render(renderJumpAction(props));
			expect(nav.getNode.mock.calls.map(([id]) => id)).toEqual([1, 2, 7]);
		}
	);
});
