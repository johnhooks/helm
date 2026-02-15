/**
 * Ship Log — reverse-chronological feed of ship actions.
 *
 * Connects to the actions store and renders each action as a LogCard.
 * Supports cursor-based pagination via "Load more" button.
 */
import { useEffect, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import type { ShipAction } from '@helm/actions';
import { Button, LogCard, StatusBadge, Countdown } from '@helm/ui';
import type { LcarsTone } from '@helm/ui';
import './ship-log.css';

interface ShipLogProps {
	shipId: number;
}

/* ----------------------------------------------------------------
 *  Action type → LogCard tone
 * --------------------------------------------------------------- */

const ACTION_TONE: Record< string, LcarsTone > = {
	scan_route: 'lilac',
	scan_planet: 'lilac',
	survey: 'lilac',
	jump: 'sky',
	mine: 'gold',
	refine: 'gold',
	buy: 'accent',
	sell: 'accent',
	transfer: 'accent',
	repair: 'orange',
	upgrade: 'orange',
};

/* ----------------------------------------------------------------
 *  Action type → title
 * --------------------------------------------------------------- */

const ACTION_TITLE: Record< string, string > = {
	scan_route: __( 'Route Scan', 'helm' ),
	scan_planet: __( 'Planet Scan', 'helm' ),
	survey: __( 'System Survey', 'helm' ),
	jump: __( 'Jump', 'helm' ),
	mine: __( 'Mining', 'helm' ),
	refine: __( 'Refining', 'helm' ),
	buy: __( 'Purchase', 'helm' ),
	sell: __( 'Sale', 'helm' ),
	transfer: __( 'Transfer', 'helm' ),
	repair: __( 'Repair', 'helm' ),
	upgrade: __( 'Upgrade', 'helm' ),
};

/* ----------------------------------------------------------------
 *  Time formatting
 * --------------------------------------------------------------- */

function formatTime( iso: string ): string {
	const date = new Date( iso );
	return date.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
}

function getRemainingSeconds( deferredUntil: string | null ): number {
	if ( ! deferredUntil ) {
		return 0;
	}
	const target = new Date( deferredUntil ).getTime();
	return Math.max( 0, Math.floor( ( target - Date.now() ) / 1000 ) );
}

/* ----------------------------------------------------------------
 *  ShipLogCard — renders a single action as a LogCard
 * --------------------------------------------------------------- */

function ShipLogCard( { action }: { action: ShipAction } ) {
	const isActive = action.status === 'pending' || action.status === 'running';
	const tone = ACTION_TONE[ action.type ] ?? 'neutral';

	// Title: use target_name from params if available, otherwise default.
	const params = action.params as Record< string, unknown >;
	const targetName = params.target_name as string | undefined;
	const baseTitle = ACTION_TITLE[ action.type ] ?? action.type;
	const title = targetName ? `${ baseTitle } — ${ targetName }` : baseTitle;

	// Variant.
	const variant = isActive ? 'active' : 'default';

	// Time.
	const time = isActive ? __( 'now', 'helm' ) : formatTime( action.created_at );

	// Status badge.
	let status;
	if ( isActive ) {
		status = <StatusBadge tone="info" size="sm" pulse>{ __( 'In Progress', 'helm' ) }</StatusBadge>;
	} else if ( action.status === 'fulfilled' ) {
		status = <StatusBadge tone="success" size="sm">{ __( 'Complete', 'helm' ) }</StatusBadge>;
	} else if ( action.status === 'partial' ) {
		status = <StatusBadge tone="warning" size="sm">{ __( 'Partial', 'helm' ) }</StatusBadge>;
	} else if ( action.status === 'failed' ) {
		status = <StatusBadge tone="danger" size="sm">{ __( 'Failed', 'helm' ) }</StatusBadge>;
	}

	// Countdown for active actions.
	const [ remaining, setRemaining ] = useState( () =>
		getRemainingSeconds( action.deferred_until )
	);

	useEffect( () => {
		if ( ! isActive || ! action.deferred_until ) {
			return;
		}
		setRemaining( getRemainingSeconds( action.deferred_until ) );
		const interval = setInterval( () => {
			setRemaining( getRemainingSeconds( action.deferred_until! ) );
		}, 1000 );
		return () => clearInterval( interval );
	}, [ isActive, action.deferred_until ] );

	return (
		<LogCard
			time={ time }
			title={ title }
			tone={ tone }
			variant={ variant }
			status={ status }
		>
			{ isActive && action.deferred_until && (
				<Countdown
					label={ __( 'ETA', 'helm' ) }
					remaining={ remaining }
					tone={ tone }
					active
					size="sm"
				/>
			) }
		</LogCard>
	);
}

/* ----------------------------------------------------------------
 *  DraftLogCard — renders the current draft action
 * --------------------------------------------------------------- */

function DraftLogCard() {
	const draft = useSelect(
		( select ) => select( actionsStore ).getDraft(),
		[]
	);

	if ( ! draft ) {
		return null;
	}

	const tone = ACTION_TONE[ draft.type ] ?? 'neutral';
	const title = ACTION_TITLE[ draft.type ] ?? draft.type;

	return (
		<LogCard
			time={ __( 'draft', 'helm' ) }
			title={ title }
			tone={ tone }
			variant="draft"
			status={ <StatusBadge tone="warning" size="sm">{ __( 'Pending', 'helm' ) }</StatusBadge> }
		/>
	);
}

/* ----------------------------------------------------------------
 *  ShipLog — container component
 * --------------------------------------------------------------- */

export function ShipLog( { shipId }: ShipLogProps ) {
	const { actions, canLoadMore, isLoading } = useSelect(
		( select ) => ( {
			actions: select( actionsStore ).getActions( shipId ),
			canLoadMore: select( actionsStore ).canLoadMore( shipId ),
			isLoading: select( actionsStore ).isLoading( shipId ),
		} ),
		[ shipId ]
	);

	const { loadMore } = useDispatch( actionsStore );

	return (
		<div className="helm-ship-log">
			<div className="helm-ship-log__label">{ __( 'Ship Log', 'helm' ) }</div>
			<div className="helm-ship-log__list">
				<DraftLogCard />
				{ actions.map( ( action ) => (
					<ShipLogCard key={ action.id } action={ action } />
				) ) }
				{ canLoadMore && (
					<div className="helm-ship-log__load-more">
						<Button
							variant="tertiary"
							size="sm"
							onClick={ () => loadMore( shipId ) }
							disabled={ isLoading }
						>
							{ isLoading
								? __( 'Loading\u2026', 'helm' )
								: __( 'Load more', 'helm' )
							}
						</Button>
					</div>
				) }
			</div>
		</div>
	);
}
