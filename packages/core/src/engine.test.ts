import { describe, it, expect } from 'vitest';
import { AuditEngine } from './engine.js';
import {
  createFingerprint,
  filterNewFindings,
  saveBaseline,
  loadBaseline,
} from './baseline.js';
import type {
  Finding,
  LocaleData,
  ParsedFile,
  Rule,
  WorldReadyConfig,
} from './types.js';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
  overrides: Partial<WorldReadyConfig> = {},
): WorldReadyConfig {
  return {
    sourceLocale: 'en',
    targetLocales: ['fr', 'de'],
    include: ['src/**'],
    exclude: [],
    rules: {},
    ...overrides,
  };
}

function makeLocaleData(): LocaleData {
  return {
    sourceLocale: 'en',
    targetLocales: ['fr', 'de'],
    translations: {},
    translationFiles: {},
  };
}

function makeFile(filePath = 'src/app.ts'): ParsedFile {
  return {
    filePath,
    language: 'typescript',
    rawContent: 'const x = 1;',
    lines: ['const x = 1;'],
  };
}

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'test/rule',
    severity: 'warning',
    confidence: 1,
    message: 'test message',
    file: 'src/app.ts',
    line: 1,
    ...overrides,
  };
}

function makeRule(findings: Finding[], id = 'test/rule'): Rule {
  return {
    meta: {
      id,
      name: 'Test Rule',
      description: 'A test rule',
      category: 'source-text',
      defaultSeverity: 'warning',
    },
    check: () => findings,
  };
}

// ---------------------------------------------------------------------------
// Engine tests
// ---------------------------------------------------------------------------

describe('AuditEngine', () => {
  it('returns empty findings when no rules are registered', async () => {
    const engine = new AuditEngine();
    const result = await engine.audit(
      [makeFile()],
      makeConfig(),
      makeLocaleData(),
    );

    expect(result.findings).toEqual([]);
    expect(result.stats.errors).toBe(0);
    expect(result.stats.warnings).toBe(0);
    expect(result.stats.suggestions).toBe(0);
    expect(result.stats.filesScanned).toBe(1);
    expect(result.stats.rulesRan).toBe(0);
  });

  it('collects findings from registered rules', async () => {
    const engine = new AuditEngine();
    const finding = makeFinding();
    engine.registerRule(makeRule([finding]));

    const result = await engine.audit(
      [makeFile()],
      makeConfig(),
      makeLocaleData(),
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.ruleId).toBe('test/rule');
    expect(result.stats.warnings).toBe(1);
    expect(result.stats.rulesRan).toBe(1);
  });

  it('skips disabled rules', async () => {
    const engine = new AuditEngine();
    engine.registerRule(makeRule([makeFinding()]));

    const config = makeConfig({
      rules: { 'test/rule': { enabled: false } },
    });

    const result = await engine.audit(
      [makeFile()],
      config,
      makeLocaleData(),
    );

    expect(result.findings).toHaveLength(0);
    expect(result.stats.rulesRan).toBe(0);
  });

  it('applies severity overrides from config', async () => {
    const engine = new AuditEngine();
    engine.registerRule(makeRule([makeFinding({ severity: 'warning' })]));

    const config = makeConfig({
      rules: { 'test/rule': { severity: 'error' } },
    });

    const result = await engine.audit(
      [makeFile()],
      config,
      makeLocaleData(),
    );

    expect(result.findings[0]!.severity).toBe('error');
    expect(result.stats.errors).toBe(1);
    expect(result.stats.warnings).toBe(0);
  });

  it('sorts findings by file then line', async () => {
    const engine = new AuditEngine();
    engine.registerRule(
      makeRule([
        makeFinding({ file: 'z.ts', line: 5 }),
        makeFinding({ file: 'a.ts', line: 10 }),
        makeFinding({ file: 'a.ts', line: 2 }),
      ]),
    );

    const result = await engine.audit(
      [makeFile()],
      makeConfig(),
      makeLocaleData(),
    );

    expect(result.findings.map((f) => `${f.file}:${f.line}`)).toEqual([
      'a.ts:2',
      'a.ts:10',
      'z.ts:5',
    ]);
  });

  it('supports async rules', async () => {
    const engine = new AuditEngine();
    const asyncRule: Rule = {
      meta: {
        id: 'async/rule',
        name: 'Async',
        description: 'async rule',
        category: 'translations',
        defaultSeverity: 'error',
      },
      check: async () => {
        return [makeFinding({ ruleId: 'async/rule', severity: 'error' })];
      },
    };
    engine.registerRule(asyncRule);

    const result = await engine.audit(
      [makeFile()],
      makeConfig(),
      makeLocaleData(),
    );
    expect(result.findings).toHaveLength(1);
    expect(result.stats.errors).toBe(1);
  });

  it('registers and exposes reporters', () => {
    const engine = new AuditEngine();
    const reporter = { name: 'json', format: () => '{}' };
    engine.registerReporter(reporter);
    expect(engine.getReporters()).toContain(reporter);
  });
});

// ---------------------------------------------------------------------------
// Baseline tests
// ---------------------------------------------------------------------------

describe('Baseline', () => {
  it('createFingerprint is deterministic', () => {
    const f = makeFinding();
    expect(createFingerprint(f)).toBe(createFingerprint(f));
    expect(typeof createFingerprint(f)).toBe('string');
    expect(createFingerprint(f)).toHaveLength(64); // sha256 hex
  });

  it('filterNewFindings removes known findings', () => {
    const known = makeFinding({ message: 'known' });
    const fresh = makeFinding({ message: 'fresh' });
    const baseline = [createFingerprint(known)];

    const result = filterNewFindings([known, fresh], baseline);
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe('fresh');
  });

  it('saveBaseline + loadBaseline round-trips', async () => {
    const tmpFile = path.join(
      os.tmpdir(),
      `wr-baseline-test-${Date.now()}.json`,
    );
    const findings = [makeFinding(), makeFinding({ message: 'other' })];

    await saveBaseline(findings, tmpFile);
    const loaded = await loadBaseline(tmpFile);

    expect(loaded).toHaveLength(2);
    expect(loaded).toContain(createFingerprint(findings[0]!));
    expect(loaded).toContain(createFingerprint(findings[1]!));

    // Cleanup
    await unlink(tmpFile).catch(() => {});
  });

  it('loadBaseline returns [] for missing file', async () => {
    const result = await loadBaseline('/nonexistent/path/baseline.json');
    expect(result).toEqual([]);
  });
});
