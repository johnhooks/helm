export interface SystemPlanet {
	id: string;
	orbit_index: number;
	orbit_au: number;
	scanned: boolean;
	// Revealed after scan.
	// Planet types map to PlanetType in @helm/ui (e.g. "terrestrial", "gasGiant").
	// The special value "companion" denotes a substellar companion (brown dwarf).
	type?: string;
	name?: string;
	ringed?: boolean;
	mass_earth?: number;
	radius_earth?: number;
	orbital_period_days?: number;
	equilibrium_temp_k?: number;
}

export interface SystemContents {
	node_id: number;
	star_name: string;
	spectral_class: string | null;
	body_count: number;
	planets: SystemPlanet[];
}
