/**
 * Helm Settings — admin settings entry point.
 *
 * Initializes Datacore (Web Worker + SQLite) and Cache, provides
 * a "Sync Nodes" button for manual cache sync, displays status,
 * and shows the current ship via the ShipProvider context.
 */
import { createRoot, Suspense, useEffect, useRef, useState } from '@wordpress/element';
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
import { createDatacore } from '@helm/datacore';
import { createCache, META_NODE_COUNT, META_STAR_COUNT } from '@helm/cache';
import type { Datacore } from '@helm/datacore';
import type { Cache, SyncResult } from '@helm/cache';
import { HelmError, HelmErrorFallback } from '@helm/core';
import { log } from '@helm/logger';
import { ShipProvider, useShip } from '@helm/ships';

function errorData(err: unknown): Record<string, unknown> {
	if (HelmError.is(err)) {
		return {
			code: err.message,
			detail: err.detail,
			causes: err.causes.map((c) => ({ code: c.message, detail: c.detail })),
		};
	}
	return { error: err instanceof Error ? err.message : err };
}


function ShipSkeleton() {
	return (
		<Panel variant="bordered" tone="neutral">
			<div className="helm-flex helm-flex-col helm-gap-4">
				<TitleBar title={ __( 'Ship', 'helm' ) } tone="neutral" />
				<div className="helm-flex helm-gap-8">
					<Readout label={ __( 'Hull', 'helm' ) } value="\u2014" tone="neutral" />
					<Readout label={ __( 'Systems', 'helm' ) } value="\u2014" tone="neutral" />
					<Readout label={ __( 'Position', 'helm' ) } value="\u2014" tone="neutral" />
				</div>
			</div>
		</Panel>
	);
}

function ShipStatus() {
	const shipId = window.helm.settings.shipId;

	if ( ! shipId ) {
		return (
			<Panel variant="bordered" tone="neutral">
				<Title label={ __( 'Ship', 'helm' ) } size="sm" />
				<Readout
					label={ __( 'Status', 'helm' ) }
					value={ __( 'No ship assigned', 'helm' ) }
					tone="neutral"
				/>
			</Panel>
		);
	}

	return (
		<ErrorBoundary FallbackComponent={ HelmErrorFallback }>
			<Suspense fallback={ <ShipSkeleton /> }>
				<ShipProvider shipId={ shipId }>
					<ShipPanel />
				</ShipProvider>
			</Suspense>
		</ErrorBoundary>
	);
}

function ShipPanel() {
	const { ship, systems } = useShip();
	const isActive = ship.current_action_id !== null;

	return (
		<Panel variant="bordered" tone="neutral">
			<div className="helm-flex helm-flex-col helm-gap-4">
				<TitleBar title={ __( 'Ship', 'helm' ) } tone="neutral">
					<StatusBadge tone={ isActive ? 'info' : 'success' } pulse={ isActive }>
						{ isActive ? __( 'Active', 'helm' ) : __( 'Idle', 'helm' ) }
					</StatusBadge>
				</TitleBar>
				<div className="helm-flex helm-gap-8">
					<Readout
						label={ __( 'Hull', 'helm' ) }
						value={ ship.hull_integrity }
						unit="%"
						tone="neutral"
					/>
					<Readout
						label={ __( 'Systems', 'helm' ) }
						value={ systems.length }
						tone="neutral"
					/>
					<Readout
						label={ __( 'Position', 'helm' ) }
						value={ ship.node_id ?? '\u2014' }
						tone="neutral"
					/>
				</div>
			</div>
		</Panel>
	);
}

function Settings() {
	const [syncing, setSyncing] = useState(false);
	const [initializing, setInitializing] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<SyncResult | null>(null);

	const datacoreRef = useRef<Datacore | null>(null);
	const cacheRef = useRef<Cache | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			try {
				log.debug('datacore.init', { workerUrl: window.helm.settings.workerUrl });
				const dc = await createDatacore({
					workerUrl: window.helm.settings.workerUrl,
				});
				log.debug('datacore.ready');

				if (cancelled) {
					await dc.close();
					return;
				}

				datacoreRef.current = dc;

				const cache = createCache({ datacore: dc });
				cacheRef.current = cache;

				const lastSynced = await cache.lastSyncedAt();
				const nodeCount = await dc.getMeta(META_NODE_COUNT);
				const starCount = await dc.getMeta(META_STAR_COUNT);
				log.debug('cache.restore', { lastSynced, nodeCount, starCount });
				if (lastSynced) {
					setResult({
						nodes: Number(nodeCount ?? 0),
						stars: Number(starCount ?? 0),
						syncedAt: lastSynced,
					});
				}
			} catch (err) {
				log.error('init.error', errorData(err));
				if (!cancelled) {
					setError(
						err instanceof Error
							? err.message
							: __('Failed to initialize Datacore.', 'helm'),
					);
				}
			} finally {
				if (!cancelled) {
					setInitializing(false);
				}
			}
		}

		init();

		return () => {
			cancelled = true;
			datacoreRef.current?.close();
		};
	}, []);

	async function handleSync() {
		const cache = cacheRef.current;
		if (!cache) {
			return;
		}

		setSyncing(true);
		setError(null);

		try {
			log.info('sync.start');
			const syncResult = await cache.syncNodes();
			log.info('sync.complete', syncResult);
			setResult(syncResult);
		} catch (err) {
			log.error('sync.error', errorData(err));
			setError(
				err instanceof Error
					? err.message
					: __('Sync failed.', 'helm'),
			);
		} finally {
			setSyncing(false);
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
							onClick={() => setError(null)}
							aria-label={__('Dismiss error', 'helm')}
						>
							{__('Dismiss', 'helm')}
						</Button>
					</div>
				</Panel>
			)}

			<ShipStatus />

			<Panel variant="bordered">
				<div className="helm-flex helm-flex-col helm-gap-4 helm-items-start">
					<Title label={__('Datacore', 'helm')} size="sm" />

					<Button
						variant="primary"
						onClick={handleSync}
						disabled={initializing || syncing}
					>
						{__('Sync Nodes', 'helm')}
					</Button>

					<div className="helm-flex helm-gap-8">
						<Readout
							label={__('Nodes', 'helm')}
							value={result?.nodes ?? '\u2014'}
						/>
						<Readout
							label={__('Stars', 'helm')}
							value={result?.stars ?? '\u2014'}
						/>
						<Readout
							label={__('Last Synced', 'helm')}
							value={result?.syncedAt ?? '\u2014'}
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
	createRoot(rootElement).render(<Settings />);
}
