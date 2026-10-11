import { __, sprintf } from '@wordpress/i18n';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, arrowRight, mapMarker } from '@wordpress/icons';
import type { LcarsTone } from '../../tones';
import { StarGlyph } from '../glyphs';
import type { RouteNode, RouteNodeKind, RouteNodeState } from '../route';
import './route-itinerary.css';

export interface RouteItineraryLeg {
	/**
	 * Explicit connector state, independent of the node's state.
	 */
	state: RouteNodeState;
	/**
	 * Caller-formatted timing, distance, or outcome. No calculations here.
	 */
	description?: ReactNode;
}

export interface RouteItineraryNode
	extends Omit<RouteNode, 'label' | 'kind' | 'state' | 'destination'> {
	label: string;
	kind?: RouteNodeKind | 'search';
	state: RouteNodeState;
	description?: ReactNode;
	/**
	 * Compact marker for the first or last stop of a known route.
	 */
	endpoint?: 'departure' | 'destination';
	/**
	 * Omit to draw no connector. Allowed on the last node for an open search.
	 */
	outgoingLeg?: RouteItineraryLeg;
}

export type RouteItineraryTarget = Omit<
	RouteItineraryNode,
	'current' | 'state' | 'outgoingLeg' | 'endpoint'
>;

export interface RouteItineraryProps {
	nodes: RouteItineraryNode[];
	/**
	 * Separate from the known path; never counted as a step or connected.
	 */
	target?: RouteItineraryTarget;
	label: string;
	/**
	 * Accessible caller-provided route summary, if needed.
	 */
	summary?: string;
	tone?: LcarsTone;
	/**
	 * Explicit paired palette tone; defaults to the base tone.
	 */
	activityTone?: LcarsTone;
	/**
	 * Disable connector motion without changing active state styling.
	 */
	animate?: boolean;
	className?: string;
	style?: CSSProperties;
	'data-testid'?: string;
}

const stateLabels: Record<RouteNodeState, string> = {
	pending: __('Upcoming', 'helm'),
	active: __('Active', 'helm'),
	complete: __('Complete', 'helm'),
	failed: __('Failed', 'helm'),
};

function Marker({ node }: { node: RouteItineraryTarget }) {
	if (node.kind === 'waypoint') {
		return <span className="helm-route-itinerary__waypoint" />;
	}
	if (node.kind === 'search' || node.kind === 'unknown') {
		return <span className="helm-route-itinerary__search" />;
	}
	return (
		<StarGlyph
			spectralClass={node.spectralClass}
			stellarType={node.stellarType}
			size="sm"
		/>
	);
}

/**
 * Presentational vertical route. Callers own action interpretation, current
 * position, timing, outcomes, expansion, and which nodes/legs exist.
 */
export function RouteItinerary({
	nodes,
	target,
	label,
	summary,
	tone = 'neutral',
	activityTone = tone,
	animate = true,
	className = '',
	style,
	'data-testid': testId,
}: RouteItineraryProps) {
	if (nodes.length === 0 && !target) {
		return null;
	}
	return (
		<div
			className={`helm-route-itinerary helm-tone--${tone} ${className}`}
			style={style}
			data-testid={testId}
		>
			{summary && (
				<p className="helm-route-itinerary__summary">{summary}</p>
			)}
			{nodes.length > 0 && (
				<ol className="helm-route-itinerary__steps" aria-label={label}>
					{nodes.map((node, index) => (
						<li
							key={`${index}:${node.id}`}
							className="helm-route-itinerary__step"
							data-state={node.state}
							aria-current={node.current ? 'step' : undefined}
						>
							<span
								className={`helm-route-itinerary__marker${
									node.state === 'active'
										? ` helm-tone--${activityTone}`
										: ''
								}`}
								aria-hidden="true"
							>
								<Marker node={node} />
							</span>
							<div className="helm-route-itinerary__content">
								<strong
									className={
										node.state === 'active'
											? `helm-tone--${activityTone}`
											: undefined
									}
								>
									<span className="helm-route-itinerary__label">
										{node.label}
									</span>
									{node.endpoint && (
										<span
											className="helm-route-itinerary__endpoint helm-ml-1"
											role="img"
											aria-label={
												node.endpoint === 'departure'
													? __('Departure', 'helm')
													: __('Destination', 'helm')
											}
										>
											<Icon
												icon={
													node.endpoint ===
													'departure'
														? arrowRight
														: mapMarker
												}
												size={16}
											/>
										</span>
									)}
								</strong>
								<span className="helm-sr-only">
									{stateLabels[node.state]}
								</span>
								{node.outgoingLeg && (
									<span className="helm-sr-only">
										{sprintf(
											/* translators: %s: Leg state. */
											__('Outgoing leg: %s', 'helm'),
											stateLabels[node.outgoingLeg.state]
										)}
									</span>
								)}
								{node.description && (
									<div className="helm-route-itinerary__description">
										{node.description}
									</div>
								)}
								{node.outgoingLeg?.description && (
									<div
										className={`helm-route-itinerary__leg-description${
											node.outgoingLeg.state === 'active'
												? ` helm-tone--${activityTone}`
												: ''
										}`}
										data-state={node.outgoingLeg.state}
									>
										{node.outgoingLeg.description}
									</div>
								)}
							</div>
							{node.outgoingLeg && (
								<span
									aria-hidden="true"
									className={`helm-route-itinerary__leg${
										node.outgoingLeg.state === 'active'
											? ` helm-tone--${activityTone}`
											: ''
									}`}
									data-state={node.outgoingLeg.state}
									data-animate={animate}
								/>
							)}
						</li>
					))}
				</ol>
			)}
			{target && (
				<div className="helm-route-itinerary__target">
					<span
						className="helm-route-itinerary__marker"
						aria-hidden="true"
					>
						<Marker node={target} />
					</span>
					<div className="helm-route-itinerary__content">
						<strong>{target.label}</strong>
						{target.description && (
							<div className="helm-route-itinerary__description">
								{target.description}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
