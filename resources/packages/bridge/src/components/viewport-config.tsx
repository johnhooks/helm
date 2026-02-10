import { __ } from '@wordpress/i18n';
import { Icon, cog } from '@wordpress/icons';
import { Dropdown, Panel, SegmentedControl, Toggle } from '@helm/ui';

export interface ViewportConfigProps {
	starSize: string;
	onStarSizeChange: ( size: string ) => void;
	jumpRangeOnly: boolean;
	onJumpRangeOnlyChange: ( enabled: boolean ) => void;
	showLabels: boolean;
	onShowLabelsChange: ( enabled: boolean ) => void;
}

const STAR_SIZE_OPTIONS = [
	{ value: 'sm', label: __( 'S', 'helm' ) },
	{ value: 'md', label: __( 'M', 'helm' ) },
	{ value: 'lg', label: __( 'L', 'helm' ) },
];

export function ViewportConfig( {
	starSize,
	onStarSizeChange,
	jumpRangeOnly,
	onJumpRangeOnlyChange,
	showLabels,
	onShowLabelsChange,
}: ViewportConfigProps ) {
	return (
		<div className="helm-bridge__config">
			<Dropdown
				label={ __( 'Viewport settings', 'helm' ) }
				placement="bottom-end"
				renderTrigger={ ( props ) => (
					<button
						{ ...props }
						type="button"
						className="helm-bridge__config-trigger"
						aria-label={ __( 'Viewport settings', 'helm' ) }
					>
						<Icon icon={ cog } size={ 20 } />
					</button>
				) }
			>
				<Panel tone="neutral" padding="sm">
					<div
						className="helm-bridge__config-field"
						style={ { minWidth: 200 } }
					>
						<span className="helm-bridge__config-label">
							{ __( 'Star size', 'helm' ) }
						</span>
						<SegmentedControl
							options={ STAR_SIZE_OPTIONS }
							value={ starSize }
							onChange={ onStarSizeChange }
							size="sm"
						/>
					</div>
					<div className="helm-bridge__config-field">
						<Toggle
							label={ __( 'Jump range', 'helm' ) }
							checked={ jumpRangeOnly }
							onChange={ onJumpRangeOnlyChange }
							size="sm"
						/>
					</div>
					<div className="helm-bridge__config-field">
						<Toggle
							label={ __( 'Labels', 'helm' ) }
							checked={ showLabels }
							onChange={ onShowLabelsChange }
							disabled={ ! jumpRangeOnly }
							size="sm"
						/>
					</div>
				</Panel>
			</Dropdown>
		</div>
	);
}
