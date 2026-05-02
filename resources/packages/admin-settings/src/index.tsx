/**
 * Helm Settings — admin settings entry point.
 *
 * Uses the nav store for datacore sync and status display.
 * Provides a manual datacore sync button,
 * and shows the current ship via the ShipProvider context.
 */
import { createRoot, Suspense, useState } from '@wordpress/element';
import { useSelect, useDispatch, useSuspenseSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	AppRoot,
	Button,
	Panel,
	Readout,
	StatusBadge,
	Title,
	TitleBar,
} from '@helm/ui';
import { ErrorBoundary } from 'react-error-boundary';
import { store as navStore } from '@helm/nav';
import { store as actionsStore } from '@helm/actions';
import { HelmError } from '@helm/core';
import { HelmErrorFallback } from '@helm/shell';
import { log } from '@helm/logger';
import { ShipProvider, useShip } from '@helm/ships';

function errorData(err: unknown): Record<string, unknown> {
	if (HelmError.is(err)) {
		return {
			code: err.message,
			detail: err.detail,
			causes: err.causes.map((c) => ({
				code: c.message,
				detail: c.detail,
			})),
		};
	}
	return { error: err instanceof Error ? err.message : err };
}

function ShipPanel() {
	const { ship, systems } = useShip();
	const isActive = ship.current_action_id !== null;

	return (
		<Panel variant="bordered" tone="neutral">
			<div className="helm-flex helm-flex-col helm-gap-4">
				<TitleBar title={__('Ship', 'helm')} tone="neutral">
					<StatusBadge
						tone={isActive ? 'info' : 'success'}
						pulse={isActive}
					>
						{isActive ? __('Active', 'helm') : __('Idle', 'helm')}
					</StatusBadge>
				</TitleBar>
				<div className="helm-flex helm-gap-8">
					<Readout
						label={__('Hull', 'helm')}
						value={ship.hull_integrity}
						unit="%"
						tone="neutral"
					/>
					<Readout
						label={__('Systems', 'helm')}
						value={systems.length}
						tone="neutral"
					/>
					<Readout
						label={__('Position', 'helm')}
						value={ship.node_id}
						tone="neutral"
					/>
				</div>
			</div>
		</Panel>
	);
}

function NoShip() {
	return (
		<Panel variant="bordered" tone="neutral">
			<Title label={__('Ship', 'helm')} size="sm" />
			<Readout
				label={__('Status', 'helm')}
				value={__('No ship assigned', 'helm')}
				tone="neutral"
			/>
		</Panel>
	);
}

function Settings() {
	const shipId = window.helm.settings.shipId;
	const [localError, setLocalError] = useState<string | null>(null);

	// Trigger the nav resolver — suspends until hydrate/sync completes.
	useSuspenseSelect((select) => select(navStore).getStarNodes(), []);

	const { syncStatus, syncResult, navError } = useSelect(
		(select) => ({
			syncStatus: select(navStore).getSyncStatus(),
			syncResult: select(navStore).getSyncResult(),
			navError: select(navStore).getError(),
		}),
		[]
	);

	const cursor = useSelect(
		(select) => select(actionsStore).getHeartbeatCursor(),
		[]
	);

	const { syncNodes } = useDispatch(navStore);

	const syncing = syncStatus === 'syncing';
	const error =
		localError ?? (navError ? navError.detail ?? navError.message : null);

	async function handleSync() {
		setLocalError(null);

		try {
			log.info('sync.start');
			await syncNodes();
			log.info('sync.complete');
		} catch (err) {
			log.error('sync.error', errorData(err));
			setLocalError(
				err instanceof Error ? err.message : __('Sync failed.', 'helm')
			);
		}
	}

	return (
		<AppRoot className="helm-flex helm-flex-col helm-gap-4 helm-p-8">
			<Title label={__('Helm Settings', 'helm')} size="md" />

			{error && (
				<Panel variant="bordered" tone="danger">
					<div className="helm-flex helm-items-center helm-justify-between">
						<span>{error}</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setLocalError(null)}
							aria-label={__('Dismiss error', 'helm')}
						>
							{__('Dismiss', 'helm')}
						</Button>
					</div>
				</Panel>
			)}

			{shipId ? (
				<ShipProvider shipId={shipId}>
					<ShipPanel />
				</ShipProvider>
			) : (
				<NoShip />
			)}

			<Panel variant="bordered" tone="neutral">
				<div className="helm-flex helm-flex-col helm-gap-4">
					<TitleBar title={__('Datacore', 'helm')} tone="neutral">
						<StatusBadge
							tone={syncing ? 'info' : 'success'}
							pulse={syncing}
						>
							{syncing
								? __('Syncing', 'helm')
								: __('Ready', 'helm')}
						</StatusBadge>
					</TitleBar>
					<div className="helm-flex helm-flex-col helm-gap-8">
						<div className="helm-flex helm-gap-8 helm-items-center">
							<Readout
								label={__('Nodes', 'helm')}
								value={syncResult?.nodes ?? '\u2014'}
								tone="neutral"
							/>
							<Readout
								label={__('Stars', 'helm')}
								value={syncResult?.stars ?? '\u2014'}
								tone="neutral"
							/>
							<Readout
								label={__('Waypoints', 'helm')}
								value={syncResult?.waypoints ?? '\u2014'}
								tone="neutral"
							/>
							<Readout
								label={__('Edges', 'helm')}
								value={syncResult?.edges ?? '\u2014'}
								tone="neutral"
							/>
							<Readout
								label={__('Last Synced', 'helm')}
								value={syncResult?.syncedAt ?? '\u2014'}
								tone="neutral"
							/>
						</div>
						<div className="helm-flex helm-gap-8">
							<Button
								variant="primary"
								onClick={handleSync}
								disabled={syncing}
							>
								{__('Sync Datacore', 'helm')}
							</Button>
						</div>
					</div>
				</div>
			</Panel>

			<Panel variant="bordered" tone="neutral">
				<div className="helm-flex helm-flex-col helm-gap-4">
					<TitleBar title={__('Actions', 'helm')} tone="neutral" />
					<div className="helm-flex helm-gap-8">
						<Readout
							label={__('Last Heartbeat', 'helm')}
							value={cursor ?? '\u2014'}
							tone="neutral"
						/>
					</div>
				</div>
			</Panel>
		</AppRoot>
	);
}

const rootElement = document.querySelector('.helm-settings-root');
if (rootElement) {
	createRoot(rootElement).render(
		<ErrorBoundary FallbackComponent={HelmErrorFallback}>
			<Suspense fallback={null}>
				<Settings />
			</Suspense>
		</ErrorBoundary>
	);
}
