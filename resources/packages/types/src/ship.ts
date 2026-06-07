export interface ShipState {
	id: number;
	node_id: number;
	power_full_at: string | null;
	power_max?: number;
	shields_full_at: string | null;
	shields_max?: number;
	hull_integrity: number;
	hull_max?: number;
	power_mode: string;
	cargo: Record<string, number>;
	current_action_id: number | null;
}

export interface OperationalShipState {
	ship_post_id: number;
	power_mode: string;
	power_full_at: string | null;
	power_max: number;
	shields_full_at: string | null;
	shields_max: number;
	hull_integrity: number;
	hull_max: number;
	node_id: number | null;
	current_action_id: number | null;
	created_at: string;
	updated_at: string;
}
