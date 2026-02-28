import type { SpectralClass } from "@helm/ui";
import { SystemMap } from "@helm/ui";
import type { SystemViewProps } from "../../types";
import "./system-view.css";

const SPECTRAL_CLASSES = new Set< string >( [ "O", "B", "A", "F", "G", "K", "M" ] );

function toSpectralClass( value: string | null ): SpectralClass {
	if ( value && SPECTRAL_CLASSES.has( value ) ) {
		return value as SpectralClass;
	}
	return "G";
}

export function SystemView( {
	system,
	onPlanetSelect,
	className = "",
}: SystemViewProps ) {
	const scannedCount = system.planets.filter( ( p ) => p.scanned ).length;
	const spectral = toSpectralClass( system.spectral_class );

	return (
		<div className={ `helm-system-view ${ className }`.trim() }>
			<div className="helm-system-view__header">
				<span className="helm-system-view__name">
					{ system.star_name }
				</span>
				{ system.spectral_class && (
					<span className="helm-system-view__spectral">
						{ system.spectral_class }
					</span>
				) }
				<span className="helm-system-view__body-count">
					{ scannedCount }/{ system.body_count } scanned
				</span>
			</div>

			<div className="helm-system-view__map">
				<SystemMap
					planets={ system.planets }
					spectralClass={ spectral }
					starName={ system.star_name }
					onPlanetSelect={ onPlanetSelect }
				/>
			</div>
		</div>
	);
}
