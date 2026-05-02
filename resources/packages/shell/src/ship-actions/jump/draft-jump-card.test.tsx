import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DraftAction } from '@helm/actions';
import { DraftJumpCard } from './draft-jump-card';

const TARGET_NAME = 'Tau Ceti';
const noop = vi.fn();
const draftProps = { onCancel: noop, onSubmit: noop, isSubmitting: false };

const draft: DraftAction<'jump'> = {
	type: 'jump',
	params: {
		target_node_id: 7,
		source_node_id: 1,
		distance_ly: 11.9,
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
		expect(screen.getByText(/Tau Ceti/)).toBeInTheDocument();
	});

	it('renders the distance from params', () => {
		render(
			<DraftJumpCard
				draft={draft}
				targetName={TARGET_NAME}
				{...draftProps}
			/>
		);
		expect(screen.getByText('11.9')).toBeInTheDocument();
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
