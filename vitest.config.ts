import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['resources/packages/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['resources/packages/**/src/**/*.{ts,tsx}'],
            exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/index.ts'],
        },
    },
    resolve: {
        alias: {
            '@helm/lcars': path.resolve(__dirname, 'resources/packages/lcars/src'),
            '@helm/bridge': path.resolve(__dirname, 'resources/packages/bridge/src'),
        },
    },
});
