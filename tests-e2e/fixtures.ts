import { test as base } from '@playwright/test';

const OPFS_DIR = 'helm-datacore';

/**
 * Custom test fixture that provides a fresh Datacore + Cache on every test.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *
 * Each test gets a page with `window.helm.dc` and `window.helm.cache` ready.
 * OPFS is wiped before each test, and the instance is closed after.
 */
export const test = base.extend({
	page: async ({ page }, use) => {
		// Navigate kills previous workers, releasing OPFS locks.
		await page.goto('/');

		// Wipe OPFS for a clean DB.
		await page.evaluate(async (dir: string) => {
			const root = await navigator.storage.getDirectory();
			try {
				await root.removeEntry(dir, { recursive: true });
			} catch {
				// Doesn't exist yet — fine.
			}
		}, OPFS_DIR);

		// Boot Datacore and Cache.
		await page.evaluate(async () => {
			window.helm.dc = await window.helm.core.createDatacore();
			window.helm.cache = window.helm.core.createCache({ datacore: window.helm.dc });
		});

		await use(page); // eslint-disable-line react-hooks/rules-of-hooks

		// Close the instance after the test.
		await page.evaluate(async () => {
			if (window.helm.dc) {
				await window.helm.dc.close();
			}
		});
	},
});

export { expect } from '@playwright/test';
