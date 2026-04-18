import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ContextMenuAction } from '@helm/ui';
import type { StarNode } from '@helm/types';
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

describe( 'StarContextMenu', () => {
	it( 'renders the selected star header without actions', () => {
		render( <StarContextMenu star={ star } actions={ [] } onClose={ vi.fn() } /> );

		expect( screen.getByText( 'Sol' ) ).toBeInTheDocument();
		expect( screen.getByText( 'G2V' ) ).toBeInTheDocument();
		expect( screen.queryAllByRole( 'menuitem' ) ).toHaveLength( 0 );
	} );

	it( 'renders the provided actions unchanged', () => {
		const actions: ContextMenuAction[] = [
			{ label: 'Scan Route', detail: '11.9 ly', onClick: vi.fn() },
			{ label: 'Jump', detail: 'route unknown', disabled: true },
		];

		render( <StarContextMenu star={ star } actions={ actions } onClose={ vi.fn() } /> );

		expect( screen.getByText( 'Scan Route' ) ).toBeInTheDocument();
		expect( screen.getByText( '11.9 ly' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Jump' ) ).toBeInTheDocument();
		expect( screen.getByText( 'route unknown' ) ).toBeInTheDocument();
	} );

	it( 'closes on escape', () => {
		const onClose = vi.fn();

		render( <StarContextMenu star={ star } actions={ [] } onClose={ onClose } /> );
		fireEvent.keyDown( document, { key: 'Escape' } );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
	} );
} );
