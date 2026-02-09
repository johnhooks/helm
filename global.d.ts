import type { Datacore } from '@helm/datacore';
import type { createDatacore } from '@helm/datacore';
import type { Cache, createCache } from '@helm/cache';

interface Settings {
	workerUrl: string;
	debug: boolean;
}

interface HelmGlobal {
	createDatacore: typeof createDatacore;
	createCache: typeof createCache;
	dc: Datacore;
	cache: Cache;
	settings: Settings;
}

declare global {
	interface Window {
		helm: HelmGlobal;
	}
}
