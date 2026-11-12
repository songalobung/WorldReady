import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  createProgram,
  auditCommand,
  ciCommand,
  rulesCommand,
  doctorCommand,
  initCommand,
  formatRulesTable,
  resolveAndLoadConfig,
  findLocalesDirectory,
  buildLocaleData,
} from './index.js';

describe('WorldReady CLI', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'worldready-cli-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  describe('rules command', () => {
    it('returns all 8 available rules', async () => {
      const output: string[] = [];
      const rules = await rulesCommand({
        stdout: (msg) => output.push(msg),
      });

      expect(rules).toHaveLength(8);
      const ruleIds = rules.map((r) => r.id);
      expect(ruleIds).toContain('WRD001');
      expect(ruleIds).toContain('WRD002');
      expect(ruleIds).toContain('WRD101');
      expect(ruleIds).toContain('WRD102');
      expect(ruleIds).toContain('WRD103');
      expect(ruleIds).toContain('WRD301');
      expect(ruleIds).toContain('WRD302');
      expect(ruleIds).toContain('WRD401');
      expect(output.length).toBeGreaterThan(0);
    });

    it('filters rules by category', async () => {
      const output: string[] = [];
      const rules = await rulesCommand({
        category: 'translations',
        stdout: (msg) => output.push(msg),
      });

      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        expect(rule.category).toBe('translations');
      }
    });

    it('outputs rules as JSON when json flag is true', async () => {
      const output: string[] = [];
      await rulesCommand({
        json: true,
        stdout: (msg) => output.push(msg),
      });

      const joined = output.join('\n');
      const parsed = JSON.parse(joined);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(8);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('name');
      expect(parsed[0]).toHaveProperty('category');
      expect(parsed[0]).toHaveProperty('defaultSeverity');
      expect(parsed[0]).toHaveProperty('description');
    });

    it('formats rules table correctly', async () => {
      const rules = await rulesCommand({ json: true, stdout: () => {} });
      const table = formatRulesTable(rules);
      expect(table).toContain('ID');
      expect(table).toContain('Category');
      expect(table).toContain('WRD001');
      expect(table).toContain('WRD101');
    });
  });

  describe('init command', () => {
    it('initializes worldready.config.json in project directory', async () => {
      const output: string[] = [];
      const configPath = await initCommand({
        cwd: tmpDir,
        stdout: (msg) => output.push(msg),
      });

      expect(configPath).toBe(path.join(tmpDir, 'worldready.config.json'));
      const exists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const content = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(content.sourceLocale).toBe('en');
      expect(Array.isArray(content.targetLocales)).toBe(true);
      expect(Array.isArray(content.include)).toBe(true);
      expect(Array.isArray(content.exclude)).toBe(true);
      expect(output.some((m) => m.includes('worldready.config.json'))).toBe(true);
    });
  });

  describe('doctor command', () => {
    it('diagnoses an unconfigured project and returns warnings', async () => {
      const output: string[] = [];
      const result = await doctorCommand({
        cwd: tmpDir,
        stdout: (msg) => output.push(msg),
      });

      expect(result.config.found).toBe(false);
      expect(result.localesDir.found).toBe(false);
      expect(result.translations.sourceFound).toBe(false);
      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(output.some((m) => m.includes('WorldReady Project Doctor'))).toBe(true);
    });

    it('diagnoses a configured project with locales and keys', async () => {
      // Setup mock project
      const config = {
        sourceLocale: 'en',
        targetLocales: ['fr'],
        localesDir: 'locales',
      };
      await fs.writeFile(
        path.join(tmpDir, 'worldready.config.json'),
        JSON.stringify(config, null, 2),
      );

      const localesDir = path.join(tmpDir, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ greeting: 'Hello', auth: { login: 'Log in' } }),
      );
      await fs.writeFile(
        path.join(localesDir, 'fr.json'),
        JSON.stringify({ greeting: 'Bonjour', auth: { login: 'Connexion' } }),
      );

      const output: string[] = [];
      const result = await doctorCommand({
        cwd: tmpDir,
        stdout: (msg) => output.push(msg),
      });

      expect(result.config.found).toBe(true);
      expect(result.localesDir.found).toBe(true);
      expect(result.translations.sourceFound).toBe(true);
      expect(result.translations.sourceKeyCount).toBe(2);
      expect(result.translations.targets[0].found).toBe(true);
      expect(result.translations.targets[0].missingKeys).toHaveLength(0);
      expect(result.status).toBe('ok');
    });

    it('identifies missing target locale files as errors', async () => {
      const config = {
        sourceLocale: 'en',
        targetLocales: ['de'],
        localesDir: 'locales',
      };
      await fs.writeFile(
        path.join(tmpDir, 'worldready.config.json'),
        JSON.stringify(config, null, 2),
      );

      const localesDir = path.join(tmpDir, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ greeting: 'Hello' }),
      );

      const result = await doctorCommand({ cwd: tmpDir, stdout: () => {} });
      expect(result.translations.targets[0].found).toBe(false);
      expect(result.status).toBe('error');
      expect(result.summary.errors).toBe(1);
    });
  });

  describe('audit command', () => {
    it('audits a clean project directory without findings', async () => {
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'index.ts'),
        `export function add(a: number, b: number) { return a + b; }\n`,
      );

      const output: string[] = [];
      const result = await auditCommand({
        cwd: tmpDir,
        stdout: (msg) => output.push(msg),
      });

      expect(result.stats.filesScanned).toBe(1);
      expect(result.stats.rulesRan).toBe(8);
      expect(result.stats.errors).toBe(0);
      expect(result.stats.warnings).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it('formats audit report with json, markdown, sarif, and console formats', async () => {
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'clean.ts'),
        `export const val = 100;\n`,
      );

      // JSON format
      const jsonOut: string[] = [];
      await auditCommand({
        cwd: tmpDir,
        format: 'json',
        stdout: (msg) => jsonOut.push(msg),
      });
      const parsedJson = JSON.parse(jsonOut.join('\n'));
      expect(parsedJson.stats.filesScanned).toBe(1);

      // Markdown format
      const mdOut: string[] = [];
      await auditCommand({
        cwd: tmpDir,
        format: 'markdown',
        stdout: (msg) => mdOut.push(msg),
      });
      expect(mdOut.join('\n')).toContain('# WorldReady Audit Report');

      // SARIF format
      const sarifOut: string[] = [];
      await auditCommand({
        cwd: tmpDir,
        format: 'sarif',
        stdout: (msg) => sarifOut.push(msg),
      });
      const parsedSarif = JSON.parse(sarifOut.join('\n'));
      expect(parsedSarif.version).toBe('2.1.0');

      // Console format
      const consoleOut: string[] = [];
      await auditCommand({
        cwd: tmpDir,
        format: 'console',
        stdout: (msg) => consoleOut.push(msg),
      });
      expect(consoleOut.join('\n')).toContain('WorldReady Audit Report');
    });

    it('writes output to a specified file with --output', async () => {
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.ts'), 'const x = 1;');

      const reportPath = path.join(tmpDir, 'reports', 'audit.json');
      await auditCommand({
        cwd: tmpDir,
        format: 'json',
        output: reportPath,
      });

      const exists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const content = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      expect(content.stats.filesScanned).toBe(1);
    });

    it('detects translation issues (WRD101) and sets process.exitCode = 1', async () => {
      const config = {
        sourceLocale: 'en',
        targetLocales: ['fr'],
        localesDir: 'locales',
      };
      await fs.writeFile(
        path.join(tmpDir, 'worldready.config.json'),
        JSON.stringify(config, null, 2),
      );

      const localesDir = path.join(tmpDir, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ greeting: 'Hello', farewell: 'Goodbye' }),
      );
      // Missing 'farewell' in fr
      await fs.writeFile(
        path.join(localesDir, 'fr.json'),
        JSON.stringify({ greeting: 'Bonjour' }),
      );

      const result = await auditCommand({
        cwd: tmpDir,
        format: 'json',
        stdout: () => {},
      });

      expect(result.stats.errors).toBe(1);
      expect(result.findings.some((f) => f.ruleId === 'WRD101')).toBe(true);
      expect(process.exitCode).toBe(1);
    });

    it('supports --baseline to suppress known findings and --save-baseline to write them', async () => {
      const config = {
        sourceLocale: 'en',
        targetLocales: ['fr'],
        localesDir: 'locales',
      };
      await fs.writeFile(
        path.join(tmpDir, 'worldready.config.json'),
        JSON.stringify(config, null, 2),
      );

      const localesDir = path.join(tmpDir, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ key1: 'One', key2: 'Two' }),
      );
      await fs.writeFile(
        path.join(localesDir, 'fr.json'),
        JSON.stringify({ key1: 'Un' }), // key2 is missing
      );

      const baselineFile = path.join(tmpDir, 'baseline.json');

      // 1. Audit and save baseline
      const initialResult = await auditCommand({
        cwd: tmpDir,
        saveBaseline: baselineFile,
        stdout: () => {},
      });
      expect(initialResult.findings.length).toBeGreaterThan(0);

      const baselineExists = await fs
        .access(baselineFile)
        .then(() => true)
        .catch(() => false);
      expect(baselineExists).toBe(true);

      // Reset exitCode
      process.exitCode = undefined;

      // 2. Re-audit with baseline: findings should be suppressed!
      const suppressedResult = await auditCommand({
        cwd: tmpDir,
        baseline: baselineFile,
        stdout: () => {},
      });
      expect(suppressedResult.findings).toHaveLength(0);
      expect(suppressedResult.stats.errors).toBe(0);
      expect(process.exitCode).toBeUndefined();
    });

    it('merges --locales CLI override', async () => {
      const config = {
        sourceLocale: 'en',
        targetLocales: ['es'],
        localesDir: 'locales',
      };
      await fs.writeFile(
        path.join(tmpDir, 'worldready.config.json'),
        JSON.stringify(config, null, 2),
      );

      const localesDir = path.join(tmpDir, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ hello: 'world' }),
      );
      await fs.writeFile(
        path.join(localesDir, 'es.json'),
        JSON.stringify({ hello: 'mundo' }),
      );

      // Override targetLocales from es to fr (which is missing)
      const result = await auditCommand({
        cwd: tmpDir,
        locales: 'fr',
        stdout: () => {},
      });

      // Target locale 'fr' is missing key 'hello'
      expect(result.findings.some((f) => f.locale === 'fr')).toBe(true);
    });
  });

  describe('ci command', () => {
    it('runs audit in CI mode with SARIF output by default', async () => {
      const output: string[] = [];
      const result = await ciCommand({
        cwd: tmpDir,
        stdout: (msg) => output.push(msg),
      });

      expect(result.stats.filesScanned).toBeDefined();
      const sarif = JSON.parse(output.join('\n'));
      expect(sarif.version).toBe('2.1.0');
    });

    it('sets process.exitCode = 1 when errors are found in CI mode', async () => {
      const config = {
        sourceLocale: 'en',
        targetLocales: ['de'],
        localesDir: 'locales',
      };
      await fs.writeFile(
        path.join(tmpDir, 'worldready.config.json'),
        JSON.stringify(config, null, 2),
      );

      const localesDir = path.join(tmpDir, 'locales');
      await fs.mkdir(localesDir, { recursive: true });
      await fs.writeFile(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ missingKey: 'Value' }),
      );
      await fs.writeFile(path.join(localesDir, 'de.json'), JSON.stringify({}));

      await ciCommand({
        cwd: tmpDir,
        stdout: () => {},
      });

      expect(process.exitCode).toBe(1);
    });
  });

  describe('programmatic Commander integration', () => {
    it('executes rules command via Commander program', async () => {
      const output: string[] = [];
      const program = createProgram({
        cwd: tmpDir,
        exitOverride: true,
        stdout: (msg) => output.push(msg),
      });

      await program.parseAsync(['node', 'worldready', 'rules', '--json']);
      const parsed = JSON.parse(output.join('\n'));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(8);
    });

    it('executes doctor command via Commander program', async () => {
      const output: string[] = [];
      const program = createProgram({
        cwd: tmpDir,
        exitOverride: true,
        stdout: (msg) => output.push(msg),
      });

      await program.parseAsync(['node', 'worldready', 'doctor']);
      expect(output.join('\n')).toContain('WorldReady Project Doctor');
    });

    it('executes audit command via Commander program', async () => {
      const output: string[] = [];
      const program = createProgram({
        cwd: tmpDir,
        exitOverride: true,
        stdout: (msg) => output.push(msg),
      });

      await program.parseAsync(['node', 'worldready', 'audit', '--format', 'json']);
      const parsed = JSON.parse(output.join('\n'));
      expect(parsed.stats).toBeDefined();
    });
  });

  describe('helper utilities', () => {
    it('resolveAndLoadConfig loads custom config file', async () => {
      const customConfig = {
        sourceLocale: 'ja',
        targetLocales: ['en', 'zh'],
      };
      const customPath = path.join(tmpDir, 'custom.json');
      await fs.writeFile(customPath, JSON.stringify(customConfig, null, 2));

      const loaded = await resolveAndLoadConfig(tmpDir, 'custom.json');
      expect(loaded.sourceLocale).toBe('ja');
      expect(loaded.targetLocales).toEqual(['en', 'zh']);
    });

    it('findLocalesDirectory detects locales directory', async () => {
      const locDir = path.join(tmpDir, 'locales');
      await fs.mkdir(locDir, { recursive: true });

      const found = await findLocalesDirectory(tmpDir);
      expect(found).toBe(locDir);
    });

    it('buildLocaleData constructs translation files mapping', async () => {
      const locDir = path.join(tmpDir, 'locales');
      await fs.mkdir(locDir, { recursive: true });
      await fs.writeFile(
        path.join(locDir, 'en.json'),
        JSON.stringify({ hello: 'world' }),
      );

      const localeData = await buildLocaleData(tmpDir, {
        sourceLocale: 'en',
        targetLocales: ['fr'],
        include: [],
        exclude: [],
        rules: {},
        localesDir: 'locales',
      });

      expect(localeData.translations.en).toEqual({ hello: 'world' });
      expect(localeData.translationFiles.en).toContain('locales/en.json');
    });
  });
});

