import { describe, it, expect, vi } from 'vitest';
import { getShip } from '../resolvers';

describe( 'getShip resolver', () => {
	it( 'dispatches fetchShip with the ship ID', async () => {
		const dispatch = Object.assign( vi.fn(), {
			fetchShip: vi.fn().mockResolvedValue( undefined ),
		} );

		await getShip( 42 )( { dispatch } as never );

		expect( dispatch.fetchShip ).toHaveBeenCalledWith( 42 );
	} );
} );
