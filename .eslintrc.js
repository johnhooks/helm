module.exports = {
	extends: ['plugin:@wordpress/eslint-plugin/recommended'],
	rules: {
		'jsdoc/check-access': 'off',
		'jsdoc/check-alignment': 'off',
		'jsdoc/check-line-alignment': 'off',
		'jsdoc/check-param-names': 'off',
		'jsdoc/check-property-names': 'off',
		'jsdoc/check-tag-names': 'off',
		'jsdoc/check-types': 'off',
		'jsdoc/check-values': 'off',
		'jsdoc/empty-tags': 'off',
		'jsdoc/implements-on-classes': 'off',
		'jsdoc/no-multi-asterisks': 'off',
		'jsdoc/no-undefined-types': 'off',
		'jsdoc/require-param': 'off',
		'jsdoc/require-param-name': 'off',
		'jsdoc/require-param-type': 'off',
		'jsdoc/require-property': 'off',
		'jsdoc/require-property-description': 'off',
		'jsdoc/require-property-name': 'off',
		'jsdoc/require-property-type': 'off',
		'jsdoc/require-returns-check': 'off',
		'jsdoc/require-returns-description': 'off',
		'jsdoc/require-returns-type': 'off',
		'jsdoc/tag-lines': 'off',
		'jsdoc/valid-types': 'off',
		'jsdoc/multiline-blocks': ['error', { noSingleLineBlocks: true }],
		'jsx-a11y/label-has-associated-control': ['error', {
			assert: 'either',
			depth: 3,
		}],
		'@typescript-eslint/no-unused-vars': ['error', {
			argsIgnorePattern: '^_',
		}],
	},
	overrides: [
		{
			files: ['**/*.test.ts', '**/*.test.tsx'],
			rules: {
				'import/no-extraneous-dependencies': 'off',
			},
		},
		{
			files: ['**/*.stories.tsx'],
			rules: {
				'react-hooks/rules-of-hooks': 'off',
			},
		},
		{
			files: ['resources/packages/astrometric/**/*.tsx'],
			rules: {
				'react/no-unknown-property': 'off',
			},
		},
		{
			files: [
				'resources/packages/datacore/src/worker.ts',
				'resources/packages/datacore/src/test-helpers.ts',
			],
			rules: {
				'no-bitwise': 'off',
			},
		},
	],
};
