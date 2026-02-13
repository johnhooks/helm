import { describe, it, expect, vi } from 'vitest';
import { getCurrentAction } from '../resolvers';

describe( 'getCurrentAction resolver', () => {
	it( 'dispatches fetchCurrentAction with the ship ID', async () => {
		const dispatch = Object.assign( vi.fn(), {
			fetchCurrentAction: vi.fn().mockResolvedValue( undefined ),
		} );

		await getCurrentAction( 42 )( { dispatch } as never );

		expect( dispatch.fetchCurrentAction ).toHaveBeenCalledWith( 42 );
	} );
} );
