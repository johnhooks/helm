const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
	...defaultConfig,
	entry: {
		bridge: path.resolve(__dirname, 'resources/packages/bridge/src/index.tsx'),
		'admin-settings': path.resolve(__dirname, 'resources/packages/admin-settings/src/index.tsx'),
		'datacore-worker': path.resolve(__dirname, 'resources/packages/datacore/src/worker.ts'),
	},
};
