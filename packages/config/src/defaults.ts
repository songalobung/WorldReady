import type { WorldReadyConfig } from './types.js';

export const DEFAULT_CONFIG: WorldReadyConfig = {
  sourceLocale: 'en',
  targetLocales: [],
  include: [
    'src/**',
    'app/**',
    'pages/**',
    'components/**',
    'public/locales/**',
  ],
  exclude: [
    'node_modules/**',
    'dist/**',
    '.next/**',
    'build/**',
    'coverage/**',
  ],
  rules: {},
};
