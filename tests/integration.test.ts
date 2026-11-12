import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { describe, it, expect } from 'vitest';
import {
  AuditEngine,
  filterNewFindings,
  loadBaseline,
  saveBaseline,
  type AuditResult,
  type LocaleData,
  type WorldReadyConfig,
} from '@worldready/core';
import { loadConfig } from '@worldready/config';
import { discoverFiles, parseFiles, parseLocaleFiles } from '@worldready/parsers';
import { allRules } from '@worldready/rules';

const ROOT_DIR = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(ROOT_DIR, 'fixtures');

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute the full end-to-end audit pipeline against a given fixture directory:
 * 1. Load configuration from disk
 * 2. Discover target files
 * 3. Parse discovered source, markup, style, and locale files
 * 4. Load and index translation data
 * 5. Initialize the audit engine and register all standard rules
 * 6. Execute audit and return structured AuditResult
 */
async function runAuditPipeline(fixturePath: string): Promise<AuditResult> {
  // 1. Load config
  const config = await loadConfig(fixturePath);

  // 2. Discover files
  const filePaths = await discoverFiles(config.include, config.exclude, fixturePath);

  // 3. Parse files
  const parsedFiles = await parseFiles(filePaths);

  // 4. Resolve locales directory and load translations
  let translations: Record<string, Record<string, unknown>> = {};
  const translationFiles: Record<string, string> = {};

  let resolvedLocalesDir: string | null = null;
  if (config.localesDir) {
    const candidate = path.resolve(fixturePath, config.localesDir);
    if (await fileExists(candidate)) {
      resolvedLocalesDir = candidate;
    }
  }

  if (!resolvedLocalesDir) {
    const candidates = [
      path.join(fixturePath, 'public', 'locales'),
      path.join(fixturePath, 'locales'),
    ];
    for (const cand of candidates) {
      if (await fileExists(cand)) {
        resolvedLocalesDir = cand;
        break;
      }
    }
  }

  if (resolvedLocalesDir) {
    translations = await parseLocaleFiles(resolvedLocalesDir);

    const allLocales = [config.sourceLocale, ...(config.targetLocales || [])];
    for (const loc of allLocales) {
      const nestedPath = path.join(resolvedLocalesDir, loc, 'common.json');
      const flatPath = path.join(resolvedLocalesDir, `${loc}.json`);
      if (await fileExists(nestedPath)) {
        translationFiles[loc] = nestedPath;
      } else if (await fileExists(flatPath)) {
        translationFiles[loc] = flatPath;
      }
    }
  }

  const localeData: LocaleData = {
    sourceLocale: config.sourceLocale,
    targetLocales: config.targetLocales,
    translations,
    translationFiles,
  };

  // 5. Initialize engine with all rules
  const engine = new AuditEngine();
  for (const rule of allRules) {
    engine.registerRule(rule);
  }

  // 6. Execute audit
  return engine.audit(parsedFiles, config, localeData);
}

describe('WorldReady Integration Tests', () => {
  describe('nextjs-i18next fixture', () => {
    const fixtureDir = path.join(FIXTURES_DIR, 'nextjs-i18next');

    it('detects all deliberate defects: WRD001, WRD002, WRD101, WRD102, WRD103', async () => {
      const result = await runAuditPipeline(fixtureDir);

      expect(result).toBeDefined();
      expect(result.findings.length).toBeGreaterThanOrEqual(5);

      const ruleIds = result.findings.map((f) => f.ruleId);
      expect(ruleIds).toContain('WRD001');
      expect(ruleIds).toContain('WRD002');
      expect(ruleIds).toContain('WRD101');
      expect(ruleIds).toContain('WRD102');
      expect(ruleIds).toContain('WRD103');

      // Verify WRD001: Hardcoded JSX text
      const wrd001 = result.findings.find((f) => f.ruleId === 'WRD001');
      expect(wrd001).toBeDefined();
      expect(wrd001?.message).toContain('Submit');
      expect(wrd001?.file).toMatch(/pages[\\/]index\.tsx$/);

      // Verify WRD002: Dynamic string concatenation in UI
      const wrd002 = result.findings.find((f) => f.ruleId === 'WRD002');
      expect(wrd002).toBeDefined();
      expect(wrd002?.message).toMatch(/Hello/);
      expect(wrd002?.file).toMatch(/pages[\\/]index\.tsx$/);

      // Verify WRD101: Missing translation key in target locale
      const wrd101 = result.findings.find((f) => f.ruleId === 'WRD101');
      expect(wrd101).toBeDefined();
      expect(wrd101?.key).toBe('missing_feature');
      expect(wrd101?.locale).toBe('fr');
      expect(wrd101?.severity).toBe('error');

      // Verify WRD102: Unused translation key in source locale
      const wrd102 = result.findings.find((f) => f.ruleId === 'WRD102');
      expect(wrd102).toBeDefined();
      expect(wrd102?.key).toBe('unused_analytics_key');
      expect(wrd102?.locale).toBe('en');
      expect(wrd102?.severity).toBe('suggestion');

      // Verify WRD103: Placeholder mismatch between source and target
      const wrd103 = result.findings.find((f) => f.ruleId === 'WRD103');
      expect(wrd103).toBeDefined();
      expect(wrd103?.key).toBe('items_count');
      expect(wrd103?.locale).toBe('fr');
      expect(wrd103?.severity).toBe('error');
    });

    it('verifies exact stats count of errors, warnings, suggestions, and scanned files', async () => {
      const result = await runAuditPipeline(fixtureDir);

      expect(result.stats.errors).toBe(2); // WRD101, WRD103
      expect(result.stats.warnings).toBe(2); // WRD001, WRD002
      expect(result.stats.suggestions).toBe(1); // WRD102
      expect(result.stats.filesScanned).toBeGreaterThanOrEqual(3);
      expect(result.stats.rulesRan).toBe(allRules.length);
    });
  });

  describe('rtl-broken fixture', () => {
    const fixtureDir = path.join(FIXTURES_DIR, 'rtl-broken');

    it('detects WRD301 (missing dir attribute) and WRD302 (physical CSS properties)', async () => {
      const result = await runAuditPipeline(fixtureDir);

      expect(result).toBeDefined();
      const ruleIds = result.findings.map((f) => f.ruleId);
      expect(ruleIds).toContain('WRD301');
      expect(ruleIds).toContain('WRD302');

      // WRD301: HTML missing dir="rtl"
      const wrd301 = result.findings.find((f) => f.ruleId === 'WRD301');
      expect(wrd301).toBeDefined();
      expect(wrd301?.file).toMatch(/index\.html$/);
      expect(wrd301?.message).toContain('missing "dir" attribute');

      // WRD302: Physical CSS properties
      const wrd302Findings = result.findings.filter((f) => f.ruleId === 'WRD302');
      expect(wrd302Findings.length).toBe(3);

      const messages = wrd302Findings.map((f) => f.message);
      expect(messages.some((m) => m.includes('margin-left'))).toBe(true);
      expect(messages.some((m) => m.includes('padding-right'))).toBe(true);
      expect(messages.some((m) => m.includes('text-align: left'))).toBe(true);

      // Verify all findings in this fixture are warnings
      expect(result.stats.errors).toBe(0);
      expect(result.stats.warnings).toBe(4);
    });
  });

  describe('translation-errors fixture', () => {
    const fixtureDir = path.join(FIXTURES_DIR, 'translation-errors');

    it('detects translation errors, missing keys, and placeholder mismatches across locales', async () => {
      const result = await runAuditPipeline(fixtureDir);

      expect(result).toBeDefined();
      const ruleIds = result.findings.map((f) => f.ruleId);
      expect(ruleIds).toContain('WRD101');
      expect(ruleIds).toContain('WRD103');

      // Missing keys in fr and es
      const missingKeys = result.findings.filter((f) => f.ruleId === 'WRD101');
      expect(missingKeys.length).toBeGreaterThanOrEqual(2);
      expect(missingKeys.some((f) => f.locale === 'fr' && f.key === 'missing_action')).toBe(true);
      expect(missingKeys.some((f) => f.locale === 'es' && f.key === 'cart_summary')).toBe(true);

      // Placeholder mismatches in fr and es
      const placeholderMismatches = result.findings.filter((f) => f.ruleId === 'WRD103');
      expect(placeholderMismatches.length).toBeGreaterThanOrEqual(3);
      expect(placeholderMismatches.some((f) => f.locale === 'fr' && f.key === 'welcome')).toBe(true);
      expect(placeholderMismatches.some((f) => f.locale === 'es' && f.key === 'welcome')).toBe(true);
    });
  });

  describe('baseline suppression', () => {
    const fixtureDir = path.join(FIXTURES_DIR, 'nextjs-i18next');

    it('saves a baseline and suppresses existing findings to 0 on re-audit', async () => {
      // 1. Initial audit produces findings
      const initialResult = await runAuditPipeline(fixtureDir);
      expect(initialResult.findings.length).toBe(5);

      // 2. Save baseline to a temp file
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'worldready-baseline-test-'));
      const baselinePath = path.join(tempDir, 'worldready.baseline.json');

      try {
        await saveBaseline(initialResult.findings, baselinePath);

        const exists = await fileExists(baselinePath);
        expect(exists).toBe(true);

        // 3. Load baseline
        const baseline = await loadBaseline(baselinePath);
        expect(baseline).toHaveLength(5);

        // 4. Re-audit and apply baseline filter
        const reAuditResult = await runAuditPipeline(fixtureDir);
        const filteredFindings = filterNewFindings(reAuditResult.findings, baseline);

        // Findings count must be exactly 0 after baseline suppression
        expect(filteredFindings).toHaveLength(0);

        // 5. Test that a genuinely new finding is NOT suppressed
        const syntheticNewFinding = {
          ruleId: 'WRD001',
          severity: 'warning' as const,
          confidence: 0.9,
          message: 'Hard-coded text "Brand New Button" should be localized',
          file: path.join(fixtureDir, 'pages', 'new.tsx'),
          line: 10,
        };

        const findingsWithNew = [...reAuditResult.findings, syntheticNewFinding];
        const filteredWithNew = filterNewFindings(findingsWithNew, baseline);

        expect(filteredWithNew).toHaveLength(1);
        expect(filteredWithNew[0].message).toBe(syntheticNewFinding.message);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  });
});
