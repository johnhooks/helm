import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DraftAction } from '@helm/actions';
import { DraftScanCard } from './draft-scan-card';

const TARGET_NAME = 'Tau Ceti';
const noop = vi.fn();
const draftProps = { onCancel: noop, onSubmit: noop, isSubmitting: false };

const draft: DraftAction<'scan_route'> = {
	type: 'scan_route',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
	},
};

describe('DraftScanCard', () => {
	it('renders the target name in the title', () => {
		render(
			<DraftScanCard
				draft={draft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		);
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
	});

	it('renders the distance from params', () => {
		render(
			<DraftScanCard
				draft={draft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		);
		expect(screen.getByText('11.9')).toBeInTheDocument();
	});

	it('renders placeholder values for unknown fields', () => {
		const { container } = render(
			<DraftScanCard
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
