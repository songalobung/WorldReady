import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { discoverFiles } from './discovery.js';

describe('discoverFiles', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wr-discovery-'));

    // Create a small file tree
    await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'node_modules', 'dep'), { recursive: true });

    await fs.writeFile(path.join(tmpDir, 'src', 'app.ts'), 'export const a = 1;');
    await fs.writeFile(path.join(tmpDir, 'src', 'Button.tsx'), '<button/>');
    await fs.writeFile(path.join(tmpDir, 'src', 'utils.js'), 'module.exports = {};');
    await fs.writeFile(path.join(tmpDir, 'src', 'styles.css'), 'body {}');
    await fs.writeFile(
      path.join(tmpDir, 'node_modules', 'dep', 'index.js'),
      'module.exports = {};',
    );
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('finds .ts, .tsx, and .js files', async () => {
    const files = await discoverFiles(
      ['**/*.ts', '**/*.tsx', '**/*.js'],
      ['**/node_modules/**'],
      tmpDir,
    );

    const basenames = files.map((f) => path.basename(f));
    expect(basenames).toContain('app.ts');
    expect(basenames).toContain('Button.tsx');
    expect(basenames).toContain('utils.js');
  });

  it('excludes node_modules', async () => {
    const files = await discoverFiles(
      ['**/*.js'],
      ['**/node_modules/**'],
      tmpDir,
    );

    const basenames = files.map((f) => path.basename(f));
    expect(basenames).toContain('utils.js');
    expect(basenames).not.toContain('index.js');
  });

  it('returns sorted absolute paths', async () => {
    const files = await discoverFiles(['**/*.ts', '**/*.tsx'], [], tmpDir);

    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const f of files) {
      expect(path.isAbsolute(f)).toBe(true);
    }
    // Verify sorted
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });

  it('returns empty array when no files match', async () => {
    const files = await discoverFiles(['**/*.py'], [], tmpDir);
    expect(files).toEqual([]);
  });
});
