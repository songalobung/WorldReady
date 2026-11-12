import type { PseudoLocale, PseudoOptions } from './types.js';
import { pseudoLocalize } from './transform.js';

/**
 * Recursively transforms nested objects of translation strings into pseudo-localized strings.
 *
 * @param sourceData The source translation dictionary (nested objects, strings, arrays)
 * @param targetLocale The target pseudo-locale ('en-XA' or 'ar-XB')
 * @param options Optional pseudo-localization options
 * @returns A new dictionary with all string values pseudo-localized
 */
export function transformLocaleData(
  sourceData: Record<string, unknown>,
  targetLocale: 'en-XA' | 'ar-XB' | PseudoLocale = 'en-XA',
  options?: PseudoOptions
): Record<string, unknown> {
  if (sourceData === null || typeof sourceData !== 'object' || Array.isArray(sourceData)) {
    return sourceData as Record<string, unknown>;
  }

  function transformValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return pseudoLocalize(value, targetLocale, options);
    }
    if (Array.isArray(value)) {
      return value.map(transformValue);
    }
    if (value !== null && typeof value === 'object') {
      const nested: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        nested[k] = transformValue(v);
      }
      return nested;
    }
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sourceData)) {
    result[key] = transformValue(value);
  }
  return result;
}
