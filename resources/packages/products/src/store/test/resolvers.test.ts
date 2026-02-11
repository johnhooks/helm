import { describe, it, expect, vi } from 'vitest';
import { getProduct } from '../resolvers';

describe( 'getProduct resolver', () => {
	it( 'dispatches fetchProduct with the product ID', async () => {
		const dispatch = Object.assign( vi.fn(), {
			fetchProduct: vi.fn().mockResolvedValue( undefined ),
		} );

		await getProduct( 42 )( { dispatch } as never );

		expect( dispatch.fetchProduct ).toHaveBeenCalledWith( 42 );
	} );
} );
