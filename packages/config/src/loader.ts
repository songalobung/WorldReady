import { cosmiconfig } from 'cosmiconfig';
import { DEFAULT_CONFIG } from './defaults.js';
import type { WorldReadyConfig } from './types.js';

const MODULE_NAME = 'worldready';

export async function loadConfig(cwd?: string): Promise<WorldReadyConfig> {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      'worldready.config.ts',
      'worldready.config.js',
      'worldready.config.json',
      '.worldreadyrc',
      '.worldreadyrc.json',
      '.worldreadyrc.yaml',
      'package.json',
    ],
  });

  const result = await explorer.search(cwd);

  if (!result || result.isEmpty) {
    return { ...DEFAULT_CONFIG };
  }

  const userConfig = result.config as Partial<WorldReadyConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    include: userConfig.include ?? DEFAULT_CONFIG.include,
    exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...userConfig.rules,
    },
  };
}
