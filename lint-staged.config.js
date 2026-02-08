module.exports = {
	'**/*.{js,jsx,ts,tsx}': (filenames) => {
		const files = filenames.join(' ');
		return [`wp-scripts lint-js ${files}`];
	},
	'**/*.php': (filenames) => {
		const files = filenames.join(' ');
		return [
			`php -d display_errors=1 -l ${files}`,
			`vendor/bin/phpcs --standard=phpcs.xml.dist -n ${files}`,
			`vendor/bin/phpstan analyse --memory-limit=4G --no-progress`,
		];
	},
};
