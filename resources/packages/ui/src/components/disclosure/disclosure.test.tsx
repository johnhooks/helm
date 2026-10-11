import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Disclosure } from './disclosure';

describe('Disclosure', () => {
	it('opens and closes with the keyboard while retaining child state', async () => {
		const user = userEvent.setup();
		render(
			<Disclosure label="Itinerary">
				<input aria-label="Route note" defaultValue="Sol" />
			</Disclosure>
		);
		const toggle = screen.getByRole('button', { name: 'Itinerary' });
		const panel = document.getElementById(
			toggle.getAttribute('aria-controls')!
		);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(panel).toHaveAttribute('aria-hidden', 'true');
		expect(panel?.inert).toBe(true);
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		await user.tab();
		expect(toggle).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(panel?.inert).toBe(false);
		await user.type(screen.getByRole('textbox'), ' to Tau Ceti');
		await user.click(toggle);
		expect(panel?.inert).toBe(true);
		await user.keyboard(' ');
		expect(screen.getByRole('textbox')).toHaveValue('Sol to Tau Ceti');
	});

	it('keeps multiple disclosures independent with unique controlled panels', async () => {
		const user = userEvent.setup();
		render(
			<>
				<Disclosure label="First" defaultOpen>
					First route
				</Disclosure>
				<Disclosure label="Second">Second route</Disclosure>
			</>
		);
		const first = screen.getByRole('button', { name: 'First' });
		const second = screen.getByRole('button', { name: 'Second' });
		expect(first.getAttribute('aria-controls')).not.toBe(
			second.getAttribute('aria-controls')
		);
		expect(first).toHaveAttribute('aria-expanded', 'true');
		await user.click(second);
		await user.click(first);
		expect(first).toHaveAttribute('aria-expanded', 'false');
		expect(second).toHaveAttribute('aria-expanded', 'true');
	});
});
