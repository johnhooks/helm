import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
	it('renders its anchor without showing the tooltip', () => {
		render(
			<Tooltip text="Tau Ceti — 2d 3h">
				<button type="button">Anchor</button>
			</Tooltip>
		);

		expect(
			screen.getByRole('button', { name: 'Anchor' })
		).toBeInTheDocument();
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('shows the skinned tooltip on hover', async () => {
		const user = userEvent.setup();
		render(
			<Tooltip text="Tau Ceti — 2d 3h" delay={0} className="custom">
				<button type="button">Anchor</button>
			</Tooltip>
		);

		await user.hover(screen.getByRole('button', { name: 'Anchor' }));

		const tooltip = await screen.findByRole('tooltip');
		expect(tooltip).toHaveTextContent('Tau Ceti — 2d 3h');
		expect(tooltip).toHaveClass(
			'helm-tooltip',
			'components-tooltip',
			'custom'
		);
	});

	it('shows the tooltip on keyboard focus', async () => {
		const user = userEvent.setup();
		render(
			<Tooltip text="Leg duration" delay={0}>
				<button type="button">Anchor</button>
			</Tooltip>
		);

		await user.tab();

		expect(await screen.findByRole('tooltip')).toHaveTextContent(
			'Leg duration'
		);
	});
});
