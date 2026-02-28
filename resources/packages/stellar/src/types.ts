import type { SystemContents, SystemPlanet } from "@helm/types";

/**
 * Props for the top-level SystemView component.
 */
export interface SystemViewProps {
	/**
	 * System contents data to display
	 */
	system: SystemContents;
	/**
	 * Called when a planet is clicked
	 */
	onPlanetSelect?: ( planet: SystemPlanet ) => void;
	/**
	 * Additional CSS class names
	 */
	className?: string;
}
