import type { Datacore } from '@helm/datacore';
import type { createDatacore } from '@helm/datacore';
import type { Cache, createCache } from '@helm/cache';

interface HelmGlobal {
	createDatacore: typeof createDatacore;
	createCache: typeof createCache;
	dc: Datacore;
	cache: Cache;
}

declare global {
	interface Window {
		helm: HelmGlobal;
	}
}
