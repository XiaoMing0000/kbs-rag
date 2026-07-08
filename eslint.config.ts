import tseslint from 'typescript-eslint';

export default [
	{ files: ['./src/**/*.{js,mjs,cjs,ts}'], ignores: ['dist', 'node_modules'] },
	...tseslint.configs.recommended,
	{
		'rules': {
			'@typescript-eslint/no-explicit-any': ['off'], // 关闭类型为 any 报错
			'@typescript-eslint/no-unused-expressions': ['off'], // 关闭类型为 any 报错
			'@typescript-eslint/no-unused-vars': [
				'warn', // 将变量未引用设置未 warn
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},
];
