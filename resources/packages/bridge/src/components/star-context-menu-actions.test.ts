import { describe, expect, it, vi } from 'vitest';
import type { StarNode } from '@helm/types';
import { getStarContextMenuActions } from './star-context-menu-actions';

const selectedStar: StarNode = {
	id: 2,
	node_id: 7,
	title: 'Tau Ceti',
	catalog_id: 'TAU-007',
	spectral_class: 'G8.5V',
	x: 1,
	y: 2,
	z: 3,
	mass: 1,
	radius: 1,
	node_type: 'star',
};

describe( 'getStarContextMenuActions', () => {
	it( 'returns no actions for the current star', () => {
		const actions = getStarContextMenuActions( {
			selectedStar,
			currentNodeId: 7,
			selectedDistance: 11.9,
			hasActiveAction: false,
			onScanRoute: vi.fn(),
			onClose: vi.fn(),
		} );

		expect( actions ).toEqual( [] );
	} );

	it( 'returns scan and jump actions for a different star', () => {
		const actions = getStarContextMenuActions( {
			selectedStar,
			currentNodeId: 1,
			selectedDistance: 11.9,
			hasActiveAction: false,
			onScanRoute: vi.fn(),
			onClose: vi.fn(),
		} );

		expect( actions ).toHaveLength( 2 );
		expect( actions[ 0 ]?.label ).toBe( 'Scan Route' );
		expect( actions[ 0 ]?.detail ).toBe( '11.9 ly' );
		expect( actions[ 0 ]?.disabled ).toBe( false );
		expect( actions[ 1 ]?.label ).toBe( 'Jump' );
		expect( actions[ 1 ]?.detail ).toBe( 'route unknown' );
		expect( actions[ 1 ]?.disabled ).toBe( true );
	} );

	it( 'disables scan while leaving jump as the placeholder when an action is active', () => {
		const actions = getStarContextMenuActions( {
			selectedStar,
			currentNodeId: 1,
			selectedDistance: 11.9,
			hasActiveAction: true,
			onScanRoute: vi.fn(),
			onClose: vi.fn(),
		} );

		expect( actions[ 0 ]?.disabled ).toBe( true );
		expect( actions[ 1 ]?.disabled ).toBe( true );
	} );

	it( 'closes the menu after starting scan', () => {
		const onScanRoute = vi.fn();
		const onClose = vi.fn();
		const actions = getStarContextMenuActions( {
			selectedStar,
			currentNodeId: 1,
			selectedDistance: 11.9,
			hasActiveAction: false,
			onScanRoute,
			onClose,
		} );

		actions[ 0 ]?.onClick?.();

		expect( onScanRoute ).toHaveBeenCalledTimes( 1 );
		expect( onClose ).toHaveBeenCalledTimes( 1 );
	} );
} );
