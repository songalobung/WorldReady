export interface ParsedFile {
  filePath: string;
  language: 'typescript' | 'javascript' | 'html' | 'css' | 'json' | 'unknown';
  ast?: unknown;
  rawContent: string;
  lines: string[];
}
