import { __ } from '@wordpress/i18n';
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { Tooltip } from '../tooltip';
import {
	LegMarker,
	NodeMarker,
	legAccessibleDetail,
	legDistance,
	legProgress,
	nodeAccessibleDetail,
	nodeVisualDetail,
	routeLegVisualDetail,
	routeSummary,
	useDistanceLayout,
} from '../route/route';
import type { RouteLeg, RouteNode, RouteProps } from '../route';

export interface RouteStepIndicatorProps extends RouteProps {
	/**
	 * Called when a node is selected. When omitted, nodes are inspectable only.
	 */
	onNodeSelect?: (node: RouteNode, index: number) => void;
	/**
	 * Called when a leg is selected. When omitted, legs are inspectable only.
	 */
	onLegSelect?: (leg: RouteLeg | undefined, index: number) => void;
}

export function RouteStepIndicator({
	nodes,
	legs = [],
	state = 'planned',
	label = __('Route steps', 'helm'),
	summary,
	layout = 'even',
	tone = 'sky',
	size = 'md',
	inspectable = true,
	onNodeSelect,
	onLegSelect,
	className = '',
	style,
	'data-testid': testId,
}: RouteStepIndicatorProps) {
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
		'helm-route--step-indicator',
		`helm-route--${size}`,
		`helm-route--${state}`,
		`helm-route--${layout}`,
		`helm-tone--${tone}`,
		className,
	]
		.filter(Boolean)
		.join(' ');
	const summaryText = summary ?? routeSummary(nodes, legs);
	const hasCurrentNode = nodes.some((node) => node.current);

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
					const isNodeInteractive = onNodeSelect !== undefined;
					const isLegInteractive = onLegSelect !== undefined;
					const isActiveLeg = leg?.state === 'active';
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
							isNodeInteractive &&
								'helm-route__node--interactive',
						]
							.filter(Boolean)
							.join(' '),
						'aria-current': node.current
							? ('step' as const)
							: undefined,
					};
					const legProps = {
						className: [
							'helm-route__leg',
							`helm-route__leg--${leg?.state ?? 'pending'}`,
							isIndeterminateLeg &&
								'helm-route__leg--indeterminate',
							isLegInteractive && 'helm-route__leg--interactive',
						]
							.filter(Boolean)
							.join(' '),
						'aria-current':
							!hasCurrentNode && isActiveLeg
								? ('step' as const)
								: undefined,
					};

					const nodeContent = (
						<>
							<NodeMarker node={node} kind={kind} />
							<span className="helm-sr-only">{nodeText}</span>
						</>
					);
					const legContent = (
						<>
							<LegMarker progress={progress} />
							<span className="helm-sr-only">{nextLegText}</span>
						</>
					);

					return (
						<li
							className="helm-route__step"
							key={node.id}
							style={nextNode ? stepStyle : undefined}
						>
							<Tooltip text={nodeDetail}>
								{isNodeInteractive ? (
									<button
										type="button"
										{...nodeProps}
										onClick={() =>
											onNodeSelect(node, index)
										}
									>
										{nodeContent}
									</button>
								) : (
									<span
										{...nodeProps}
										tabIndex={inspectable ? 0 : undefined}
									>
										{nodeContent}
									</span>
								)}
							</Tooltip>

							{nextNode && (
								<Tooltip text={nextLegDetail}>
									{isLegInteractive ? (
										<button
											type="button"
											{...legProps}
											onClick={() =>
												onLegSelect(leg, index)
											}
										>
											{legContent}
										</button>
									) : (
										<span
											{...legProps}
											tabIndex={
												inspectable ? 0 : undefined
											}
										>
											{legContent}
										</span>
									)}
								</Tooltip>
							)}
						</li>
					);
				})}
			</ol>
		</>
	);
}
