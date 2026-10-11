import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShipSystemsPanel } from './ship-systems-card';
import meta from './ship-systems-card.stories';

describe('Ship systems power', () => {
	afterEach(() => vi.useRealTimers());
	it('recharges with elapsed time while sections collapse independently', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-11T00:00:00Z'));
		render(
			<ShipSystemsPanel
				{...meta.args}
				ship={{
					power_max: 100,
					power_mode: 'normal',
					power_full_at: '2026-10-11T05:00:00Z',
				}}
			/>
		);
		expect(screen.getByText('50.0')).toBeInTheDocument();
		const engineering = screen.getByRole('button', { name: 'Engineering' });
		fireEvent.click(engineering);
		expect(engineering).toHaveAttribute('aria-expanded', 'false');
		const navigation = screen.getByRole('button', { name: 'Navigation' });
		fireEvent.click(navigation);
		expect(navigation).toHaveAttribute('aria-expanded', 'true');
		expect(engineering).toHaveAttribute('aria-expanded', 'false');
		expect(
			screen.getByRole('progressbar', { name: 'Available power' })
		).toBeInTheDocument();
		act(() => vi.advanceTimersByTime(3600000));
		expect(screen.getByText('60.0')).toBeInTheDocument();
	});
});
