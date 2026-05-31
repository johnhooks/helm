import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DraftAction } from '@helm/actions';
import { DraftJumpCard } from './draft-jump-card';

const TARGET_NAME = 'Tau Ceti';
const noop = vi.fn();
const routePath = {
	reachable: true,
	direct: false,
	nodeIds: [1, 3, 7],
	edgeIds: [101, 102],
	totalDistance: 11.9,
	nextNodeId: 3,
};
const routeNodeNames = ['Sol', 'Waypoint #3', TARGET_NAME];
const draftProps = {
	onCancel: noop,
	onSubmit: noop,
	isSubmitting: false,
	routePath,
	routeNodeNames,
};

const draft: DraftAction<'jump'> = {
	type: 'jump',
	params: {
		from_node_id: 1,
		target_node_id: 7,
		route: [101],
	},
};

describe('DraftJumpCard', () => {
	it('renders the target name in the title', () => {
		render(
			<DraftJumpCard
				draft={draft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		);
		expect(screen.getByText('Jump — Tau Ceti')).toBeInTheDocument();
	});

	it('renders route details from the known path', () => {
		render(
			<DraftJumpCard
				draft={draft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		);
		expect(screen.getByText('11.9')).toBeInTheDocument();
		expect(
			screen.getByText(/Sol → Waypoint #3 → Tau Ceti/)
		).toBeInTheDocument();
	});

	it('renders placeholder values for unknown fields', () => {
		const { container } = render(
			<DraftJumpCard
				draft={draft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		);
		const placeholders = container.querySelectorAll('*');
		const texts = Array.from(placeholders).map((el) => el.textContent);
		expect(texts.some((t) => t?.includes('--'))).toBe(true);
	});
});
