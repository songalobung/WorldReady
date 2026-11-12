import type { Finding, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD103_META: RuleMeta = {
  id: 'WRD103',
  name: 'Placeholder mismatch',
  description: 'Detects missing or unexpected variable placeholders in target locale translations',
  category: 'translations',
  defaultSeverity: 'error',
};

function extractKeyValues(obj: Record<string, unknown>, prefix = ''): Map<string, string> {
  const map = new Map<string, string>();
  if (!obj || typeof obj !== 'object') return map;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      map.set(fullKey, v);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = extractKeyValues(v as Record<string, unknown>, fullKey);
      for (const [nk, nv] of nested.entries()) {
        map.set(nk, nv);
      }
    }
  }
  return map;
}

export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{+([^{}]+)\}+/g);
  if (!matches) return [];
  const set = new Set<string>();
  for (const match of matches) {
    const cleaned = match.replace(/^\{+|\}+$/g, '').trim();
    if (cleaned.length > 0) {
      set.add(cleaned);
    }
  }
  return Array.from(set).sort();
}

export class WRD103PlaceholderMismatch implements Rule {
  meta = WRD103_META;

  check(context: RuleContext): Finding[] {
    const findings: Finding[] = [];

    const sourceLocale = context.localeData?.sourceLocale || context.config?.sourceLocale;
    const targetLocales =
      context.localeData?.targetLocales || context.config?.targetLocales || [];
    const translations = context.localeData?.translations || {};
    const translationFiles = context.localeData?.translationFiles || {};

    if (!sourceLocale || !translations[sourceLocale]) {
      return findings;
    }

    const sourceKeyValues = extractKeyValues(translations[sourceLocale]);

    for (const targetLocale of targetLocales) {
      if (targetLocale === sourceLocale) continue;

      const targetTranslations = translations[targetLocale];
      if (!targetTranslations) continue;

      const targetKeyValues = extractKeyValues(targetTranslations);
      const targetFile =
        translationFiles[targetLocale] || `locales/${targetLocale}.json`;

      for (const [key, sourceVal] of sourceKeyValues.entries()) {
        if (!targetKeyValues.has(key)) continue;

        const targetVal = targetKeyValues.get(key)!;
        const sourcePlaceholders = extractPlaceholders(sourceVal);
        const targetPlaceholders = extractPlaceholders(targetVal);

        const missing = sourcePlaceholders.filter(p => !targetPlaceholders.includes(p));
        const extra = targetPlaceholders.filter(p => !sourcePlaceholders.includes(p));

        if (missing.length > 0 || extra.length > 0) {
          let message = `Placeholder mismatch for key "${key}" in "${targetLocale}"`;
          if (missing.length > 0 && extra.length > 0) {
            message = `Placeholder mismatch for key "${key}" in "${targetLocale}": missing [${missing.join(', ')}], extra [${extra.join(', ')}]`;
          } else if (missing.length > 0) {
            message = `Missing placeholder(s) {${missing.join('}, {')}} in "${targetLocale}" for key "${key}"`;
          } else {
            message = `Extra placeholder(s) {${extra.join('}, {')}} in "${targetLocale}" for key "${key}"`;
          }

          findings.push({
            ruleId: WRD103_META.id,
            severity: WRD103_META.defaultSeverity,
            confidence: 0.95,
            message,
            file: targetFile,
            line: 1,
            locale: targetLocale,
            key,
            suggestedFix:
              sourcePlaceholders.length > 0
                ? `Ensure target translation contains placeholders matching source: {${sourcePlaceholders.join('}, {')}}`
                : 'Remove extra placeholders not present in source translation',
            meta: {
              sourceLocale,
              targetLocale,
              key,
              missing,
              extra,
              sourcePlaceholders,
              targetPlaceholders,
            },
          });
        }
      }
    }

    return findings;
  }
}

export const wrd103PlaceholderMismatch = new WRD103PlaceholderMismatch();
