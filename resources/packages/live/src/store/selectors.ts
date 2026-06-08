import type { BroadcastHeartbeatRequest } from '../types';
import type { LiveChannelError, State } from './types';

export function getSubscribedChannels(state: State): string[] {
	return Object.keys(state.channels);
}

export function getChannelCursor(state: State, channel: string): number | null {
	return state.channels[channel]?.cursor ?? null;
}

export function getChannelError(
	state: State,
	channel: string
): LiveChannelError | null {
	return state.channels[channel]?.error ?? null;
}

export function getHeartbeatRequest(
	state: State
): BroadcastHeartbeatRequest | null {
	const channels = Object.fromEntries(
		Object.entries(state.channels).map(([channel, channelState]) => [
			channel,
			channelState.cursor,
		])
	);

	return Object.keys(channels).length > 0 ? { channels } : null;
}
