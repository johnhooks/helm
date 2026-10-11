import { useState } from 'react';
import type { ReactNode } from 'react';
import {
	Button,
	Countdown,
	Disclosure,
	LogCard,
	Readout,
	StatusBadge,
	RouteItinerary,
} from '@helm/ui';
import type { RouteItineraryNode, LcarsTone } from '@helm/ui';
import './action-card-stories.css';

// Presentation prototypes: timing and discoveries are illustrative fixtures.
const stops = ['Sol', 'Sirius', 'Barnard Waypoint', 'Luyten 726-8', 'Tau Ceti'];
const travelTimes = ['4h 10m', '8h 14m', '6h 20m', '5h 16m'];
const distances = [1.4, 2.8, 2.1, 1.7];
type Outcome = 'fulfilled' | 'partial' | 'failed';

function ScanItinerary({
	outcome,
	starting = false,
}: {
	outcome?: Outcome;
	starting?: boolean;
}) {
	const scanNodes: RouteItineraryNode[] = [
		{
			id: 'sol',
			label: 'Sol',
			state: 'complete',
			outgoingLeg: { state: 'complete' },
		},
		{
			id: 214,
			label: 'Waypoint 214',
			kind: 'waypoint',
			state: 'complete',

			outgoingLeg: { state: 'complete' },
		},
		{
			id: 215,
			label: 'Waypoint 215',
			kind: 'waypoint',
			state: 'complete',

			outgoingLeg: { state: 'complete' },
		},
		{
			id: 'scan-activity',
			label: `Searching beyond ${starting ? 'Sol' : 'Waypoint 215'}`,
			kind: 'search',
			state: 'active',
			current: true,
		},
	];
	if (starting) {
		scanNodes.splice(1, 2);
		const activity = scanNodes[scanNodes.length - 1];
		activity.label = 'Searching beyond Sol';
	}
	if (outcome === 'fulfilled') {
		scanNodes.pop();
		scanNodes.push({
			id: 'tau',
			label: 'Tau Ceti',
			state: 'complete',
		});
	}
	if (outcome === 'partial') {
		scanNodes.pop();
		scanNodes[scanNodes.length - 1].outgoingLeg = undefined;
	}
	if (outcome === 'failed') {
		const activity = scanNodes[scanNodes.length - 1];
		activity.state = 'failed';
		activity.label = 'Scan interrupted';
		activity.current = false;
		activity.description = 'Signal lost beyond Waypoint 215';
		activity.outgoingLeg = undefined;
	}

	return (
		<RouteItinerary
			label="Scan discoveries and current activity"
			nodes={scanNodes}
			tone="lilac"
			activityTone="orange"
			target={
				outcome === 'fulfilled'
					? undefined
					: {
							id: 'tau',
							label: 'Target: Tau Ceti',
							description: 'Path not yet connected',
					  }
			}
		/>
	);
}

function Itinerary({
	active = false,
	long = false,
	outcome,
}: {
	active?: boolean;
	long?: boolean;
	outcome?: Outcome;
}) {
	const names = long
		? [
				'Sol',
				...Array.from(
					{ length: 10 },
					(_, i) => `Survey waypoint ${214 + i}`
				),
				'Tau Ceti',
		  ]
		: stops;
	const itineraryNodes: RouteItineraryNode[] = names.map((name, index) => {
		let description: string | undefined = 'Intermediate stop';
		if (index === 0) {
			description = undefined;
		}
		if (index === names.length - 1) {
			description = undefined;
		}
		let detail = long
			? '2h estimated to next stop'
			: `${travelTimes[index]} · ${distances[index]} ly to next stop`;
		let state: RouteItineraryNode['state'] = 'pending';
		if (active && index === 0) {
			state = 'complete';
			detail = 'Complete';
		}
		if (active && index === 1) {
			state = 'active';
			detail = long
				? 'Traveling · 2h remaining'
				: 'Traveling · 8h 14m remaining';
		}
		if (
			outcome === 'fulfilled' ||
			(outcome === 'partial' && index <= 2) ||
			(outcome === 'failed' && index === 0)
		) {
			state = 'complete';
			detail = 'Traveled';
		}
		if (outcome === 'partial' && index === 2) {
			detail = 'Stopped here · Route interrupted';
		}
		if (outcome === 'failed' && index === 1) {
			state = 'failed';
			detail = 'Jump failed · Insufficient core';
		}

		const waypoint = long
			? index > 0 && index < names.length - 1
			: index === 2;
		let endpoint: RouteItineraryNode['endpoint'];
		if (index === 0) {
			endpoint = 'departure';
		} else if (index === names.length - 1) {
			endpoint = 'destination';
		}
		return {
			id: name,
			label: name,
			description,
			endpoint,
			kind: waypoint ? 'waypoint' : 'star',
			spectralClass: index === 3 && !long ? 'M' : 'G',
			state,
			current: !outcome && active && index === 1,
			outgoingLeg:
				index < names.length - 1
					? {
							state:
								outcome === 'partial' && index === 2
									? 'pending'
									: state,
							description: detail,
					  }
					: undefined,
		};
	});
	return (
		<RouteItinerary
			nodes={itineraryNodes}
			label="Full jump itinerary"
			tone="sky"
			activityTone="gold"
		/>
	);
}

// Keep header geometry and status treatment identical across all examples.
function ActionCard({
	scan = false,
	draft = false,
	outcome,
	action,
	children,
}: {
	scan?: boolean;
	draft?: boolean;
	outcome?: Outcome;
	action?: ReactNode;
	children: ReactNode;
}) {
	const family = scan ? 'lilac' : 'sky';
	const activity = scan ? 'orange' : 'gold';
	let variant: 'default' | 'draft' | 'active' = draft ? 'draft' : 'active';
	let time = draft ? 'PLAN' : 'NOW';
	let statusTone: LcarsTone = draft ? family : activity;
	let statusText = draft ? 'DRAFT' : 'ACTIVE';
	if (outcome) {
		variant = 'default';
		time = '10:42';
		statusText =
			outcome === 'fulfilled' ? 'COMPLETE' : outcome.toUpperCase();
	}
	if (outcome === 'fulfilled') {
		statusTone = 'success';
	}
	if (outcome === 'partial') {
		statusTone = 'warning';
	}
	if (outcome === 'failed') {
		statusTone = 'danger';
	}
	return (
		<LogCard
			time={time}
			title={scan ? 'Scan → Tau Ceti' : 'Jump → Tau Ceti'}
			tone={family}
			variant={variant}
			action={action}
			status={
				<StatusBadge size="sm" tone={statusTone}>
					{statusText}
				</StatusBadge>
			}
		>
			{children}
		</LogCard>
	);
}

function DraftControls({
	onConfirm,
	onCancel,
}: {
	onConfirm?: () => void;
	onCancel?: () => void;
}) {
	return (
		<div className="ship-action-story__draft-actions">
			<Button size="sm" variant="tertiary" onClick={onCancel}>
				Cancel
			</Button>
			<Button size="sm" onClick={onConfirm}>
				Confirm
			</Button>
		</div>
	);
}

// Stable instrument slots across the action lifecycle. Values are story fixtures.
function ActionReadouts({
	scan = false,
	draft = false,
	starting = false,
	long = false,
	outcome,
}: {
	scan?: boolean;
	draft?: boolean;
	starting?: boolean;
	long?: boolean;
	outcome?: Outcome;
}) {
	const tone = scan ? 'lilac' : 'sky';
	const jumpResults = {
		fulfilled: { distance: 8, time: '24h', core: 12 },
		partial: { distance: 4.2, time: '12h', core: 6 },
		failed: { distance: 1.4, time: '4h', core: 2 },
	};
	const result = outcome ? jumpResults[outcome] : undefined;
	// Scan distance is the target distance; its intermediate path is unknown.
	const distance = scan ? 8 : result?.distance ?? (long ? 11 : 8);
	let time = result?.time ?? (long ? '22h' : '24h');
	let timeLabel = outcome ? 'Time' : 'Est. time';
	let finalLabel = outcome ? 'Core' : 'Est. core';
	let finalValue: string | number = result?.core ?? (long ? 24 : 12);
	if (scan) {
		time = starting ? '0m' : '3h';
		timeLabel = 'Elapsed';
		finalLabel = 'Waypoints';
		finalValue = starting ? 0 : 2;
		if (!draft && !outcome) {
			time = starting ? '1' : '169';
			timeLabel = 'Cycle';
			finalLabel = 'Chance';
			finalValue = starting ? '0.1%' : '24.0%';
		}
		if (draft) {
			time = '—';
			timeLabel = 'Time';
			finalValue = '—';
		}
		if (outcome) {
			time = '4h';
			timeLabel = 'Time';
		}
	}
	return (
		<div className="ship-action-story__metrics">
			<Readout
				label="Distance"
				value={distance}
				unit="ly"
				size="sm"
				tone={tone}
			/>
			<Readout label={timeLabel} value={time} size="sm" tone={tone} />
			<Readout
				label={finalLabel}
				value={finalValue}
				unit={scan ? undefined : '%'}
				size="sm"
				tone={scan ? 'lilac' : 'gold'}
			/>
		</div>
	);
}

export function JumpCard({
	draft = false,
	long = false,
	onConfirm,
	onCancel,
}: {
	draft?: boolean;
	long?: boolean;
	onConfirm?: () => void;
	onCancel?: () => void;
}) {
	return (
		<ActionCard
			draft={draft}
			action={
				draft ? (
					<DraftControls onConfirm={onConfirm} onCancel={onCancel} />
				) : undefined
			}
		>
			<div className="ship-action-story__stack">
				<ActionReadouts draft={draft} long={long} />
				<p className="ship-action-story__caption">
					{draft
						? 'Full planned itinerary'
						: `Current leg · 2 of ${long ? 11 : 4}`}
				</p>
				<Itinerary active={!draft} long={long} />
			</div>
		</ActionCard>
	);
}

export function ScanCard({
	draft = false,
	starting = false,
	onConfirm,
	onCancel,
}: {
	draft?: boolean;
	starting?: boolean;
	onConfirm?: () => void;
	onCancel?: () => void;
}) {
	return (
		<ActionCard
			scan
			draft={draft}
			action={
				draft ? (
					<DraftControls onConfirm={onConfirm} onCancel={onCancel} />
				) : undefined
			}
		>
			<div className="ship-action-story__stack">
				<ActionReadouts scan draft={draft} starting={starting} />
				{draft ? (
					<>
						<p className="ship-action-story__muted">
							The path and intermediate stops will be discovered
							during the scan.
						</p>
						<p className="ship-action-story__muted">
							First update expected in 5m.
						</p>
						<p className="ship-action-story__muted">
							Total scan duration is unknown.
						</p>
					</>
				) : (
					<>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<Countdown
								label="Next update"
								remaining="05:00"
								tone="lilac"
								size="sm"
								active
							/>
							<Button size="sm" variant="tertiary">
								Cancel
							</Button>
						</div>
						<ScanItinerary starting={starting} />
					</>
				)}
			</div>
		</ActionCard>
	);
}

function DraftScenario({
	scan = false,
	long = false,
}: {
	scan?: boolean;
	long?: boolean;
}) {
	const [stage, setStage] = useState<'draft' | 'active' | 'canceled'>(
		'draft'
	);
	const controls = {
		draft: stage === 'draft',
		onConfirm: () => setStage('active'),
		onCancel: () => setStage('canceled'),
	};
	let card = <JumpCard long={long} {...controls} />;
	if (scan) {
		card = <ScanCard starting {...controls} />;
	}
	return (
		<div className="ship-action-story__stack">
			{stage === 'canceled' ? <p role="status">Draft canceled.</p> : card}
			{stage !== 'draft' && (
				<Button
					size="sm"
					variant="tertiary"
					onClick={() => setStage('draft')}
				>
					Reset preview
				</Button>
			)}
		</div>
	);
}

export function JumpLifecycle({ long = false }: { long?: boolean }) {
	return <DraftScenario long={long} />;
}
export function ScanLifecycle() {
	return <DraftScenario scan />;
}

export function OutcomeCard({
	scan = false,
	outcome,
}: {
	scan?: boolean;
	outcome: Outcome;
}) {
	const summaries = scan
		? {
				fulfilled: 'Tau Ceti connected · 2 waypoints discovered',
				partial: 'Stopped at Waypoint 215 · Target not connected',
				failed: 'Signal lost beyond Waypoint 215 · 2 discoveries retained',
		  }
		: {
				fulfilled: 'Arrived at Tau Ceti · 4 hops complete',
				partial: 'Stopped at Barnard Waypoint · 2 of 4 hops complete',
				failed: 'Jump failed at Sirius · 1 of 4 hops complete',
		  };
	return (
		<ActionCard scan={scan} outcome={outcome}>
			<div className="ship-action-story__stack">
				<ActionReadouts scan={scan} outcome={outcome} />
				<p className="ship-action-story__headline">
					{summaries[outcome]}
				</p>
				{outcome === 'failed' && (
					<p className="ship-action-story__muted">
						{scan
							? 'The scan could not continue after losing the signal.'
							: 'Insufficient core to reach Barnard Waypoint.'}
					</p>
				)}
				{outcome === 'partial' && (
					<p className="ship-action-story__muted">
						{scan
							? 'Scan ended before a connection to the target was found.'
							: 'Travel interrupted before reaching the destination.'}
					</p>
				)}
				<Disclosure label={scan ? 'Discoveries' : 'Itinerary'}>
					{scan ? (
						<ScanItinerary outcome={outcome} />
					) : (
						<Itinerary outcome={outcome} />
					)}
				</Disclosure>
			</div>
		</ActionCard>
	);
}
