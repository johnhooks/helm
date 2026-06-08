import type {
	BroadcastHeartbeatRequest,
	BroadcastHeartbeatResponse,
	WpRestErrorResponse,
} from '../types';

export type LiveChannelError = WpRestErrorResponse;

export interface LiveChannelState {
	cursor: number | null;
	error: LiveChannelError | null;
}

export interface State {
	channels: Record<string, LiveChannelState>;
}

export type Action =
	| { type: 'SUBSCRIBE_CHANNEL'; channel: string; cursor: number | null }
	| { type: 'SET_CHANNEL_CURSOR'; channel: string; cursor: number }
	| { type: 'SET_CHANNEL_ERROR'; channel: string; error: LiveChannelError }
	| { type: 'CLEAR_CHANNEL_ERROR'; channel: string };

export type { BroadcastHeartbeatRequest, BroadcastHeartbeatResponse };
