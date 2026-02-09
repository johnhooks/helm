import { createDatacore } from '@helm/datacore';
import { createCache } from '@helm/cache';

// Initialize helm global for E2E tests. In production, window.helm is
// populated by webpack libraries (helm.ui, helm.core) and PHP (helm.settings).
window.helm = {
	core: { createDatacore, createCache },
} as unknown as HelmGlobal;
