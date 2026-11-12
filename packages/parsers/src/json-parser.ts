import fs from 'node:fs/promises';
import path from 'node:path';
import type { ParsedFile } from './types.js';

/**
 * Parse a JSON file. Stores the parsed object in the `ast` field.
 */
export function parseJSON(filePath: string, content: string): ParsedFile {
  const parsed: unknown = JSON.parse(content);

  return {
    filePath,
    language: 'json',
    ast: parsed,
    rawContent: content,
    lines: content.split('\n'),
  };
}

/**
 * Read all JSON files in a locales directory and return a map of
 * `{ locale: { key: value } }`.
 *
 * The locale is derived from:
 *  - the filename without extension (e.g. `en.json` → `"en"`), or
 *  - the parent directory name when the file is named something generic
 *    like `messages.json` / `translation.json` inside a locale folder
 *    (e.g. `en/messages.json` → `"en"`).
 */
export async function parseLocaleFiles(
  localesDir: string,
): Promise<Record<string, Record<string, unknown>>> {
  const result: Record<string, Record<string, unknown>> = {};

  const entries = await fs.readdir(localesDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(localesDir, entry.name);

    if (entry.isFile() && entry.name.endsWith('.json')) {
      // e.g. locales/en.json
      const locale = path.basename(entry.name, '.json');
      const content = await fs.readFile(fullPath, 'utf-8');
      result[locale] = JSON.parse(content) as Record<string, unknown>;
    } else if (entry.isDirectory()) {
      // e.g. locales/en/messages.json — read all JSON files inside
      const subEntries = await fs.readdir(fullPath, { withFileTypes: true });
      const locale = entry.name;

      for (const subEntry of subEntries) {
        if (subEntry.isFile() && subEntry.name.endsWith('.json')) {
          const subPath = path.join(fullPath, subEntry.name);
          const content = await fs.readFile(subPath, 'utf-8');
          const parsed = JSON.parse(content) as Record<string, unknown>;
          result[locale] = { ...(result[locale] ?? {}), ...parsed };
        }
      }
    }
  }

  return result;
}
