/**
 * Bridge — astrometric viewport showing the real star map.
 *
 * Star data comes from the nav store, which handles datacore init,
 * sync, and queries behind its resolver. The bridge suspends until
 * the star map is ready, then renders.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from '@wordpress/element';
import { useSuspenseSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as navStore } from '@helm/nav';
import { log } from '@helm/logger';
import { Panel, Title, Readout } from '@helm/ui';
import { useShip } from '@helm/ships';
import { ViewportConfig } from '../components/viewport-config';

const StarField = lazy(() =>
	import('@helm/astrometric').then((m) => ({ default: m.StarField }))
);
import './bridge.css';

const STAR_SIZE_MULTIPLIER: Record<string, number> = {
	sm: 0.5,
	md: 1,
	lg: 1.5,
};

export function BridgePage() {
	const { ship } = useShip();
	const currentNodeId = ship.node_id;
	const jumpRange = 7;

	const allStars = useSuspenseSelect(
		(select) => select(navStore).getStarNodes(),
		[],
	);

	const [stars, setStars] = useState(allStars);
	const [starSize, setStarSize] = useState('md');
	const [jumpRangeOnly, setJumpRangeOnly] = useState(false);
	const [showLabels, setShowLabels] = useState(false);

	// Keep local filtered state in sync with store data.
	useEffect(() => {
		if (!jumpRangeOnly) {
			setStars(allStars);
		}
	}, [allStars, jumpRangeOnly]);

	// Turn off labels when jump range filter is disabled.
	useEffect(() => {
		if (!jumpRangeOnly) {
			setShowLabels(false);
		}
	}, [jumpRangeOnly]);

	// Filter stars to jump range client-side — all stars are already in memory.
	useEffect(() => {
		if (allStars.length === 0) {
			return;
		}

		if (!jumpRangeOnly) {
			setStars(allStars);
			return;
		}

		const origin = allStars.find((s) => s.node_id === currentNodeId);
		if (!origin) {
			setStars(allStars);
			return;
		}

		const maxDistSq = jumpRange * jumpRange;
		const filtered = allStars.filter((s) => {
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
	}, [jumpRangeOnly, currentNodeId, jumpRange, allStars]);

	const currentStar = useMemo(
		() => allStars.find((s) => s.node_id === currentNodeId) ?? null,
		[allStars, currentNodeId],
	);
	const sizeMultiplier = STAR_SIZE_MULTIPLIER[starSize] ?? 1;
	const viewportStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

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
