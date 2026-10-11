import { __, _n, sprintf } from '@wordpress/i18n';
import { useId, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';
import { StarGlyph } from '../glyphs';
import type { SpectralClass, StellarType } from '../glyphs';
import { Tooltip } from '../tooltip';

export type RouteState =
	| 'planned'
	| 'active'
	| 'completed'
	| 'partial'
	| 'failed';

export type RouteNodeState = 'pending' | 'active' | 'complete' | 'failed';

export type RouteNodeKind = 'star' | 'waypoint' | 'unknown';

export interface RouteNode {
	/**
	 * Stable node identifier.
	 */
	id: string | number;
	/**
	 * Display name for hover, focus, and assistive text.
	 */
	label?: string;
	/**
	 * Node visual kind. Star nodes render StarGlyph.
	 */
	kind?: RouteNodeKind;
	/**
	 * Spectral class for star glyph color.
	 */
	spectralClass?: SpectralClass;
	/**
	 * Stellar type for star glyph treatment.
	 */
	stellarType?: StellarType;
	/**
	 * Progress state for this node.
	 */
	state?: RouteNodeState;
	/**
	 * Marks the ship or scan's current node.
	 */
	current?: boolean;
	/**
	 * Marks the final destination node.
	 */
	destination?: boolean;
}

export interface RouteLeg {
	/**
	 * Stable leg identifier. Falls back to array index when omitted.
	 */
	id?: string | number;
	/**
	 * Progress state for the connector between two nodes.
	 */
	state?: RouteNodeState;
	/**
	 * Display label for hover, focus, and assistive text.
	 */
	label?: string;
	/**
	 * Human-readable details for tooltip and assistive text, such as
	 * ["1.4 ly", "4h 32m"]. The component does not infer display copy
	 * from route data such as distanceLy.
	 */
	details?: string[];
	/**
	 * Percent of this leg completed, 0–100. Overrides the state-derived
	 * fill. Active legs without a progress value render an indeterminate
	 * sweep instead of a fixed percentage.
	 */
	progress?: number;
	/**
	 * Distance for this leg in light years. Distance layout uses this value
	 * as a relative weight; callers do not need to normalize distances.
	 */
	distanceLy?: number;
}

export interface RouteProps {
	/**
	 * Ordered route nodes.
	 */
	nodes: RouteNode[];
	/**
	 * Ordered legs between nodes. Leg 0 connects node 0 to node 1.
	 */
	legs?: RouteLeg[];
	/**
	 * Overall route status.
	 */
	state?: RouteState;
	/**
	 * Accessible label for the route.
	 */
	label?: string;
	/**
	 * Optional accessible summary. Generated from nodes and legs when omitted.
	 */
	summary?: string;
	/**
	 * Edge layout mode. Distance routes size each leg from its distanceLy
	 * value while preserving the minimum leg width needed for readability.
	 */
	layout?: 'even' | 'distance';
	/**
	 * Color tone used for active accents.
	 */
	tone?: LcarsTone;
	/**
	 * Size variant.
	 */
	size?: 'sm' | 'md';
	/**
	 * Allows keyboard users to focus nodes and legs for tooltip details.
	 */
	inspectable?: boolean;
	/**
	 * Additional CSS class names.
	 */
	className?: string;
	/**
	 * Inline styles.
	 */
	style?: CSSProperties;
	/**
	 * Test ID for testing.
	 */
	'data-testid'?: string;
}

function routeStateLabel(state: RouteNodeState): string {
	const labels: Record<RouteNodeState, string> = {
		pending: __('pending', 'helm'),
		active: __('active', 'helm'),
		complete: __('complete', 'helm'),
		failed: __('failed', 'helm'),
	};
	return labels[state];
}

export function nodeVisualDetail(node: RouteNode, index: number): string {
	return (
		node.label ??
		sprintf(
			/* translators: %d: Node position in the route. */
			__('Node %d', 'helm'),
			index + 1
		)
	);
}

export function nodeAccessibleDetail(node: RouteNode, index: number): string {
	const name = nodeVisualDetail(node, index);
	const badges = [
		node.current ? __('current', 'helm') : undefined,
		node.destination ? __('destination', 'helm') : undefined,
		node.state ? routeStateLabel(node.state) : undefined,
	].filter(Boolean);

	return badges.length > 0 ? `${name} (${badges.join(', ')})` : name;
}

export function legDetailParts(leg: RouteLeg | undefined): string[] {
	return leg?.details?.filter(Boolean) ?? [];
}

export function legDistance(leg: RouteLeg | undefined): number | undefined {
	return leg?.distanceLy !== undefined &&
		Number.isFinite(leg.distanceLy) &&
		leg.distanceLy >= 0
		? leg.distanceLy
		: undefined;
}

export function routeLegVisualDetail(
	leg: RouteLeg | undefined
): string | undefined {
	const details = [leg?.label, ...legDetailParts(leg)].filter(Boolean);

	return details.length > 0 ? details.join(', ') : undefined;
}

export function legProgress(leg: RouteLeg | undefined): number | undefined {
	return leg?.progress !== undefined && Number.isFinite(leg.progress)
		? Math.min(100, Math.max(0, leg.progress))
		: undefined;
}

export function legAccessibleDetail(
	leg: RouteLeg | undefined,
	from: RouteNode,
	to: RouteNode,
	index: number
): string {
	const label =
		leg?.label ??
		sprintf(
			/* translators: 1: Origin name. 2: Destination name. */
			__('%1$s to %2$s', 'helm'),
			nodeVisualDetail(from, index),
			nodeVisualDetail(to, index + 1)
		);
	const progress = legProgress(leg);
	const details = [
		...legDetailParts(leg),
		leg?.state ? routeStateLabel(leg.state) : undefined,
		progress !== undefined
			? sprintf(
					/* translators: %s: Completion percentage. */
					__('%s%% complete', 'helm'),
					progress
			  )
			: undefined,
	].filter(Boolean);

	return details.length > 0 ? `${label} (${details.join(', ')})` : label;
}

export function routeSummary(nodes: RouteNode[], legs: RouteLeg[]): string {
	const completedLegs = legs.filter((leg) => leg.state === 'complete').length;
	const activeLegIndex = legs.findIndex((leg) => leg.state === 'active');
	const currentNodeIndex = nodes.findIndex((node) => node.current);
	const destination = nodes.find((node) => node.destination);
	const parts = [
		sprintf(
			/* translators: %d: Number of route steps. */
			_n(
				'Route with %d step',
				'Route with %d steps',
				nodes.length,
				'helm'
			),
			nodes.length
		),
	];

	if (legs.length > 0) {
		parts.push(
			sprintf(
				/* translators: 1: Completed leg count. 2: Total leg count. */
				__('%1$d of %2$d legs complete', 'helm'),
				completedLegs,
				legs.length
			)
		);
	}
	if (currentNodeIndex >= 0) {
		parts.push(
			sprintf(
				/* translators: 1: Current step number. 2: Node name. */
				__('current step %1$d, %2$s', 'helm'),
				currentNodeIndex + 1,
				nodeVisualDetail(nodes[currentNodeIndex], currentNodeIndex)
			)
		);
	} else if (activeLegIndex >= 0) {
		parts.push(
			sprintf(
				/* translators: %d: Active leg number. */
				__('leg %d active', 'helm'),
				activeLegIndex + 1
			)
		);
	}
	if (destination) {
		parts.push(
			sprintf(
				/* translators: %s: Destination name. */
				__('destination %s', 'helm'),
				destination.label ?? __('unknown', 'helm')
			)
		);
	}

	return `${parts.join('. ')}.`;
}

export function useDistanceLayout({
	layout,
	legs,
	nodeCount,
}: {
	layout: 'even' | 'distance';
	legs: RouteLeg[];
	nodeCount: number;
}) {
	return useMemo(() => {
		if (layout !== 'distance' || nodeCount < 2) {
			return { enabled: false };
		}

		const routeLegs = legs.slice(0, nodeCount - 1);
		const hasMissingDistance = routeLegs.length !== nodeCount - 1;
		const hasInvalidDistance = routeLegs.some((leg) => {
			const distance = legDistance(leg);
			return distance === undefined || distance <= 0;
		});

		if (hasMissingDistance || hasInvalidDistance) {
			return { enabled: false };
		}

		return { enabled: true };
	}, [layout, legs, nodeCount]);
}

export function NodeMarker({
	node,
	kind,
}: {
	node: RouteNode;
	kind: RouteNodeKind;
}) {
	if (kind !== 'star') {
		return <span className="helm-route__node-marker" aria-hidden="true" />;
	}

	return (
		<span className="helm-route__node-glyph">
			<StarGlyph
				spectralClass={node.spectralClass ?? 'G'}
				stellarType={node.stellarType ?? 'mainSequence'}
				size="sm"
			/>
		</span>
	);
}

export function LegMarker({ progress }: { progress?: number }) {
	return (
		<span className="helm-route__leg-track">
			<span
				className="helm-route__leg-fill"
				style={
					progress !== undefined
						? { width: `${progress}%` }
						: undefined
				}
			/>
		</span>
	);
}

export function Route({
	nodes,
	legs = [],
	state = 'planned',
	label = __('Route', 'helm'),
	summary,
	layout = 'even',
	tone = 'sky',
	size = 'md',
	inspectable = false,
	className = '',
	style,
	'data-testid': testId,
}: RouteProps) {
	const summaryId = useId();
	const distanceLayout = useDistanceLayout({
		layout,
		legs,
		nodeCount: nodes.length,
	});

	if (nodes.length === 0) {
		return null;
	}

	const classNames = [
		'helm-route',
		'helm-route--route',
		`helm-route--${size}`,
		`helm-route--${state}`,
		`helm-route--${layout}`,
		`helm-tone--${tone}`,
		className,
	]
		.filter(Boolean)
		.join(' ');
	const summaryText = summary ?? routeSummary(nodes, legs);

	return (
		<>
			<span id={summaryId} className="helm-sr-only">
				{summaryText}
			</span>
			<ol
				className={classNames}
				style={style}
				aria-label={label}
				aria-describedby={summaryId}
				data-testid={testId}
			>
				{nodes.map((node, index) => {
					const kind = node.kind ?? 'star';
					const nodeDetail = nodeVisualDetail(node, index);
					const nodeText = nodeAccessibleDetail(node, index);
					const nodeState = node.state ?? 'pending';
					const leg = legs[index];
					const nextNode = nodes[index + 1];
					const progress = legProgress(leg);
					const isIndeterminateLeg =
						leg?.state === 'active' && progress === undefined;
					const stepStyle = distanceLayout.enabled
						? ({ flexGrow: legDistance(leg) ?? 0 } as CSSProperties)
						: undefined;
					const nextLegDetail = nextNode
						? routeLegVisualDetail(leg)
						: undefined;
					const nextLegText = nextNode
						? legAccessibleDetail(leg, node, nextNode, index)
						: undefined;

					const nodeProps = {
						className: [
							'helm-route__node',
							`helm-route__node--${kind}`,
							`helm-route__node--${nodeState}`,
							node.current && 'helm-route__node--current',
							node.destination && 'helm-route__node--destination',
						]
							.filter(Boolean)
							.join(' '),
					};
					const legProps = {
						className: [
							'helm-route__leg',
							`helm-route__leg--${leg?.state ?? 'pending'}`,
							isIndeterminateLeg &&
								'helm-route__leg--indeterminate',
						]
							.filter(Boolean)
							.join(' '),
					};

					const nodeContent = (
						<>
							<NodeMarker node={node} kind={kind} />
							{inspectable && (
								<span className="helm-sr-only">{nodeText}</span>
							)}
						</>
					);
					const legContent = (
						<>
							<LegMarker progress={progress} />
							{inspectable && (
								<span className="helm-sr-only">
									{nextLegText}
								</span>
							)}
						</>
					);

					return (
						<li
							className="helm-route__step"
							key={node.id}
							style={nextNode ? stepStyle : undefined}
						>
							<Tooltip text={nodeDetail}>
								<span
									{...nodeProps}
									tabIndex={inspectable ? 0 : undefined}
								>
									{nodeContent}
								</span>
							</Tooltip>

							{nextNode && (
								<Tooltip text={nextLegDetail}>
									<span
										{...legProps}
										tabIndex={inspectable ? 0 : undefined}
									>
										{legContent}
									</span>
								</Tooltip>
							)}
						</li>
					);
				})}
			</ol>
		</>
	);
}
