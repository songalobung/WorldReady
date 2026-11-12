import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from './defaults.js';
import { detectFramework } from './detector.js';
import type { WorldReadyConfig } from './types.js';

export async function initConfig(cwd?: string): Promise<string> {
  const root = cwd ?? process.cwd();

  const detection = await detectFramework(root);

  const config: WorldReadyConfig = {
    ...DEFAULT_CONFIG,
    ...(detection.localesDir ? { localesDir: detection.localesDir } : {}),
  };

  const filePath = join(root, 'worldready.config.json');

  const output = {
    $schema: 'https://worldready.dev/schema.json',
    sourceLocale: config.sourceLocale,
    targetLocales: config.targetLocales,
    include: config.include,
    exclude: config.exclude,
    ...(detection.localesDir ? { localesDir: detection.localesDir } : {}),
    rules: config.rules,
    _detectedFramework: detection.framework,
  };

  await writeFile(filePath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  return filePath;
}
