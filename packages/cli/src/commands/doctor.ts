import fs from 'node:fs/promises';
import path from 'node:path';
import '../polyfill.js';
import { detectFramework } from '@worldready/config';
import { resolveAndLoadConfig, findLocalesDirectory } from './audit.js';

export interface DoctorCommandOptions {
  config?: string;
  cwd?: string;
  stdout?: (msg: string) => void;
}

export interface DoctorResult {
  config: {
    found: boolean;
    path?: string;
    sourceLocale: string;
    targetLocales: string[];
    rulesConfigured: number;
  };
  framework: {
    detected: string;
    detectedLocalesDir?: string;
  };
  localesDir: {
    found: boolean;
    path?: string;
    filesFound: string[];
  };
  translations: {
    sourceLocale: string;
    sourceFound: boolean;
    sourceKeyCount: number;
    targets: Array<{
      locale: string;
      found: boolean;
      keyCount: number;
      missingKeys: string[];
    }>;
  };
  status: 'ok' | 'warning' | 'error';
  summary: {
    passes: number;
    warnings: number;
    errors: number;
  };
}

function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  if (!obj || typeof obj !== 'object') return keys;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...extractKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

export async function doctorCommand(
  options: DoctorCommandOptions = {},
): Promise<DoctorResult> {
  const cwd = options.cwd ?? process.cwd();
  const print = options.stdout ?? console.log;

  let passes = 0;
  let warnings = 0;
  let errors = 0;

  const lines: string[] = [];
  lines.push('WorldReady Project Doctor');
  lines.push('─────────────────────────');

  // 1. Config Check
  const configCandidateNames = [
    'worldready.config.ts',
    'worldready.config.js',
    'worldready.config.json',
    '.worldreadyrc',
    '.worldreadyrc.json',
    '.worldreadyrc.yaml',
  ];

  let configFoundPath: string | undefined = undefined;
  if (options.config) {
    const p = path.resolve(cwd, options.config);
    try {
      await fs.access(p);
      configFoundPath = p;
    } catch {
      // not found
    }
  } else {
    for (const name of configCandidateNames) {
      const p = path.join(cwd, name);
      try {
        await fs.access(p);
        configFoundPath = p;
        break;
      } catch {
        // continue
      }
    }
  }

  const loadedConfig = await resolveAndLoadConfig(cwd, options.config);

  if (configFoundPath) {
    passes++;
    lines.push(`✔ Configuration file: ${path.relative(cwd, configFoundPath).replace(/\\/g, '/')}`);
  } else {
    warnings++;
    lines.push(`⚠ Configuration file: Not found (using defaults)`);
  }

  // 2. Framework Detection
  const frameworkDetection = await detectFramework(cwd);
  passes++;
  lines.push(`✔ Detected i18n framework: ${frameworkDetection.framework}`);

  // 3. Locales Directory Check
  const localesDir = await findLocalesDirectory(cwd, loadedConfig.localesDir);
  let filesFound: string[] = [];

  if (localesDir) {
    try {
      const entries = await fs.readdir(localesDir, { withFileTypes: true });
      filesFound = entries.map((e) => e.name);
      passes++;
      lines.push(`✔ Locales directory: ${path.relative(cwd, localesDir).replace(/\\/g, '/')} (${filesFound.length} entries)`);
    } catch {
      warnings++;
      lines.push(`⚠ Locales directory: ${path.relative(cwd, localesDir).replace(/\\/g, '/')} (unreadable)`);
    }
  } else {
    warnings++;
    lines.push(`⚠ Locales directory: Not found`);
  }

  // 4. Source & Target Locales Verification and Key Counts
  const sourceLocale = loadedConfig.sourceLocale || 'en';
  const targetLocales = loadedConfig.targetLocales || [];

  let translationsMap: Record<string, Record<string, unknown>> = {};
  if (localesDir) {
    try {
      const { parseLocaleFiles } = await import('@worldready/parsers');
      translationsMap = await parseLocaleFiles(localesDir);
    } catch {
      // ignore
    }
  }

  const sourceTranslations = translationsMap[sourceLocale];
  const sourceFound = Boolean(sourceTranslations);
  const sourceKeys = sourceTranslations ? extractKeys(sourceTranslations) : [];

  if (sourceFound) {
    passes++;
    lines.push(`✔ Source locale [${sourceLocale}]: Found with ${sourceKeys.length} translation keys`);
  } else {
    warnings++;
    lines.push(`⚠ Source locale [${sourceLocale}]: Translation data not found`);
  }

  const targetResults: DoctorResult['translations']['targets'] = [];

  for (const target of targetLocales) {
    const targetTranslations = translationsMap[target];
    const targetFound = Boolean(targetTranslations);
    const targetKeys = targetTranslations ? extractKeys(targetTranslations) : [];
    const targetKeySet = new Set(targetKeys);
    const missing = sourceKeys.filter((k) => !targetKeySet.has(k));

    if (targetFound) {
      if (missing.length === 0) {
        passes++;
        lines.push(`✔ Target locale [${target}]: Found with ${targetKeys.length} keys (100% complete)`);
      } else {
        warnings++;
        lines.push(
          `⚠ Target locale [${target}]: Found with ${targetKeys.length} keys (${missing.length} missing from source)`,
        );
      }
    } else {
      errors++;
      lines.push(`✖ Target locale [${target}]: Missing translation file`);
    }

    targetResults.push({
      locale: target,
      found: targetFound,
      keyCount: targetKeys.length,
      missingKeys: missing,
    });
  }

  // Status determination
  const status: 'ok' | 'warning' | 'error' =
    errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok';

  lines.push('─────────────────────────');
  lines.push(
    `Doctor status: ${status.toUpperCase()} (${passes} passed, ${warnings} warnings, ${errors} errors)`,
  );

  print(lines.join('\n'));

  return {
    config: {
      found: Boolean(configFoundPath),
      path: configFoundPath,
      sourceLocale,
      targetLocales,
      rulesConfigured: Object.keys(loadedConfig.rules || {}).length,
    },
    framework: {
      detected: frameworkDetection.framework,
      detectedLocalesDir: frameworkDetection.localesDir,
    },
    localesDir: {
      found: Boolean(localesDir),
      path: localesDir,
      filesFound,
    },
    translations: {
      sourceLocale,
      sourceFound,
      sourceKeyCount: sourceKeys.length,
      targets: targetResults,
    },
    status,
    summary: {
      passes,
      warnings,
      errors,
    },
  };
}
