import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealActionStory } from './action-store';

describe('real action story fixtures', () => {
	it('renders the scan wrapper and advances a draft without a server request', async () => {
		const user = userEvent.setup();
		render(
			<RealActionStory
				scenario={{
					kind: 'scan_route',
					draft: {
						type: 'scan_route',
						params: {
							source_node_id: 1,
							target_node_id: 7,
							distance_ly: 8,
						},
					},
				}}
			/>
		);
		expect(screen.getByText(/Route Scan.*Tau Ceti/)).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Confirm' }));
		expect(screen.getByText('Next update')).toBeInTheDocument();
	});

	it('reads a seeded known path for a jump draft', () => {
		render(
			<RealActionStory
				scenario={{
					kind: 'jump',
					draft: {
						type: 'jump',
						params: {
							from_node_id: 1,
							target_node_id: 7,
							route: [101, 102],
						},
					},
				}}
			/>
		);
		const route = screen.getByRole('list', { name: 'Jump itinerary' });
		expect(route).toHaveTextContent('Sol');
		expect(route).toHaveTextContent('Waypoint #2');
		expect(route).toHaveTextContent('Tau Ceti');
	});
});
