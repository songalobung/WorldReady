import * as parse5 from 'parse5';
import type { ParsedFile } from './types.js';

/**
 * Parse an HTML file into a parse5 Document AST.
 */
export function parseHTML(filePath: string, content: string): ParsedFile {
  const document = parse5.parse(content);

  return {
    filePath,
    language: 'html',
    ast: document,
    rawContent: content,
    lines: content.split('\n'),
  };
}
