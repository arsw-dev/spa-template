import antfuConfig from '@antfu/eslint-config';

export default antfuConfig({
  type: 'app',
  typescript: true,
  react: true,
  formatters: true,
  unicorn: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
  ignores: [
    '**/dist/**',
    '**/public/**',
    'template/README.md', // template-only: the formatter reads __PLACEHOLDERS__ as bold
  ],
}, {
  rules: {
    'ts/consistent-type-definitions': ['error', 'type'],
    'no-console': ['warn'],
    'antfu/no-top-level-await': ['off'],
    'antfu/top-level-function': ['off'],
    'node/prefer-global/process': ['off'],
    'unicorn/filename-case': ['error', { case: 'kebabCase', ignore: ['README.md'] }],
  },
}, {
  // Command-line scripts report progress on stdout, and their tests use node:test (setup removes scripts/ anyway)
  files: ['scripts/**/*'],
  rules: {
    'no-console': ['off'],
    'node/no-process-env': ['off'],
    'test/no-import-node-test': ['off'],
  },
});
