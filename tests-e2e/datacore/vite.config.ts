import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	root: __dirname,
	resolve: {
		alias: {
			'@helm/datacore': path.resolve(__dirname, '../../resources/packages/datacore/src'),
			'@helm/types': path.resolve(__dirname, '../../resources/packages/types/src'),
		},
	},
	optimizeDeps: {
		exclude: ['wa-sqlite'],
	},
	server: { port: 5188, strictPort: true },
});
