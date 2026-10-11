import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from '../route';
import { RouteStepIndicator } from './route-step-indicator';
import type { RouteLeg, RouteNode } from '../route';

const sol: RouteNode = {
	id: 1,
	label: 'Sol',
	spectralClass: 'G',
	state: 'complete',
	current: true,
};

const waypoint: RouteNode = {
	id: 2,
	label: 'Barnard Waypoint',
	kind: 'waypoint',
	state: 'pending',
};

const tau: RouteNode = {
	id: 3,
	label: 'Tau Ceti',
	spectralClass: 'G',
	state: 'pending',
	destination: true,
};

const legs: RouteLeg[] = [
	{ id: '1-2', details: ['1d 8h'], state: 'pending' },
	{ id: '2-3', details: ['2d 3h'], state: 'pending' },
];

describe('Route', () => {
	it('renders an informational route without step current semantics or tab stops', () => {
		const { container } = render(
			<Route
				nodes={[sol, waypoint, tau]}
				legs={legs}
				label="Known route"
			/>
		);

		expect(screen.getByRole('list', { name: 'Known route' })).toBeVisible();
		expect(container.querySelector('[aria-current="step"]')).toBeNull();
		expect(container.querySelector('[tabindex="0"]')).toBeNull();
		expect(screen.queryByText('Sol (current, complete)')).toBeNull();
	});

	it('can opt in to keyboard inspection for route details', () => {
		const { container } = render(
			<Route nodes={[sol, tau]} legs={[legs[0]]} inspectable />
		);

		expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(3);
		expect(screen.getByText('Sol (current, complete)')).toBeInTheDocument();
	});

	it('keeps route leg tooltip text focused on edge details', async () => {
		const user = userEvent.setup();
		render(<Route nodes={[sol, tau]} legs={[legs[0]]} inspectable />);

		await user.tab();
		await user.tab();

		expect(await screen.findByText('1d 8h')).toBeInTheDocument();
		expect(screen.queryByText('Sol to Tau Ceti (1d 8h)')).toBeNull();
	});
});

describe('RouteStepIndicator', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders an ordered list with one step per node', () => {
		render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={legs}
				label="Jump route"
			/>
		);

		const list = screen.getByRole('list', { name: 'Jump route' });
		expect(list.tagName).toBe('OL');
		expect(screen.getAllByRole('listitem')).toHaveLength(3);
	});

	it('renders nothing for an empty route', () => {
		const { container } = render(<RouteStepIndicator nodes={[]} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('describes the route with an accessible summary', () => {
		render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={legs}
				label="Jump route"
			/>
		);

		expect(
			screen.getByRole('list', { name: 'Jump route' })
		).toHaveAccessibleDescription(
			'Route with 3 steps. 0 of 2 legs complete. current step 1, Sol. destination Tau Ceti.'
		);
	});

	it('normalizes star glyphs inside the fixed node footprint', () => {
		const { container } = render(
			<RouteStepIndicator nodes={[sol, tau]} legs={[legs[0]]} />
		);

		const glyphBoxes = container.querySelectorAll(
			'.helm-route__node-glyph'
		);
		expect(glyphBoxes).toHaveLength(2);
		glyphBoxes.forEach((box) => {
			expect(box.querySelector('.helm-star-glyph')).not.toBeNull();
		});
	});

	it('renders fallback markers for waypoint and unknown nodes', () => {
		const { container } = render(
			<RouteStepIndicator
				nodes={[waypoint, { id: 9, kind: 'unknown', state: 'pending' }]}
				legs={[{ state: 'pending' }]}
			/>
		);

		expect(
			container.querySelector('.helm-route__node--waypoint')
		).not.toBeNull();
		expect(
			container.querySelector('.helm-route__node--unknown')
		).not.toBeNull();
		expect(container.querySelector('.helm-star-glyph')).toBeNull();
		// The unlabeled node falls back to its position.
		expect(screen.getByText('Node 2 (pending)')).toBeInTheDocument();
	});

	it('marks the current node with aria-current="step"', () => {
		const { container } = render(
			<RouteStepIndicator nodes={[sol, waypoint, tau]} legs={legs} />
		);

		const current = container.querySelector('[aria-current="step"]');
		expect(current).toHaveClass('helm-route__node');
		expect(current).toHaveTextContent('Sol (current, complete)');
	});

	it('marks the active leg with aria-current when no node is current', () => {
		const { container } = render(
			<RouteStepIndicator
				nodes={[{ ...sol, current: false }, waypoint, tau]}
				legs={[
					{ details: ['1d 8h'], state: 'complete' },
					{ details: ['2d 3h'], state: 'active' },
				]}
			/>
		);

		const current = container.querySelector('[aria-current="step"]');
		expect(current).toHaveClass('helm-route__leg');
		expect(current).toHaveClass('helm-route__leg--active');
	});

	it('renders state modifiers on nodes and legs', () => {
		const { container } = render(
			<RouteStepIndicator
				nodes={[
					{ ...sol, current: false },
					{ ...waypoint, state: 'failed' },
					tau,
				]}
				legs={[{ state: 'complete' }, { state: 'failed' }]}
			/>
		);

		expect(
			container.querySelector('.helm-route__node--complete')
		).not.toBeNull();
		expect(
			container.querySelector('.helm-route__node--failed')
		).not.toBeNull();
		expect(
			container.querySelector('.helm-route__leg--complete')
		).not.toBeNull();
		expect(
			container.querySelector('.helm-route__leg--failed')
		).not.toBeNull();
	});

	it('handles one-leg and multi-hop routes', () => {
		const { container, rerender } = render(
			<RouteStepIndicator nodes={[sol, tau]} legs={[legs[0]]} />
		);
		expect(container.querySelectorAll('.helm-route__leg')).toHaveLength(1);

		rerender(
			<RouteStepIndicator
				nodes={[sol, waypoint, { id: 4, label: 'Luyten 726-8' }, tau]}
				legs={legs}
			/>
		);
		expect(container.querySelectorAll('.helm-route__leg')).toHaveLength(3);
	});

	it('reveals node and leg details on keyboard focus', async () => {
		const user = userEvent.setup();
		render(<RouteStepIndicator nodes={[sol, waypoint, tau]} legs={legs} />);

		await user.tab();
		expect(await screen.findByText('Sol')).toBeInTheDocument();

		await user.tab();
		expect(await screen.findByText('1d 8h')).toBeInTheDocument();
		expect(
			screen.getByText('Sol to Barnard Waypoint (1d 8h, pending)')
		).toBeInTheDocument();
	});

	it('keeps complete leg context in assistive text without forcing a tooltip', () => {
		render(
			<RouteStepIndicator
				nodes={[sol, tau]}
				legs={[{ details: [''], state: 'pending' }]}
			/>
		);

		expect(
			screen.getByText('Sol to Tau Ceti (pending)')
		).toBeInTheDocument();
	});

	it('renders inspectable steps as non-interactive elements by default', () => {
		render(<RouteStepIndicator nodes={[sol, waypoint, tau]} legs={legs} />);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('renders buttons and fires callbacks when select handlers are given', async () => {
		const user = userEvent.setup();
		const onNodeSelect = vi.fn();
		const onLegSelect = vi.fn();
		render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={legs}
				onNodeSelect={onNodeSelect}
				onLegSelect={onLegSelect}
			/>
		);

		// 3 nodes + 2 legs.
		expect(screen.getAllByRole('button')).toHaveLength(5);

		await user.click(
			screen.getByRole('button', { name: 'Barnard Waypoint (pending)' })
		);
		expect(onNodeSelect).toHaveBeenCalledWith(waypoint, 1);

		await user.click(
			screen.getByRole('button', {
				name: 'Sol to Barnard Waypoint (1d 8h, pending)',
			})
		);
		expect(onLegSelect).toHaveBeenCalledWith(legs[0], 0);
	});

	it('keeps focus stable when a discovered waypoint is inserted', async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<RouteStepIndicator nodes={[sol, tau]} legs={[legs[0]]} />
		);

		const solNode = screen
			.getByText('Sol (current, complete)')
			.closest('.helm-route__node');

		await user.tab();
		expect(solNode).toHaveFocus();

		rerender(
			<RouteStepIndicator nodes={[sol, waypoint, tau]} legs={legs} />
		);

		expect(solNode).toHaveFocus();
		expect(
			screen.getByText('Barnard Waypoint (pending)')
		).toBeInTheDocument();
	});

	it('fills the leg track from a clamped progress value', () => {
		const { container } = render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={[
					{
						details: ['1d 8h'],
						state: 'active',
						progress: 62,
						distanceLy: 4.25,
					},
					{ details: ['2d 3h'], state: 'pending', progress: 250 },
				]}
			/>
		);

		const fills = container.querySelectorAll('.helm-route__leg-fill');
		expect(fills[0]).toHaveStyle({ width: '62%' });
		expect(fills[1]).toHaveStyle({ width: '100%' });
		expect(
			screen.getByText(
				'Sol to Barnard Waypoint (1d 8h, active, 62% complete)'
			)
		).toBeInTheDocument();
	});

	it('marks active legs without progress as indeterminate', () => {
		const { container } = render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={[
					{ details: ['1d 8h'], state: 'active' },
					{ details: ['2d 3h'], state: 'active', progress: 30 },
				]}
			/>
		);

		const indeterminate = container.querySelectorAll(
			'.helm-route__leg--indeterminate'
		);
		expect(indeterminate).toHaveLength(1);
		expect(
			indeterminate[0]?.querySelector('.helm-route__leg-fill')
		).not.toHaveStyle({ width: '30%' });
	});

	it('applies leg distances in distance layout', () => {
		render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={[
					{ ...legs[0], distanceLy: 1.4 },
					{ ...legs[1], distanceLy: 6.2 },
				]}
				layout="distance"
			/>
		);

		const [first, second, last] = screen.getAllByRole('listitem');
		expect(first).toHaveStyle({ flexGrow: '1.4' });
		expect(second).toHaveStyle({ flexGrow: '6.2' });
		expect(last.getAttribute('style')).toBeNull();
	});

	it('does not require distance layout values to total 100', () => {
		render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={[
					{ ...legs[0], distanceLy: 0.75 },
					{ ...legs[1], distanceLy: 2.5 },
				]}
				layout="distance"
			/>
		);

		const [first, second] = screen.getAllByRole('listitem');
		expect(first).toHaveStyle({ flexGrow: '0.75' });
		expect(second).toHaveStyle({ flexGrow: '2.5' });
	});

	it('falls back to even layout when distance data is missing', () => {
		render(
			<RouteStepIndicator
				nodes={[sol, waypoint, tau]}
				legs={[{ ...legs[0], distanceLy: 1.4 }, { ...legs[1] }]}
				layout="distance"
			/>
		);

		const [first] = screen.getAllByRole('listitem');
		expect(first.getAttribute('style')).toBeNull();
	});
});
