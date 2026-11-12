import postcss from 'postcss';
import type { ParsedFile } from './types.js';

/**
 * Parse a CSS file into a PostCSS Root AST.
 */
export function parseCSS(filePath: string, content: string): ParsedFile {
  const root = postcss.parse(content, { from: filePath });

  return {
    filePath,
    language: 'css',
    ast: root,
    rawContent: content,
    lines: content.split('\n'),
  };
}
