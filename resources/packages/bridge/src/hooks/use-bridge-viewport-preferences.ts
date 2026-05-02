import { useCallback, useState } from '@wordpress/element';

const VIEWPORT_PREFERENCES_KEY = 'helm.bridge.viewport';

export interface BridgeViewportPreferences {
	starSize: string;
	jumpRangeOnly: boolean;
	showRoutes: boolean;
	showLabels: boolean;
}

export interface BridgeViewportPreferencesState {
	preferences: BridgeViewportPreferences;
	setStarSize: (size: string) => void;
	setJumpRangeOnly: (enabled: boolean) => void;
	setShowRoutes: (enabled: boolean) => void;
	setShowLabels: (enabled: boolean) => void;
}

export const BRIDGE_VIEWPORT_DEFAULTS: BridgeViewportPreferences = {
	starSize: 'md',
	jumpRangeOnly: false,
	showRoutes: false,
	showLabels: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readViewportPreferences(): BridgeViewportPreferences {
	if (typeof window === 'undefined') {
		return BRIDGE_VIEWPORT_DEFAULTS;
	}

	try {
		const raw = window.localStorage.getItem(VIEWPORT_PREFERENCES_KEY);
		if (!raw) {
			return BRIDGE_VIEWPORT_DEFAULTS;
		}

		const stored = JSON.parse(raw) as unknown;
		if (!isRecord(stored)) {
			return BRIDGE_VIEWPORT_DEFAULTS;
		}

		return {
			...BRIDGE_VIEWPORT_DEFAULTS,
			...stored,
		};
	} catch {
		return BRIDGE_VIEWPORT_DEFAULTS;
	}
}

function writeViewportPreferences(prefs: BridgeViewportPreferences): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(
			VIEWPORT_PREFERENCES_KEY,
			JSON.stringify(prefs)
		);
	} catch {
		// Storage may be unavailable; controls still work for the current render.
	}
}

export function useBridgeViewportPreferences(): BridgeViewportPreferencesState {
	const [preferences, setPreferences] = useState(readViewportPreferences);

	const updatePreferences = useCallback(
		(patch: Partial<BridgeViewportPreferences>) => {
			setPreferences((current) => {
				const next = {
					...current,
					...patch,
				};
				writeViewportPreferences(next);
				return next;
			});
		},
		[]
	);

	const setStarSize = useCallback(
		(size: string) => {
			updatePreferences({ starSize: size });
		},
		[updatePreferences]
	);

	const setJumpRangeOnly = useCallback(
		(enabled: boolean) => {
			updatePreferences({ jumpRangeOnly: enabled });
		},
		[updatePreferences]
	);

	const setShowRoutes = useCallback(
		(enabled: boolean) => {
			updatePreferences({ showRoutes: enabled });
		},
		[updatePreferences]
	);

	const setShowLabels = useCallback(
		(enabled: boolean) => {
			updatePreferences({ showLabels: enabled });
		},
		[updatePreferences]
	);

	return {
		preferences,
		setStarSize,
		setJumpRangeOnly,
		setShowRoutes,
		setShowLabels,
	};
}
