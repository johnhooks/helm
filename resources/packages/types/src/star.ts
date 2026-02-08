export interface Star {
	id: number;
	title: string;
	node_id: number;
	catalog_id: string;
	spectral_class: string | null;
	post_type: string;
	x: number;
	y: number;
	z: number;
	mass: number | null;
	radius: number | null;
	is_primary: boolean;
}
