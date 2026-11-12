import fs from 'node:fs/promises';
import path from 'node:path';
import type { ParsedFile } from './types.js';
import { parseJavaScript } from './javascript-parser.js';
import { parseHTML } from './html-parser.js';
import { parseCSS } from './css-parser.js';
import { parseJSON } from './json-parser.js';

const EXTENSION_MAP: Record<string, ParsedFile['language']> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.json': 'json',
};

/**
 * Read a file from disk, detect its language from its extension,
 * and delegate to the appropriate parser.
 */
export async function parseFile(filePath: string): Promise<ParsedFile> {
  const content = await fs.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  const language = EXTENSION_MAP[ext] ?? 'unknown';

  switch (language) {
    case 'typescript':
    case 'javascript':
      return parseJavaScript(filePath, content);
    case 'html':
      return parseHTML(filePath, content);
    case 'css':
      return parseCSS(filePath, content);
    case 'json':
      return parseJSON(filePath, content);
    default:
      return {
        filePath,
        language: 'unknown',
        rawContent: content,
        lines: content.split('\n'),
      };
  }
}

/**
 * Parse multiple files and return all results.
 */
export async function parseFiles(filePaths: string[]): Promise<ParsedFile[]> {
  return Promise.all(filePaths.map(parseFile));
}
