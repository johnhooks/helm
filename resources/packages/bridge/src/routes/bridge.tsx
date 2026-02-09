/**
 * Bridge — astrometric viewport showing the real star map.
 *
 * Initializes Datacore + Cache, auto-syncs if needed, then maps
 * StarMapEntry[] from the datacore into StarSystem[] for the
 * Three.js StarField renderer.
 */
import { lazy, Suspense, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { createDatacore } from '@helm/datacore';
import { createCache } from '@helm/cache';
import { HelmError } from '@helm/errors';
import { log } from '@helm/logger';
import { Panel, Title, Readout } from '@helm/ui';
import type { Datacore, StarMapEntry } from '@helm/datacore';
import type { StarSystem, SpectralClass } from '@helm/astrometric';

const StarField = lazy(() =>
	import('@helm/astrometric').then((m) => ({ default: m.StarField }))
);
import './bridge.css';

const SPECTRAL_CLASSES = new Set(['O', 'B', 'A', 'F', 'G', 'K', 'M']);

function toStarSystem(entry: StarMapEntry): StarSystem {
	return {
		id: String(entry.id),
		name: entry.title,
		position: { x: entry.x, y: entry.y, z: entry.z },
		spectralClass: SPECTRAL_CLASSES.has(entry.spectral_class ?? '')
			? (entry.spectral_class as SpectralClass)
			: undefined,
		radius: entry.radius ?? undefined,
		data: {
			catalogId: entry.catalog_id,
			mass: entry.mass,
			nodeType: entry.node_type,
		},
	};
}

function errorMessage(err: unknown): string {
	if (HelmError.is(err)) {
		return err.detail ?? err.message;
	}
	return err instanceof Error ? err.message : __('Unknown error.', 'helm');
}

export function BridgePage() {
	const [systems, setSystems] = useState<StarSystem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const datacoreRef = useRef<Datacore | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			try {
				log.debug('bridge.datacore.init');
				const dc = await createDatacore({
					workerUrl: window.helm.settings.workerUrl,
				});

				if (cancelled) {
					await dc.close();
					return;
				}

				datacoreRef.current = dc;
				log.debug('bridge.datacore.ready');

				const cache = createCache({ datacore: dc });
				const synced = await cache.isSynced();

				if (!synced) {
					log.info('bridge.sync.start');
					const result = await cache.syncNodes();
					log.info('bridge.sync.complete', result);
				}

				const starMap = await dc.getStarMap();
				log.info('bridge.starmap.loaded', { count: starMap.length });

				if (!cancelled) {
					setSystems(starMap.map(toStarSystem));
				}
			} catch (err) {
				log.error('bridge.error', err);
				if (!cancelled) {
					setError(errorMessage(err));
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		init();

		return () => {
			cancelled = true;
			datacoreRef.current?.close();
		};
	}, []);

	if (error) {
		return (
			<div className="helm-bridge__message helm-bridge__message--error">
				<p>{__('Failed to load star map.', 'helm')}</p>
				<p>{error}</p>
			</div>
		);
	}

	if (loading) {
		return null;
	}

	return (
		<div className="helm-bridge">
			<Panel variant="inset" padding="none" className="helm-bridge__viewport">
				<Suspense fallback={null}>
					<StarField systems={systems} style={{ width: '100%', height: '100%' }} />
				</Suspense>
			</Panel>
			<Panel tone="blue" className="helm-bridge__nav">
				<Title label={__('Navigation', 'helm')} />
				<Readout label={__('System', 'helm')} value="Sol" />
			</Panel>
		</div>
	);
}
