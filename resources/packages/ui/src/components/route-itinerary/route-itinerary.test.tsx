import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RouteItinerary } from './route-itinerary';
import type { RouteItineraryNode } from './route-itinerary';

const start: RouteItineraryNode = {
	id: 'sol',
	label: 'Sol',
	state: 'complete',
	current: true,
	outgoingLeg: { state: 'active', description: 'Arriving in 8h' },
};
const end: RouteItineraryNode = {
	id: 'tau',
	label: 'Tau Ceti',
	state: 'pending',
};

describe('RouteItinerary', () => {
	it('renders independent caller-supplied node and leg states with no interactive steps', () => {
		const { container } = render(
			<RouteItinerary
				label="Jump itinerary"
				nodes={[start, end]}
				tone="sky"
				activityTone="gold"
			/>
		);
		const list = screen.getByRole('list', { name: 'Jump itinerary' });
		const steps = within(list).getAllByRole('listitem');
		expect(steps).toHaveLength(2);
		expect(steps[0]).toHaveAttribute('aria-current', 'step');
		expect(within(steps[0]).getByText('Complete')).toBeInTheDocument();
		expect(
			within(steps[0]).getByText('Outgoing leg: Active')
		).toBeInTheDocument();
		expect(screen.getByText('Arriving in 8h')).toBeVisible();
		expect(
			container.querySelectorAll('.helm-route-itinerary__leg')
		).toHaveLength(1);
		expect(
			container.querySelector('button, [tabindex], details')
		).toBeNull();
	});

	it('marks route endpoints beside their names without extra description rows', () => {
		render(
			<RouteItinerary
				label="Jump itinerary"
				nodes={[
					{ ...start, endpoint: 'departure' },
					{ ...end, endpoint: 'destination' },
				]}
			/>
		);
		const route = screen.getByRole('list', { name: 'Jump itinerary' });
		expect(
			within(route).getByRole('img', { name: 'Departure' })
		).toBeInTheDocument();
		expect(
			within(route).getByRole('img', { name: 'Destination' })
		).toBeInTheDocument();
		expect(
			route.querySelectorAll('.helm-route-itinerary__description')
		).toHaveLength(0);
	});

	it('updates progress on rerender and never infers the current step from activity', () => {
		const { container, rerender } = render(
			<RouteItinerary label="Route" nodes={[start, end]} />
		);
		rerender(
			<RouteItinerary
				label="Route"
				nodes={[
					{
						...start,
						current: false,
						outgoingLeg: { state: 'complete' },
					},
					{ ...end, state: 'active', current: true },
				]}
			/>
		);
		expect(screen.getByText('Tau Ceti').closest('li')).toHaveAttribute(
			'aria-current',
			'step'
		);
		expect(screen.getByText('Sol').closest('li')).not.toHaveAttribute(
			'aria-current'
		);
		rerender(
			<RouteItinerary
				label="Route"
				nodes={[{ ...end, state: 'active' }]}
			/>
		);
		expect(container.querySelector('[aria-current]')).toBeNull();
	});

	it('keeps an unknown target outside the steps and supports an open-ended search connector', () => {
		const { container } = render(
			<RouteItinerary
				label="Scan discoveries"
				tone="lilac"
				activityTone="orange"
				nodes={[
					{
						id: 'scan-activity',
						label: 'Searching',
						kind: 'search',
						state: 'active',
						current: true,
						outgoingLeg: { state: 'active' },
					},
				]}
				target={{
					id: 'tau',
					label: 'Target: Tau Ceti',
					description: 'Path unknown',
				}}
			/>
		);
		const list = screen.getByRole('list', { name: 'Scan discoveries' });
		expect(within(list).getAllByRole('listitem')).toHaveLength(1);
		expect(within(list).queryByText('Target: Tau Ceti')).toBeNull();
		expect(screen.getByText('Path unknown')).toBeVisible();
		expect(
			container.querySelectorAll('.helm-route-itinerary__leg')
		).toHaveLength(1);
	});

	it('keeps failure details visible and lets the caller disable motion', () => {
		const { container } = render(
			<RouteItinerary
				label="Interrupted route"
				animate={false}
				nodes={[
					{
						...start,
						state: 'failed',
						current: false,
						description: 'Insufficient core',
						outgoingLeg: {
							state: 'failed',
							description: 'Jump stopped',
						},
					},
					end,
				]}
			/>
		);
		expect(screen.getByText('Insufficient core')).toBeVisible();
		expect(screen.getByText('Failed')).toBeInTheDocument();
		expect(screen.getByText('Tau Ceti')).toBeVisible();
		expect(
			container.querySelector('.helm-route-itinerary__leg')
		).toHaveAttribute('data-animate', 'false');
	});

	it('handles empty and target-only routes without inventing steps', () => {
		const { container, rerender } = render(
			<RouteItinerary label="Empty route" nodes={[]} />
		);
		expect(container).toBeEmptyDOMElement();
		rerender(
			<RouteItinerary
				label="Search target"
				nodes={[]}
				target={{ id: 'tau', label: 'Tau Ceti' }}
			/>
		);
		expect(screen.getByText('Tau Ceti')).toBeVisible();
		expect(screen.queryByRole('list')).toBeNull();
	});
});
