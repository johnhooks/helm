import type { Datacore } from '@helm/datacore';
import type { syncNodes } from '@helm/nav';

/**
 * E2E test augmentation — adds dc and sync function holders
 * to window.helm. Set by the Playwright fixture before each test.
 */
declare global {
	interface HelmGlobal {
		dc: Datacore;
		syncNodes: typeof syncNodes;
	}
}

export {};
