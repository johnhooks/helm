import { fireEvent, render, screen } from '@testing-library/react';
import { dispatch, select } from '@wordpress/data';
import { describe, expect, it, vi } from 'vitest';
import type { StarNode } from '@helm/types';
import { store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { StarContextMenu } from './star-context-menu';

const star: StarNode = {
	id: 1,
	node_id: 42,
	title: 'Sol',
	catalog_id: 'SOL-001',
	spectral_class: 'G2V',
	x: 0,
	y: 0,
	z: 0,
	mass: 1,
	radius: 1,
	node_type: 'star',
};

function seedDirectEdge(fromNodeId: number, targetNodeId: number): void {
	dispatch(navStore).receiveAdjacency(fromNodeId, targetNodeId, true);
}

describe('StarContextMenu', () => {
	// Tests run sequentially in declaration order; the "no route known" cases
	// are asserted before any seedDirectEdge() call so the module-singleton
	// wp-data registry is still clean at that point.
	it('renders the selected star header and a disabled Jump for the current star', () => {
		render(
			<StarContextMenu
				star={star}
				currentNodeId={star.node_id}
				selectedDistance={0}
				hasActiveAction={false}
				onClose={vi.fn()}
			/>
		);

		expect(screen.getByText('Sol')).toBeInTheDocument();
		expect(screen.getByText('G2V')).toBeInTheDocument();
		expect(
			screen.queryByRole('menuitem', { name: /^Scan Route/ })
		).not.toBeInTheDocument();
		const jump = screen.getByRole('menuitem', { name: /^Jump/ });
		expect(jump).toBeDisabled();
		expect(jump).toHaveTextContent('already here');
	});

	it('shows Scan Route and a disabled Jump when no route to this star is known', () => {
		render(
			<StarContextMenu
				star={star}
				currentNodeId={1}
				selectedDistance={11.9}
				hasActiveAction={false}
				onClose={vi.fn()}
			/>
		);

		expect(
			screen.getByRole('menuitem', { name: /^Scan Route/ })
		).toBeInTheDocument();
		const jump = screen.getByRole('menuitem', { name: /^Jump/ });
		expect(jump).toBeDisabled();
		expect(jump).toHaveTextContent('route unknown');
	});

	it('hides Scan Route and enables Jump when a route to this star is already known', () => {
		seedDirectEdge(1, star.node_id);

		render(
			<StarContextMenu
				star={star}
				currentNodeId={1}
				selectedDistance={11.9}
				hasActiveAction={false}
				onClose={vi.fn()}
			/>
		);

		expect(
			screen.queryByRole('menuitem', { name: /^Scan Route/ })
		).not.toBeInTheDocument();
		const jump = screen.getByRole('menuitem', { name: /^Jump/ });
		expect(jump).toBeEnabled();
		expect(jump).toHaveTextContent('11.9 ly');
	});

	it('disables Jump with an in-progress detail when another action is active', () => {
		render(
			<StarContextMenu
				star={star}
				currentNodeId={1}
				selectedDistance={11.9}
				hasActiveAction={true}
				onClose={vi.fn()}
			/>
		);

		const jump = screen.getByRole('menuitem', { name: /^Jump/ });
		expect(jump).toBeDisabled();
		expect(jump).toHaveTextContent('action in progress');
	});

	it('drafts a jump action and closes the menu when Jump is clicked', () => {
		dispatch(actionsStore).clearDraft();
		const onClose = vi.fn();

		render(
			<StarContextMenu
				star={star}
				currentNodeId={1}
				selectedDistance={11.9}
				hasActiveAction={false}
				onClose={onClose}
			/>
		);

		fireEvent.click(screen.getByRole('menuitem', { name: /^Jump/ }));

		const draft = select(actionsStore).getDraft();
		expect(draft).toEqual({
			type: 'jump',
			params: {
				target_node_id: star.node_id,
				source_node_id: 1,
				distance_ly: 11.9,
			},
		});
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('closes on escape', () => {
		const onClose = vi.fn();

		render(
			<StarContextMenu
				star={star}
				currentNodeId={star.node_id}
				selectedDistance={0}
				hasActiveAction={false}
				onClose={onClose}
			/>
		);
		fireEvent.keyDown(document, { key: 'Escape' });

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
