import ts from 'typescript';
import path from 'node:path';
import type { ParsedFile } from './types.js';

/**
 * Parse a JavaScript or TypeScript file into a TypeScript AST.
 */
export function parseJavaScript(filePath: string, content: string): ParsedFile {
  const ext = path.extname(filePath).toLowerCase();
  const language: ParsedFile['language'] =
    ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript';

  const scriptKindMap: Record<string, ts.ScriptKind> = {
    '.ts': ts.ScriptKind.TS,
    '.tsx': ts.ScriptKind.TSX,
    '.js': ts.ScriptKind.JS,
    '.jsx': ts.ScriptKind.JSX,
  };

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindMap[ext] ?? ts.ScriptKind.JS,
  );

  return {
    filePath,
    language,
    ast: sourceFile,
    rawContent: content,
    lines: content.split('\n'),
  };
}
