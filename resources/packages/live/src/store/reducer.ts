import type { Action, State } from './types';

function initialChannels(): State['channels'] {
	const cursors = window.helm?.settings?.liveCursors ?? {};

	return Object.fromEntries(
		Object.entries(cursors).map(([channel, cursor]) => [
			channel,
			{ cursor, error: null },
		])
	);
}

export function initializeDefaultState(): State {
	return {
		channels: initialChannels(),
	};
}

export function reducer(
	state: State = initializeDefaultState(),
	action: Action
): State {
	switch (action.type) {
		case 'SUBSCRIBE_CHANNEL':
			return {
				...state,
				channels: {
					...state.channels,
					[action.channel]: state.channels[action.channel] ?? {
						cursor: action.cursor,
						error: null,
					},
				},
			};

		case 'SET_CHANNEL_CURSOR':
			return {
				...state,
				channels: {
					...state.channels,
					[action.channel]: {
						cursor: action.cursor,
						error: null,
					},
				},
			};

		case 'SET_CHANNEL_ERROR':
			return {
				...state,
				channels: {
					...state.channels,
					[action.channel]: {
						cursor: state.channels[action.channel]?.cursor ?? null,
						error: action.error,
					},
				},
			};

		case 'CLEAR_CHANNEL_ERROR': {
			const current = state.channels[action.channel];
			if (!current) {
				return state;
			}

			return {
				...state,
				channels: {
					...state.channels,
					[action.channel]: { ...current, error: null },
				},
			};
		}

		default:
			return state;
	}
}
