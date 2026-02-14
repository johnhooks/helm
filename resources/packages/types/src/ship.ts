export interface ShipState {
	id: number;
	node_id: number;
	power_full_at: string | null;
	shields_full_at: string | null;
	hull_integrity: number;
	power_mode: string;
	cargo: Record< string, number >;
	current_action_id: number | null;
}
