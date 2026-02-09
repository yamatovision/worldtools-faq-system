module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // 品質基準: 行長120文字
    'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true }],
    // 品質基準: 関数100行以下
    'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    // 品質基準: ファイル700行以下
    'max-lines': ['warn', { max: 700, skipBlankLines: true, skipComments: true }],
    // 品質基準: 複雑度10以下
    'complexity': ['warn', 10],
    // 未使用変数禁止
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // console.log警告
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // React Refresh
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
