import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseFile, parseFiles } from './parse-file.js';
import { parseJavaScript } from './javascript-parser.js';
import { parseJSON, parseLocaleFiles } from './json-parser.js';

describe('parseJavaScript', () => {
  it('produces a valid AST for a TypeScript file', () => {
    const content = 'const x: number = 42;\nexport default x;\n';
    const result = parseJavaScript('example.ts', content);

    expect(result.language).toBe('typescript');
    expect(result.ast).toBeDefined();
    expect(result.rawContent).toBe(content);
    expect(result.lines).toEqual(['const x: number = 42;', 'export default x;', '']);
    // The AST should be a TypeScript SourceFile with statements
    expect((result.ast as any).statements).toBeDefined();
    expect((result.ast as any).statements.length).toBeGreaterThan(0);
  });

  it('sets language to javascript for .js files', () => {
    const result = parseJavaScript('app.js', 'var a = 1;');
    expect(result.language).toBe('javascript');
  });
});

describe('parseJSON', () => {
  it('parses JSON content and stores the object in ast', () => {
    const content = '{"greeting": "Hello", "farewell": "Goodbye"}';
    const result = parseJSON('en.json', content);

    expect(result.language).toBe('json');
    expect(result.ast).toEqual({ greeting: 'Hello', farewell: 'Goodbye' });
  });
});

describe('parseLocaleFiles', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wr-locales-'));

    // Flat layout: locales/en.json, locales/fr.json
    await fs.writeFile(
      path.join(tmpDir, 'en.json'),
      JSON.stringify({ hello: 'Hello', bye: 'Goodbye' }),
    );
    await fs.writeFile(
      path.join(tmpDir, 'fr.json'),
      JSON.stringify({ hello: 'Bonjour', bye: 'Au revoir' }),
    );

    // Nested layout: locales/de/messages.json
    await fs.mkdir(path.join(tmpDir, 'de'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'de', 'messages.json'),
      JSON.stringify({ hello: 'Hallo', bye: 'Tschüss' }),
    );
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads flat locale files correctly', async () => {
    const result = await parseLocaleFiles(tmpDir);
    expect(result['en']).toEqual({ hello: 'Hello', bye: 'Goodbye' });
    expect(result['fr']).toEqual({ hello: 'Bonjour', bye: 'Au revoir' });
  });

  it('reads nested locale directories', async () => {
    const result = await parseLocaleFiles(tmpDir);
    expect(result['de']).toEqual({ hello: 'Hallo', bye: 'Tschüss' });
  });
});

describe('parseFile', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wr-parsefile-'));

    await fs.writeFile(path.join(tmpDir, 'app.ts'), 'const x = 1;');
    await fs.writeFile(path.join(tmpDir, 'index.html'), '<html><body></body></html>');
    await fs.writeFile(path.join(tmpDir, 'styles.css'), 'body { color: red; }');
    await fs.writeFile(path.join(tmpDir, 'en.json'), '{"key": "value"}');
    await fs.writeFile(path.join(tmpDir, 'readme.md'), '# Hello');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('routes .ts to typescript parser', async () => {
    const result = await parseFile(path.join(tmpDir, 'app.ts'));
    expect(result.language).toBe('typescript');
    expect(result.ast).toBeDefined();
  });

  it('routes .html to HTML parser', async () => {
    const result = await parseFile(path.join(tmpDir, 'index.html'));
    expect(result.language).toBe('html');
    expect(result.ast).toBeDefined();
  });

  it('routes .css to CSS parser', async () => {
    const result = await parseFile(path.join(tmpDir, 'styles.css'));
    expect(result.language).toBe('css');
    expect(result.ast).toBeDefined();
  });

  it('routes .json to JSON parser', async () => {
    const result = await parseFile(path.join(tmpDir, 'en.json'));
    expect(result.language).toBe('json');
    expect(result.ast).toEqual({ key: 'value' });
  });

  it('returns unknown for unrecognized extensions', async () => {
    const result = await parseFile(path.join(tmpDir, 'readme.md'));
    expect(result.language).toBe('unknown');
    expect(result.ast).toBeUndefined();
  });
});

describe('parseFiles', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wr-parsefiles-'));
    await fs.writeFile(path.join(tmpDir, 'a.ts'), 'const a = 1;');
    await fs.writeFile(path.join(tmpDir, 'b.js'), 'var b = 2;');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('parses multiple files', async () => {
    const results = await parseFiles([
      path.join(tmpDir, 'a.ts'),
      path.join(tmpDir, 'b.js'),
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].language).toBe('typescript');
    expect(results[1].language).toBe('javascript');
  });
});
