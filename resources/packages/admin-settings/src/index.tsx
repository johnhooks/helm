/**
 * Helm Settings — admin settings entry point.
 *
 * Initializes Datacore (Web Worker + SQLite) and Cache, provides
 * a "Sync Nodes" button for manual cache sync, and displays status.
 */
import { createRoot, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Card, CardBody, CardHeader, Notice, Spinner } from './wp';
import { createDatacore } from '@helm/datacore';
import { createCache, META_NODE_COUNT, META_STAR_COUNT } from '@helm/cache';
import type { Datacore } from '@helm/datacore';
import type { Cache, SyncResult } from '@helm/cache';
import { HelmError } from '@helm/errors';
import { log } from '@helm/logger';

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
		<div>
			<h2>{__('Helm Settings', 'helm')}</h2>

			{error && (
				<Notice
					status="error"
					isDismissible
					onDismiss={() => setError(null)}
				>
					{error}
				</Notice>
			)}

			<Card>
				<CardHeader>
					<h3 style={{ margin: 0 }}>
						{__('Datacore', 'helm')}
					</h3>
				</CardHeader>
				<CardBody>
					{initializing ? (
						<p>
							<Spinner />
							{__('Initializing Datacore…', 'helm')}
						</p>
					) : (
						<>
							<Button
								variant="primary"
								onClick={handleSync}
								isBusy={syncing}
								disabled={syncing}
							>
								{syncing
									? __('Syncing…', 'helm')
									: __('Sync Nodes', 'helm')}
							</Button>

							{result && (
								<div style={{ marginTop: '1em' }}>
									<p>
										{__('Nodes:', 'helm')}{' '}
										<strong>{result.nodes}</strong>
									</p>
									<p>
										{__('Stars:', 'helm')}{' '}
										<strong>{result.stars}</strong>
									</p>
									<p>
										{__('Last synced:', 'helm')}{' '}
										<strong>{result.syncedAt}</strong>
									</p>
								</div>
							)}
						</>
					)}
				</CardBody>
			</Card>
		</div>
	);
}

const rootElement = document.querySelector('.helm-admin-settings-root');
if (rootElement) {
	createRoot(rootElement).render(<Settings />);
}
