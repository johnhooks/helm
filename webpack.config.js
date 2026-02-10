const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

// Extract the plugin constructor from the default config (avoids bun resolution issues).
const DependencyExtractionWebpackPlugin = defaultConfig.plugins
	.find((p) => p.constructor.name === 'DependencyExtractionWebpackPlugin')
	.constructor;

const packages = path.resolve(__dirname, 'resources/packages');

/**
 * @helm/* packages externalized as shared WordPress scripts.
 *
 * Each key maps an import request to a { global, handle } pair:
 *   - global: the window property webpack reads from at runtime.
 *   - handle: the WordPress script handle listed in .asset.php dependencies.
 */
const helmExternals = {
	'@helm/ui': { global: ['helm', 'ui'], handle: 'helm-ui' },
	'@helm/core': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/datacore': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/cache': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/errors': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/logger': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/ships': { global: ['helm', 'ships'], handle: 'helm-ships' },
};

// Plugins without the default DependencyExtractionWebpackPlugin.
const basePlugins = defaultConfig.plugins.filter(
	(plugin) => plugin.constructor.name !== 'DependencyExtractionWebpackPlugin'
);

module.exports = [
	// ── Shared libraries ──────────────────────────────────────────────
	// Only WordPress externals (React, @wordpress/*). No @helm/* externals
	// since these entries ARE the providers.
	{
		...defaultConfig,
		name: 'shared',
		entry: {
			ui: {
				import: path.resolve(packages, 'ui/src/entry.ts'),
				library: { name: ['helm', 'ui'], type: 'window' },
			},
			core: {
				import: path.resolve(packages, 'core/src/entry.ts'),
				library: { name: ['helm', 'core'], type: 'window' },
			},
		},
	},

	// ── App bundles ───────────────────────────────────────────────────
	// WordPress externals + @helm/* externals → shared scripts loaded first.
	{
		...defaultConfig,
		name: 'apps',
		entry: {
			ships: {
				import: path.resolve(packages, 'ships/src/index.ts'),
				library: { name: ['helm', 'ships'], type: 'window' },
			},
			bridge: path.resolve(packages, 'bridge/src/index.tsx'),
			'admin-settings': path.resolve(packages, 'admin-settings/src/index.tsx'),
			'datacore-worker': path.resolve(packages, 'datacore/src/worker.ts'),
		},
		plugins: [
			...basePlugins,
			new DependencyExtractionWebpackPlugin({
				requestToExternal(request) {
					if (helmExternals[request]) {
						return helmExternals[request].global;
					}
				},
				requestToHandle(request) {
					if (helmExternals[request]) {
						return helmExternals[request].handle;
					}
				},
			}),
		],
	},
];
