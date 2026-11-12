import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from './loader.js';
import { detectFramework } from './detector.js';
import { initConfig } from './init.js';
import { DEFAULT_CONFIG } from './defaults.js';

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `worldready-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config file is found', async () => {
    const config = await loadConfig(tempDir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('merges user config with defaults from worldready.config.json', async () => {
    const userConfig = {
      sourceLocale: 'fr',
      targetLocales: ['en', 'de'],
    };
    await writeFile(
      join(tempDir, 'worldready.config.json'),
      JSON.stringify(userConfig),
    );

    const config = await loadConfig(tempDir);
    expect(config.sourceLocale).toBe('fr');
    expect(config.targetLocales).toEqual(['en', 'de']);
    // Should keep default include/exclude
    expect(config.include).toEqual(DEFAULT_CONFIG.include);
    expect(config.exclude).toEqual(DEFAULT_CONFIG.exclude);
  });

  it('overrides include/exclude when specified in user config', async () => {
    const userConfig = {
      include: ['lib/**'],
      exclude: ['tmp/**'],
    };
    await writeFile(
      join(tempDir, 'worldready.config.json'),
      JSON.stringify(userConfig),
    );

    const config = await loadConfig(tempDir);
    expect(config.include).toEqual(['lib/**']);
    expect(config.exclude).toEqual(['tmp/**']);
  });

  it('merges rules from user config with defaults', async () => {
    const userConfig = {
      rules: {
        'no-hardcoded-strings': { severity: 'error' as const, enabled: true },
      },
    };
    await writeFile(
      join(tempDir, 'worldready.config.json'),
      JSON.stringify(userConfig),
    );

    const config = await loadConfig(tempDir);
    expect(config.rules['no-hardcoded-strings']).toEqual({
      severity: 'error',
      enabled: true,
    });
  });

  it('reads config from .worldreadyrc.json', async () => {
    const userConfig = {
      sourceLocale: 'ja',
      targetLocales: ['en'],
    };
    await writeFile(
      join(tempDir, '.worldreadyrc.json'),
      JSON.stringify(userConfig),
    );

    const config = await loadConfig(tempDir);
    expect(config.sourceLocale).toBe('ja');
    expect(config.targetLocales).toEqual(['en']);
  });
});

describe('detectFramework', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `worldready-detector-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects next-intl framework and locales directory', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { 'next-intl': '^3.0.0' } }),
    );
    await mkdir(join(tempDir, 'messages'), { recursive: true });

    const result = await detectFramework(tempDir);
    expect(result.framework).toBe('next-intl');
    expect(result.localesDir).toBe('messages');
  });

  it('detects i18next framework', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { 'react-i18next': '^12.0.0' } }),
    );
    await mkdir(join(tempDir, 'public', 'locales'), { recursive: true });

    const result = await detectFramework(tempDir);
    expect(result.framework).toBe('i18next');
    expect(result.localesDir).toBe('public/locales');
  });

  it('returns unknown when framework is not recognized', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { express: '^4.0.0' } }),
    );

    const result = await detectFramework(tempDir);
    expect(result.framework).toBe('unknown');
    expect(result.localesDir).toBeUndefined();
  });
});

describe('initConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `worldready-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes worldready.config.json with detected framework and localesDir', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { 'vue-i18n': '^9.0.0' } }),
    );
    await mkdir(join(tempDir, 'locales'), { recursive: true });

    const filePath = await initConfig(tempDir);
    expect(filePath).toBe(join(tempDir, 'worldready.config.json'));

    const content = JSON.parse(await readFile(filePath, 'utf-8'));
    expect(content.sourceLocale).toBe('en');
    expect(content.localesDir).toBe('locales');
    expect(content._detectedFramework).toBe('vue-i18n');
  });
});
