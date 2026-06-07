import type { ShipAction } from '@helm/actions';
import type { ShipState } from '@helm/types';

export type BroadcastEventType = 'ship.action.updated' | 'ship.state.updated';

interface BroadcastEventBase<T extends BroadcastEventType, TPayload> {
	id: number;
	channel: string;
	type: T;
	payload: TPayload;
	resource_type?: string | null;
	resource_id?: number | null;
	created_at?: string;
}

export type ShipActionUpdatedEvent = BroadcastEventBase<
	'ship.action.updated',
	{ action: ShipAction }
>;

export type ShipStateUpdatedEvent = BroadcastEventBase<
	'ship.state.updated',
	{ ship_state: ShipState }
>;

export type BroadcastEvent = ShipActionUpdatedEvent | ShipStateUpdatedEvent;

export interface BroadcastHeartbeatRequest {
	channels: string[];
	cursor: number;
}

export interface BroadcastHeartbeatResponse {
	events?: BroadcastEvent[];
	cursor?: number;
	server_time?: string;
}
