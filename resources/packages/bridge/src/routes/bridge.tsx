/**
 * Bridge — astrometric viewport showing the real star map.
 *
 * Initializes Datacore + Cache, auto-syncs if needed, then passes
 * StarNode[] from the datacore directly to the Three.js StarField renderer.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { createDatacore } from '@helm/datacore';
import { createCache } from '@helm/cache';
import { HelmError } from '@helm/errors';
import { log } from '@helm/logger';
import { Panel, Title, Readout } from '@helm/ui';
import { useShip } from '@helm/ships';
import type { Datacore } from '@helm/datacore';
import type { StarNode } from '@helm/types';
import { ViewportConfig } from '../components/viewport-config';

const StarField = lazy(() =>
	import('@helm/astrometric').then((m) => ({ default: m.StarField }))
);
import './bridge.css';

function errorMessage(err: unknown): string {
	if (HelmError.is(err)) {
		return err.detail ?? err.message;
	}
	return err instanceof Error ? err.message : __('Unknown error.', 'helm');
}

const STAR_SIZE_MULTIPLIER: Record<string, number> = {
	sm: 0.5,
	md: 1,
	lg: 1.5,
};

export function BridgePage() {
	const { ship } = useShip();
	const currentNodeId = ship.node_id;
	const jumpRange = 7;
	const [stars, setStars] = useState<StarNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const datacoreRef = useRef<Datacore | null>(null);
	const allStarsRef = useRef<StarNode[]>([]);

	const [starSize, setStarSize] = useState('md');
	const [jumpRangeOnly, setJumpRangeOnly] = useState(false);
	const [showLabels, setShowLabels] = useState(false);

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
					allStarsRef.current = starMap;
					setStars(starMap);
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

	// Turn off labels when jump range filter is disabled.
	useEffect(() => {
		if (!jumpRangeOnly) {
			setShowLabels(false);
		}
	}, [jumpRangeOnly]);

	// Filter stars to jump range client-side — all stars are already in memory.
	useEffect(() => {
		const all = allStarsRef.current;
		if (all.length === 0) {
			return;
		}

		if (!jumpRangeOnly) {
			setStars(all);
			return;
		}

		const origin = all.find((s) => s.node_id === currentNodeId);
		if (!origin) {
			setStars(all);
			return;
		}

		const maxDistSq = jumpRange * jumpRange;
		const filtered = all.filter((s) => {
			if (s.node_id === currentNodeId) {
				return true;
			}
			const dx = s.x - origin.x;
			const dy = s.y - origin.y;
			const dz = s.z - origin.z;
			return dx * dx + dy * dy + dz * dz <= maxDistSq;
		});

		log.info('bridge.jumprange.filtered', { count: filtered.length });
		setStars(filtered);
	}, [jumpRangeOnly, currentNodeId, jumpRange]);

	const currentStar = useMemo(
		() => allStarsRef.current.find((s) => s.node_id === currentNodeId) ?? null,
		[stars, currentNodeId],
	);
	const sizeMultiplier = STAR_SIZE_MULTIPLIER[starSize] ?? 1;
	const viewportStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

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
				<ViewportConfig
					starSize={starSize}
					onStarSizeChange={setStarSize}
					jumpRangeOnly={jumpRangeOnly}
					onJumpRangeOnlyChange={setJumpRangeOnly}
					showLabels={showLabels}
					onShowLabelsChange={setShowLabels}
				/>
				<Suspense fallback={null}>
					<StarField
						stars={stars}
						currentNodeId={currentNodeId}
						starScale={sizeMultiplier}
						showLabels={showLabels}
						style={viewportStyle}
					/>
				</Suspense>
			</Panel>
			<Panel tone="blue" className="helm-bridge__nav">
				<Title label={__('Navigation', 'helm')} />
				<Readout label={__('System', 'helm')} value={currentStar?.title ?? '\u2014'} />
			</Panel>
		</div>
	);
}
