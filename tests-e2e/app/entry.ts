import { createDatacore } from '@helm/datacore';
import { syncNodes } from '@helm/nav';

// Initialize helm global for E2E tests. In production, window.helm is
// populated by webpack libraries (helm.ui, helm.core) and PHP (helm.settings).
window.helm = {
	datacore: { createDatacore },
	syncNodes,
} as unknown as HelmGlobal;
