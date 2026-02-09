import type { Datacore } from '@helm/datacore';
import type { Cache } from '@helm/cache';

/**
 * E2E test augmentation — adds dc and cache instance holders
 * to window.helm. Set by the Playwright fixture before each test.
 */
declare global {
	interface HelmGlobal {
		dc: Datacore;
		cache: Cache;
	}
}

export {};
