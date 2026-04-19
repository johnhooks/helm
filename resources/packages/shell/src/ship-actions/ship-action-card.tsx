/**
 * ShipActionCard — renders one action card by type.
 *
 * Direct switch on the action type rather than a registry. The set of types
 * is known at build time (`@helm/actions` ActionTypeMap), so the decoupling
 * a registry buys doesn't pay for its complexity here. Adding a new type:
 * write a renderer in ./{type}/, import it here, add a case. A `never`
 * assertion in the default path turns "forgot to add a case" into a
 * compile-time error.
 *
 * The throw is an unsafe HelmError by design: this is a developer
 * misconfiguration, not an actionable user-facing state. Callers must wrap
 * in an ErrorBoundary (ShipLog uses ShipActionErrorFallback) so the raw
 * error never reaches the user directly.
 */
import { ErrorCode, HelmError } from '@helm/errors';
import type { DraftAction, ShipAction, ShipActionType } from '@helm/actions';
import { renderScanAction } from './scan/scan-action';
import { renderJumpAction } from './jump/jump-action';

export interface ShipActionCardProps {
	type: ShipActionType;
	action?: ShipAction;
	draft?: DraftAction;
}

export function ShipActionCard( { type, action, draft }: ShipActionCardProps ) {
	switch ( type ) {
		case 'scan_route':
			return <>{ renderScanAction( { action, draft } ) }</>;
		case 'jump':
			return <>{ renderJumpAction( { action, draft } ) }</>;
		case 'survey':
		case 'scan_planet':
		case 'mine':
		case 'refine':
		case 'buy':
		case 'sell':
		case 'transfer':
		case 'repair':
		case 'upgrade':
			throw new HelmError(
				ErrorCode.ActionsMissingFill,
				`No ship action renderer for type: ${ type }`
			);
		default: {
			const _exhaustive: never = type;
			throw new HelmError(
				ErrorCode.ActionsMissingFill,
				`Unhandled ship action type: ${ String( _exhaustive ) }`
			);
		}
	}
}
