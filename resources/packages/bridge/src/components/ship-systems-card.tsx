import { calculateSystemReadouts } from '@helm/formulas';
import type { ShipState, SystemStats } from '@helm/types';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	Panel,
	MatrixIndicator,
	Readout,
	SegmentedControl,
	Disclosure,
	ProgressBar,
} from '@helm/ui';
import type { LcarsTone } from '@helm/ui';
import { useErrorModal } from '@helm/shell';
import { store, useShip } from '@helm/ships';
import './ship-systems-card.css';

/* ----------------------------------------------------------------
 *  Power mode multipliers (mirrors PowerMode.php)
 * --------------------------------------------------------------- */

const POWER_MODES = {
	efficiency: { output: 0.7, regen: 0.5, decay: 0.0 },
	normal: { output: 1.0, regen: 1.0, decay: 1.0 },
	overdrive: { output: 1.3, regen: 1.3, decay: 2.5 },
} as const;

type PowerModeKey = keyof typeof POWER_MODES;

function normalizePowerMode(value: unknown): PowerModeKey {
	return typeof value === 'string' && value in POWER_MODES
		? (value as PowerModeKey)
		: 'normal';
}

const MODE_OPTIONS = [
	{ value: 'efficiency', label: __('Efficiency', 'helm') },
	{ value: 'normal', label: __('Normal', 'helm') },
	{ value: 'overdrive', label: __('Overdrive', 'helm') },
];

/* ----------------------------------------------------------------
 *  SystemCell — MatrixIndicator + Readout pair
 * --------------------------------------------------------------- */

function SystemCell({
	label,
	value,
	unit,
	level,
	tone = 'gold',
}: {
	label: string;
	value: number | string;
	unit: string;
	level: number;
	tone?: LcarsTone;
}) {
	return (
		<div className="helm-ship-systems__cell">
			<MatrixIndicator level={level} rows={4} cols={3} tone={tone} />
			<Readout
				label={label}
				value={value}
				unit={unit}
				tone={tone}
				size="sm"
			/>
		</div>
	);
}

/* ----------------------------------------------------------------
 *  ShipSystemsCard
 * --------------------------------------------------------------- */

export function ShipSystemsCard() {
	const { shipId, ship } = useShip();
	const { patchShip } = useDispatch(store);
	const [ErrorModal, openErrorModal] = useErrorModal();

	const { edits, isSubmitting } = useSelect(
		(select) => ({
			edits: select(store).getEdits(),
			isSubmitting: select(store).isSubmitting(),
		}),
		[]
	);

	const powerMode = normalizePowerMode(edits?.power_mode ?? ship.power_mode);

	const handlePowerModeChange = useCallback(
		(value: string) => {
			patchShip(shipId, { power_mode: value }).then((error) => {
				if (error) {
					openErrorModal(error);
				}
			});
		},
		[shipId, patchShip, openErrorModal]
	);

	const stats = useSelect(
		(select) => select(store).getSystemStats(shipId),
		[shipId]
	);

	return (
		<>
			<ShipSystemsPanel
				ship={ship}
				stats={stats}
				powerMode={powerMode}
				isSubmitting={isSubmitting}
				onPowerModeChange={handlePowerModeChange}
			/>
			{ErrorModal}
		</>
	);
}

export function ShipSystemsPanel({
	ship,
	stats,
	powerMode,
	isSubmitting = false,
	onPowerModeChange,
}: {
	ship: Pick<ShipState, 'power_full_at' | 'power_max' | 'power_mode'>;
	stats: SystemStats;
	powerMode: PowerModeKey;
	isSubmitting?: boolean;
	onPowerModeChange: (value: string) => void;
}) {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);

	const m = POWER_MODES[powerMode];

	const recharge = (stats?.engineering.rechargeRate ?? 0) * m.regen;
	const storedRecharge =
		(stats?.engineering.rechargeRate ?? 0) *
		POWER_MODES[normalizePowerMode(ship.power_mode)].regen;
	const secondsToFull = ship.power_full_at
		? Math.max(0, (Date.parse(ship.power_full_at) - now) / 1000)
		: 0;
	const power = Math.max(
		0,
		Math.min(
			ship.power_max,
			ship.power_max - (secondsToFull / 3600) * storedRecharge
		)
	);
	const powerLevel = ship.power_max > 0 ? (power / ship.power_max) * 100 : 0;
	const powerTone = powerLevel < 20 ? 'danger' : 'gold';
	const coreLife = stats?.engineering.coreLife ?? 0;
	const effective = calculateSystemReadouts(stats, powerMode);
	const output = +effective.output.toFixed(2);
	const coreCondition = stats?.engineering.condition ?? 0;

	const driveRange = +effective.driveRange.toFixed(1);
	const speed = +effective.speed.toFixed(1);
	const draw = stats?.navigation.draw ?? 0;
	const driveCondition = stats?.navigation.condition ?? 0;

	const sensorRange = +effective.sensorRange.toFixed(1);
	const scanDuration = stats?.sensors.scanDuration ?? 0;
	const discovery = stats?.sensors.discovery ?? 0;
	const sensorCondition = stats?.sensors.condition ?? 0;

	return (
		<div className="helm-ship-systems">
			<div className="helm-ship-systems__label">
				{__('Ship Systems', 'helm')}
			</div>
			<Panel
				variant="default"
				padding="sm"
				style={{ border: '1px solid #2a2a2a' }}
			>
				<div className="helm-ship-systems__body">
					<Readout
						label={__('PWR', 'helm')}
						value={power.toFixed(1)}
						max={ship.power_max}
						unit="MJ"
						tone={powerTone}
						size="sm"
					/>
					<ProgressBar
						value={powerLevel}
						label={__('Available power', 'helm')}
						tone={powerTone}
						size="sm"
					/>
					<Disclosure label={__('Engineering', 'helm')} defaultOpen>
						<div className="helm-ship-systems__grid">
							<SystemCell
								label={__('Recharge', 'helm')}
								value={+recharge.toFixed(1)}
								unit="MJ/HR"
								level={coreCondition * m.regen}
								tone="gold"
							/>
							<SystemCell
								label={__('Core Life', 'helm')}
								value={coreLife}
								unit="ly"
								level={coreCondition}
								tone="accent"
							/>
							<SystemCell
								label={__('Output', 'helm')}
								value={`${output}×`}
								unit=""
								level={coreCondition * m.output}
								tone="gold"
							/>
						</div>
					</Disclosure>
					<Disclosure label={__('Navigation', 'helm')}>
						<div className="helm-ship-systems__grid">
							<SystemCell
								label={__('Range', 'helm')}
								value={driveRange}
								unit="ly"
								level={driveCondition * m.output}
								tone="sky"
							/>
							<SystemCell
								label={__('Speed', 'helm')}
								value={speed}
								unit="ly/d"
								level={driveCondition * m.output}
								tone="sky"
							/>
							<SystemCell
								label={__('Drive draw', 'helm')}
								value={`${draw}×`}
								unit=""
								level={driveCondition}
								tone="gold"
							/>
						</div>
					</Disclosure>
					<Disclosure label={__('Sensors', 'helm')}>
						<div className="helm-ship-systems__grid">
							<SystemCell
								label={__('Range', 'helm')}
								value={sensorRange}
								unit="ly"
								level={sensorCondition * m.output}
								tone="lilac"
							/>
							<SystemCell
								label={__('Survey', 'helm')}
								value={`${scanDuration}×`}
								unit=""
								level={sensorCondition}
								tone="lilac"
							/>
							<SystemCell
								label={__('Accuracy', 'helm')}
								value={Math.round(discovery)}
								unit="%"
								level={discovery}
								tone="lilac"
							/>
						</div>
					</Disclosure>
					<Disclosure label={__('Power Mode', 'helm')}>
						<SegmentedControl
							options={MODE_OPTIONS}
							value={powerMode}
							onChange={onPowerModeChange}
							disabled={isSubmitting}
							tone="neutral"
							size="sm"
							fullWidth
							aria-label={__('Power mode', 'helm')}
						/>
					</Disclosure>
				</div>
			</Panel>
		</div>
	);
}
