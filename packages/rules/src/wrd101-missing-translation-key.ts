import type { Finding, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD101_META: RuleMeta = {
  id: 'WRD101',
  name: 'Missing translation key',
  description: 'Detects translation keys present in source locale but missing in target locales',
  category: 'translations',
  defaultSeverity: 'error',
};

function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  if (!obj || typeof obj !== 'object') return keys;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...extractKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function hasKey(obj: Record<string, unknown>, key: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (key in obj) return true;
  const parts = key.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  return current !== undefined;
}

export class WRD101MissingTranslationKey implements Rule {
  meta = WRD101_META;

  check(context: RuleContext): Finding[] {
    const findings: Finding[] = [];

    const sourceLocale = context.localeData?.sourceLocale || context.config?.sourceLocale;
    const targetLocales =
      context.localeData?.targetLocales || context.config?.targetLocales || [];
    const translations = context.localeData?.translations || {};
    const translationFiles = context.localeData?.translationFiles || {};

    if (!sourceLocale) {
      return findings;
    }

    const sourceTranslations = translations[sourceLocale];
    if (!sourceTranslations) {
      return findings;
    }

    const sourceKeys = extractKeys(sourceTranslations);

    for (const targetLocale of targetLocales) {
      if (targetLocale === sourceLocale) continue;

      const targetTranslations = translations[targetLocale] || {};
      const targetFile =
        translationFiles[targetLocale] || `locales/${targetLocale}.json`;

      for (const key of sourceKeys) {
        if (!hasKey(targetTranslations, key)) {
          findings.push({
            ruleId: WRD101_META.id,
            severity: WRD101_META.defaultSeverity,
            confidence: 0.98,
            message: `Missing translation key "${key}" for locale "${targetLocale}"`,
            file: targetFile,
            line: 1,
            locale: targetLocale,
            key,
            suggestedFix: `Add translation for "${key}" in ${targetFile}`,
            meta: { sourceLocale, targetLocale, key },
          });
        }
      }
    }

    return findings;
  }
}

export const wrd101MissingTranslationKey = new WRD101MissingTranslationKey();
