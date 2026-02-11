const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

// Extract the plugin constructor from the default config (avoids bun resolution issues).
const DependencyExtractionWebpackPlugin = defaultConfig.plugins
	.find((p) => p.constructor.name === 'DependencyExtractionWebpackPlugin')
	.constructor;

const packages = path.resolve(__dirname, 'resources/packages');

/**
 * @helm/* externals — each key maps an import request to { global, handle }:
 *   - global: the window property webpack reads from at runtime.
 *   - handle: the WordPress script handle listed in .asset.php dependencies.
 *
 * Split into tiers so each compilation only externalizes packages it doesn't own:
 *   uiExternals        → tier 1 (for core compilation)
 *   coreExternals      → tier 1 + 2 (for datastores and apps)
 *   datastoreExternals → core + cross-datastore deps (ships → products)
 *   helmExternals      → everything above + ships (for app entries)
 */

/**
 * Tier 1: UI library — externalised by core and everything above.
 */
const uiExternals = {
	'@helm/ui': { global: ['helm', 'ui'], handle: 'helm-ui' },
};

/**
 * Tier 2: Core library — externalised by datastores and apps.
 * Includes the UI external plus every sub-package that bundles into helm-core.
 */
const coreExternals = {
	...uiExternals,
	'@helm/core': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/data': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/datacore': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/cache': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/errors': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/logger': { global: ['helm', 'core'], handle: 'helm-core' },
};

/**
 * Externals for datastore entries (products, ships).
 * Includes core externals + cross-datastore deps (ships → products).
 */
const datastoreExternals = {
	...coreExternals,
	'@helm/products': { global: ['helm', 'products'], handle: 'helm-products' },
};

/**
 * Full set of @helm/* externals for app bundles.
 */
const helmExternals = {
	...datastoreExternals,
	'@helm/ships': { global: ['helm', 'ships'], handle: 'helm-ships' },
};

// Plugins without the default DependencyExtractionWebpackPlugin.
const basePlugins = defaultConfig.plugins.filter(
	(plugin) => plugin.constructor.name !== 'DependencyExtractionWebpackPlugin'
);

module.exports = [
	// ── UI library (tier 1) ───────────────────────────────────────────
	// No @helm/* externals — purely presentational.
	{
		...defaultConfig,
		name: 'ui',
		entry: {
			ui: {
				import: path.resolve(packages, 'ui/src/entry.ts'),
				library: { name: ['helm', 'ui'], type: 'window' },
			},
		},
	},

	// ── Core library (tier 2) ─────────────────────────────────────────
	// Externalizes @helm/ui. Contains lib packages (errors, data, cache,
	// logger, datacore) + composed app components.
	{
		...defaultConfig,
		name: 'core',
		entry: {
			core: {
				import: path.resolve(packages, 'core/src/entry.ts'),
				library: { name: ['helm', 'core'], type: 'window' },
			},
		},
		plugins: [
			...basePlugins,
			new DependencyExtractionWebpackPlugin({
				requestToExternal(request) {
					if (uiExternals[request]) {
						return uiExternals[request].global;
					}
				},
				requestToHandle(request) {
					if (uiExternals[request]) {
						return uiExternals[request].handle;
					}
				},
			}),
		],
	},

	// ── Datastore bundles ────────────────────────────────────────────
	// WordPress + @helm/core externals. These entries provide the
	// @helm/products and @helm/ships window globals consumed by apps.
	{
		...defaultConfig,
		name: 'datastores',
		entry: {
			products: {
				import: path.resolve(packages, 'products/src/index.ts'),
				library: { name: ['helm', 'products'], type: 'window' },
			},
			ships: {
				import: path.resolve(packages, 'ships/src/index.ts'),
				library: { name: ['helm', 'ships'], type: 'window' },
			},
		},
		plugins: [
			...basePlugins,
			new DependencyExtractionWebpackPlugin({
				requestToExternal(request) {
					if (datastoreExternals[request]) {
						return datastoreExternals[request].global;
					}
				},
				requestToHandle(request) {
					if (datastoreExternals[request]) {
						return datastoreExternals[request].handle;
					}
				},
			}),
		],
	},

	// ── App bundles ───────────────────────────────────────────────────
	// WordPress externals + @helm/* externals → shared scripts loaded first.
	{
		...defaultConfig,
		name: 'apps',
		entry: {
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
