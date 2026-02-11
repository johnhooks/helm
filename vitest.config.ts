import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'happy-dom',
        environmentMatchGlobs: [
            ['resources/packages/datacore/**', 'node'],
            ['resources/packages/cache/**', 'node'],
            ['resources/packages/errors/**', 'node'],
            ['resources/packages/ships/**', 'node'],
            ['resources/packages/products/**', 'node'],
        ],
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
            '@helm/astrometric': path.resolve(__dirname, 'resources/packages/astrometric/src'),
            '@helm/cache': path.resolve(__dirname, 'resources/packages/cache/src'),
            '@helm/datacore': path.resolve(__dirname, 'resources/packages/datacore/src'),
            '@helm/errors': path.resolve(__dirname, 'resources/packages/errors/src'),
            '@helm/types': path.resolve(__dirname, 'resources/packages/types/src'),
            '@helm/ui': path.resolve(__dirname, 'resources/packages/ui/src'),
            '@helm/ships': path.resolve(__dirname, 'resources/packages/ships/src'),
            '@helm/products': path.resolve(__dirname, 'resources/packages/products/src'),
            '@helm/admin-settings': path.resolve(__dirname, 'resources/packages/admin-settings/src'),
            '@helm/router': path.resolve(__dirname, 'resources/packages/router/src'),
        },
    },
});
