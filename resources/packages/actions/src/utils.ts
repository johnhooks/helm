import { HelmError, isWpRestErrorResponse } from '@helm/errors';
import type { ShipAction } from './store/types';

export function getActionError(action: ShipAction): HelmError | null {
	const result = action.result;

	if (!result || typeof result !== 'object' || !('error' in result)) {
		return null;
	}

	return isWpRestErrorResponse(result.error)
		? HelmError.from(result.error)
		: null;
}
