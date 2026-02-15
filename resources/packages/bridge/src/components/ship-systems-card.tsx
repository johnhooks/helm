import { useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Panel, MatrixIndicator, Readout, SegmentedControl } from '@helm/ui';
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

const MODE_OPTIONS = [
	{ value: 'efficiency', label: __( 'Efficiency', 'helm' ) },
	{ value: 'normal', label: __( 'Normal', 'helm' ) },
	{ value: 'overdrive', label: __( 'Overdrive', 'helm' ) },
];

/* ----------------------------------------------------------------
 *  SystemCell — MatrixIndicator + Readout pair
 * --------------------------------------------------------------- */

function SystemCell( {
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
} ) {
	return (
		<div className="helm-ship-systems__cell">
			<MatrixIndicator level={ level } rows={ 4 } cols={ 3 } tone={ tone } />
			<Readout label={ label } value={ value } unit={ unit } tone={ tone } size="sm" />
		</div>
	);
}

/* ----------------------------------------------------------------
 *  ShipSystemsCard
 * --------------------------------------------------------------- */

export function ShipSystemsCard() {
	const { shipId, ship } = useShip();
	const { patchShip } = useDispatch( store );
	const [ ErrorModal, openErrorModal ] = useErrorModal();

	const { edits, isSubmitting } = useSelect(
		( select ) => ( {
			edits: select( store ).getEdits(),
			isSubmitting: select( store ).isSubmitting(),
		} ),
		[],
	);

	const powerMode: PowerModeKey =
		( edits?.power_mode as PowerModeKey ) ??
		( ship.power_mode as PowerModeKey ) ??
		'normal';

	const handlePowerModeChange = useCallback(
		( value: string ) => {
			patchShip( shipId, { power_mode: value } ).then( ( error ) => {
				if ( error ) {
					openErrorModal( error );
				}
			} );
		},
		[ shipId, patchShip, openErrorModal ],
	);

	const stats = useSelect(
		( select ) => select( store ).getSystemStats( shipId ),
		[ shipId ],
	);

	const m = POWER_MODES[ powerMode ];

	const recharge = +( ( stats?.engineering.rechargeRate ?? 0 ) * m.regen ).toFixed( 1 );
	const coreLife = stats?.engineering.coreLife ?? 0;
	const output = +( ( stats?.engineering.outputMult ?? 1 ) * m.output ).toFixed( 2 );
	const coreCondition = stats?.engineering.condition ?? 0;

	const driveRange = +( ( stats?.navigation.range ?? 0 ) * m.output ).toFixed( 1 );
	const speed = +( ( stats?.navigation.speed ?? 0 ) * m.output ).toFixed( 1 );
	const draw = stats?.navigation.draw ?? 0;
	const driveCondition = stats?.navigation.condition ?? 0;

	const sensorRange = +( ( stats?.sensors.range ?? 0 ) * m.output ).toFixed( 1 );
	const scanDuration = stats?.sensors.scanDuration ?? 0;
	const discovery = stats?.sensors.discovery ?? 0;
	const sensorCondition = stats?.sensors.condition ?? 0;

	return (
		<div className="helm-ship-systems">
			<div className="helm-ship-systems__label">
				{ __( 'Ship Systems', 'helm' ) }
			</div>
			<Panel variant="default" padding="sm" style={ { border: '1px solid #2a2a2a' } }>
				<div className="helm-ship-systems__body">
					<div className="helm-ship-systems__section-label">
						{ __( 'Engineering', 'helm' ) }
					</div>
					<div className="helm-ship-systems__grid">
						<SystemCell
							label={ __( 'Recharge', 'helm' ) }
							value={ recharge }
							unit="MJ/h"
							level={ coreCondition * m.regen }
							tone="gold"
						/>
						<SystemCell
							label={ __( 'Core Life', 'helm' ) }
							value={ coreLife }
							unit="ly"
							level={ coreCondition }
							tone="accent"
						/>
						<SystemCell
							label={ __( 'Output', 'helm' ) }
							value={ `${ output }×` }
							unit=""
							level={ coreCondition * m.output }
							tone="gold"
						/>
					</div>

					<div className="helm-ship-systems__section-label">
						{ __( 'Navigation', 'helm' ) }
					</div>
					<div className="helm-ship-systems__grid">
						<SystemCell
							label={ __( 'Range', 'helm' ) }
							value={ driveRange }
							unit="ly"
							level={ driveCondition * m.output }
							tone="sky"
						/>
						<SystemCell
							label={ __( 'Speed', 'helm' ) }
							value={ speed }
							unit="ly/d"
							level={ driveCondition * m.output }
							tone="sky"
						/>
						<SystemCell
							label={ __( 'Draw', 'helm' ) }
							value={ draw }
							unit="MJ"
							level={ driveCondition }
							tone="gold"
						/>
					</div>

					<div className="helm-ship-systems__section-label">
						{ __( 'Sensors', 'helm' ) }
					</div>
					<div className="helm-ship-systems__grid">
						<SystemCell
							label={ __( 'Range', 'helm' ) }
							value={ sensorRange }
							unit="ly"
							level={ sensorCondition * m.output }
							tone="lilac"
						/>
						<SystemCell
							label={ __( 'Scan', 'helm' ) }
							value={ `${ scanDuration }×` }
							unit=""
							level={ sensorCondition }
							tone="lilac"
						/>
						<SystemCell
							label={ __( 'Discovery', 'helm' ) }
							value={ Math.round( discovery ) }
							unit="%"
							level={ discovery }
							tone="lilac"
						/>
					</div>

					<div className="helm-ship-systems__section-label">
						{ __( 'Power Mode', 'helm' ) }
					</div>
					<SegmentedControl
						options={ MODE_OPTIONS }
						value={ powerMode }
						onChange={ handlePowerModeChange }
						disabled={ isSubmitting }
						tone="neutral"
						size="sm"
						fullWidth
						aria-label={ __( 'Power mode', 'helm' ) }
					/>
				</div>
			</Panel>
			{ ErrorModal }
		</div>
	);
}
