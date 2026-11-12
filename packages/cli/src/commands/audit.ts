import fs from 'node:fs/promises';
import path from 'node:path';
import '../polyfill.js';
import { AuditEngine, filterNewFindings, loadBaseline, saveBaseline } from '@worldready/core';
import type { AuditResult, LocaleData, ParsedFile, WorldReadyConfig } from '@worldready/core';
import { DEFAULT_CONFIG, detectFramework, loadConfig } from '@worldready/config';
import { allReporters, getReporter } from '@worldready/reporters';

export interface AuditCommandOptions {
  config?: string;
  locales?: string;
  format?: 'console' | 'json' | 'markdown' | 'sarif' | string;
  output?: string;
  baseline?: string;
  saveBaseline?: string;
  cwd?: string;
  stdout?: (msg: string) => void;
}

const COMMON_LOCALE_DIRS = [
  'public/locales',
  'src/locales',
  'locales',
  'messages',
  'lang',
  'src/i18n',
  'i18n',
  'translations',
  'src/translations',
  'public/lang',
];

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function resolveAndLoadConfig(
  cwd: string,
  configPath?: string,
): Promise<WorldReadyConfig> {
  if (configPath) {
    const fullPath = path.resolve(cwd, configPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<WorldReadyConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      include: parsed.include ?? DEFAULT_CONFIG.include,
      exclude: parsed.exclude ?? DEFAULT_CONFIG.exclude,
      rules: {
        ...DEFAULT_CONFIG.rules,
        ...parsed.rules,
      },
    };
  }

  return loadConfig(cwd);
}

export async function findLocalesDirectory(
  cwd: string,
  configuredDir?: string,
): Promise<string | undefined> {
  if (configuredDir) {
    const full = path.resolve(cwd, configuredDir);
    if (await exists(full)) return full;
  }

  const detection = await detectFramework(cwd);
  if (detection.localesDir) {
    const full = path.resolve(cwd, detection.localesDir);
    if (await exists(full)) return full;
  }

  for (const dir of COMMON_LOCALE_DIRS) {
    const full = path.resolve(cwd, dir);
    if (await exists(full)) return full;
  }

  return undefined;
}

export async function buildLocaleData(
  cwd: string,
  config: WorldReadyConfig,
): Promise<LocaleData> {
  const localesDir = await findLocalesDirectory(cwd, config.localesDir);

  let translations: Record<string, Record<string, unknown>> = {};
  const translationFiles: Record<string, string> = {};

  if (localesDir) {
    try {
      const { parseLocaleFiles } = await import('@worldready/parsers');
      translations = await parseLocaleFiles(localesDir);

      const entries = await fs.readdir(localesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const loc = path.basename(entry.name, '.json');
          translationFiles[loc] = path.relative(cwd, path.join(localesDir, entry.name)).replace(/\\/g, '/');
        } else if (entry.isDirectory()) {
          const loc = entry.name;
          const subPath = path.join(localesDir, loc);
          const subEntries = await fs.readdir(subPath, { withFileTypes: true });
          const jsonSub = subEntries.find((s) => s.isFile() && s.name.endsWith('.json'));
          if (jsonSub) {
            translationFiles[loc] = path.relative(cwd, path.join(subPath, jsonSub.name)).replace(/\\/g, '/');
          }
        }
      }
    } catch {
      // Locales dir reading failed, fallback to empty
    }
  }

  return {
    sourceLocale: config.sourceLocale || 'en',
    targetLocales: config.targetLocales || [],
    translations,
    translationFiles,
  };
}

export async function auditCommand(options: AuditCommandOptions = {}): Promise<AuditResult> {
  const cwd = options.cwd ?? process.cwd();

  // Dynamically import parsers and rules now that polyfill has run
  const { discoverFiles, parseFiles } = await import('@worldready/parsers');
  const { allRules } = await import('@worldready/rules');

  // 1. Load config
  let config = await resolveAndLoadConfig(cwd, options.config);

  // 2. Merge CLI overrides
  if (options.locales) {
    const targetLocales = options.locales
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    config = { ...config, targetLocales };
  }
  if (options.baseline) {
    config = { ...config, baseline: options.baseline };
  }

  // 3. Discover files
  const patterns = config.include?.length ? config.include : DEFAULT_CONFIG.include;
  const excludePatterns = config.exclude?.length ? config.exclude : DEFAULT_CONFIG.exclude;
  const discoveredFilePaths = await discoverFiles(patterns, excludePatterns, cwd);

  // 4. Parse files and locale data
  const parsedFiles: ParsedFile[] = await parseFiles(discoveredFilePaths);
  const localeData: LocaleData = await buildLocaleData(cwd, config);

  // 5. Construct AuditEngine
  const engine = new AuditEngine();

  // 6. Register rules
  for (const rule of allRules) {
    engine.registerRule(rule);
  }

  // 7. Register reporters
  for (const reporter of allReporters) {
    engine.registerReporter(reporter);
  }

  // 8. Run audit
  let result = await engine.audit(parsedFiles, config, localeData);

  // 9. If --baseline, filter new findings
  const baselinePath = options.baseline || config.baseline;
  if (baselinePath) {
    const fullBaselinePath = path.resolve(cwd, baselinePath);
    const baselineFingerprints = await loadBaseline(fullBaselinePath);
    const filteredFindings = filterNewFindings(result.findings, baselineFingerprints);
    result = {
      ...result,
      findings: filteredFindings,
      stats: {
        errors: filteredFindings.filter((f) => f.severity === 'error').length,
        warnings: filteredFindings.filter((f) => f.severity === 'warning').length,
        suggestions: filteredFindings.filter((f) => f.severity === 'suggestion').length,
        filesScanned: result.stats.filesScanned,
        rulesRan: result.stats.rulesRan,
      },
    };
  }

  // 10. If --save-baseline, save baseline
  if (options.saveBaseline) {
    const fullSavePath = path.resolve(cwd, options.saveBaseline);
    await fs.mkdir(path.dirname(fullSavePath), { recursive: true });
    await saveBaseline(result.findings, fullSavePath);
  }

  // 11. Format output using selected reporter
  const format = options.format || 'console';
  const reporter = getReporter(format);
  if (!reporter) {
    throw new Error(
      `Unknown reporter format: "${format}". Supported formats: console, json, markdown, sarif`,
    );
  }
  const formattedOutput = await reporter.format(result);

  // 12. If output file specified, write to file, else print to console
  if (options.output) {
    const outPath = path.resolve(cwd, options.output);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, formattedOutput, 'utf-8');
  } else {
    const print = options.stdout ?? console.log;
    print(formattedOutput);
  }

  // 13. Exit with code 1 if errors > 0, else 0
  if (result.stats.errors > 0) {
    process.exitCode = 1;
  }

  return result;
}
