/**
 * Ship Log — reverse-chronological feed of ship actions.
 *
 * Reads the actions store and renders each action through ShipActionCard,
 * which dispatches to a per-type renderer via its internal switch.
 * Supports cursor-based pagination via the "Load more" button.
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import type { DraftAction, ShipAction } from '@helm/actions';
import { Button } from '@helm/ui';
import { ErrorBoundary } from 'react-error-boundary';
import { ShipActionCard } from '../ship-actions/ship-action-card';
import { ShipActionErrorFallback } from '../ship-actions/ship-action-error-fallback';
import './ship-log.css';

interface ShipLogProps {
	shipId: number;
}

function DraftLogCard( { draft }: { draft: DraftAction } ) {
	return (
		<ErrorBoundary FallbackComponent={ ShipActionErrorFallback }>
			<ShipActionCard
				type={ draft.type }
				draft={ draft }
			/>
		</ErrorBoundary>
	);
}

function ShipLogCard( { action }: { action: ShipAction } ) {
	return (
		<ErrorBoundary FallbackComponent={ ShipActionErrorFallback }>
			<ShipActionCard
				type={ action.type }
				action={ action }
			/>
		</ErrorBoundary>
	);
}

export function ShipLog( { shipId }: ShipLogProps ) {
	const { actions, canLoadMore, isLoading, draft } = useSelect(
		( select ) => ( {
			actions: select( actionsStore ).getActions( shipId ),
			canLoadMore: select( actionsStore ).canLoadMore( shipId ),
			isLoading: select( actionsStore ).isLoading( shipId ),
			draft: select( actionsStore ).getDraft(),
		} ),
		[ shipId ]
	);

	const { loadMore } = useDispatch( actionsStore );

	return (
		<div className="helm-ship-log">
			<div className="helm-ship-log__label">{ __( 'Ship Log', 'helm' ) }</div>
			<div className="helm-ship-log__list">
				{ draft && <DraftLogCard draft={ draft } /> }
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
