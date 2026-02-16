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
 *   uiExternals        → tier 1 (for core)
 *   coreExternals      → tier 1 + 2 (for datastores)
 *   datastoreExternals → core + cross-datastore deps (for shell and apps)
 *   shellExternals     → datastores + shell (for apps)
 *   helmExternals      → everything (for app entries)
 */

/**
 * Tier 1: UI library — purely presentational.
 */
const uiExternals = {
	'@helm/ui': { global: ['helm', 'ui'], handle: 'helm-ui' },
};

/**
 * Tier 2: Core library — errors, data, logger bundled into one script.
 */
const coreExternals = {
	...uiExternals,
	'@helm/core': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/data': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/errors': { global: ['helm', 'core'], handle: 'helm-core' },
	'@helm/logger': { global: ['helm', 'core'], handle: 'helm-core' },
};

/**
 * Tier 3: Datastores — each gets its own window global.
 * Cross-datastore deps (ships → products) are externalized here.
 */
const datastoreExternals = {
	...coreExternals,
	'@helm/datacore': { global: ['helm', 'datacore'], handle: 'helm-datacore' },
	'@helm/products': { global: ['helm', 'products'], handle: 'helm-products' },
	'@helm/nav': { global: ['helm', 'nav'], handle: 'helm-nav' },
	'@helm/actions': { global: ['helm', 'actions'], handle: 'helm-actions' },
	'@helm/ships': { global: ['helm', 'ships'], handle: 'helm-ships' },
};

/**
 * Tier 4: Shell — composition layer wiring UI + core + datastores.
 */
const shellExternals = {
	...datastoreExternals,
	'@helm/shell': { global: ['helm', 'shell'], handle: 'helm-shell' },
};

/**
 * Full set of @helm/* externals for app bundles.
 */
const helmExternals = {
	...shellExternals,
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
	// Externalizes @helm/ui. Bundles lib packages (errors, data, logger).
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

	// ── Datastore bundles (tier 3) ──────────────────────────────────
	// Each gets its own window global. Externalize core + cross-datastore deps.
	{
		...defaultConfig,
		name: 'datastores',
		entry: {
			datacore: {
				import: path.resolve(packages, 'datacore/src/index.ts'),
				library: { name: ['helm', 'datacore'], type: 'window' },
			},
			nav: {
				import: path.resolve(packages, 'nav/src/index.ts'),
				library: { name: ['helm', 'nav'], type: 'window' },
			},
			products: {
				import: path.resolve(packages, 'products/src/index.ts'),
				library: { name: ['helm', 'products'], type: 'window' },
			},
			ships: {
				import: path.resolve(packages, 'ships/src/index.ts'),
				library: { name: ['helm', 'ships'], type: 'window' },
			},
			actions: {
				import: path.resolve(packages, 'actions/src/index.ts'),
				library: { name: ['helm', 'actions'], type: 'window' },
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

	// ── Shell (tier 4) ──────────────────────────────────────────────
	// Composition layer — wires UI + core + datastores for app entries.
	{
		...defaultConfig,
		name: 'shell',
		entry: {
			shell: {
				import: path.resolve(packages, 'shell/src/index.ts'),
				library: { name: ['helm', 'shell'], type: 'window' },
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
