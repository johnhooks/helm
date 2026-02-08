import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests-e2e',
    outputDir: './artifacts/test-results',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: './artifacts/playwright-report' }]],
    use: {
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'bunx vite --config tests-e2e/datacore/vite.config.ts',
        port: 5188,
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        {
            name: 'datacore',
            testMatch: 'datacore.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:5188',
            },
        },
    ],
});
