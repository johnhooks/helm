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

export type BroadcastChannelCursors = Record<string, number | null>;

export interface BroadcastHeartbeatRequest {
	channels: BroadcastChannelCursors;
}

export interface WpRestErrorResponse {
	code: string;
	message: string;
	data?: { status?: number; [key: string]: unknown };
	additional_errors?: Array<{
		code: string;
		message: string;
		data?: { status?: number; [key: string]: unknown };
	}>;
}

export interface BroadcastChannelResponse {
	events?: BroadcastEvent[];
	cursor?: number;
	error?: WpRestErrorResponse;
}

export interface BroadcastHeartbeatResponse {
	channels?: Record<string, BroadcastChannelResponse>;
	error?: WpRestErrorResponse;
}
