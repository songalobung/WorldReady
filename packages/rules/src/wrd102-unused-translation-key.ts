import type { Finding, ParsedFile, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD102_META: RuleMeta = {
  id: 'WRD102',
  name: 'Unused translation key',
  description: 'Detects translation keys defined in locale files that are never referenced in source code',
  category: 'translations',
  defaultSeverity: 'suggestion',
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

function isSourceCodeFile(file: ParsedFile): boolean {
  return (
    file.language === 'typescript' ||
    file.language === 'javascript' ||
    file.filePath.endsWith('.ts') ||
    file.filePath.endsWith('.tsx') ||
    file.filePath.endsWith('.js') ||
    file.filePath.endsWith('.jsx') ||
    file.filePath.endsWith('.svelte') ||
    file.filePath.endsWith('.vue')
  );
}

export class WRD102UnusedTranslationKey implements Rule {
  meta = WRD102_META;

  check(context: RuleContext): Finding[] {
    const findings: Finding[] = [];

    const sourceLocale = context.localeData?.sourceLocale || context.config?.sourceLocale;
    const translations = context.localeData?.translations || {};
    const translationFiles = context.localeData?.translationFiles || {};

    if (!sourceLocale || !translations[sourceLocale]) {
      return findings;
    }

    const sourceKeys = extractKeys(translations[sourceLocale]);
    const sourceFiles = context.files.filter(isSourceCodeFile);
    const sourceTranslationFile =
      translationFiles[sourceLocale] || `locales/${sourceLocale}.json`;

    // Try finding the parsed translation file for line number lookups
    const parsedTransFile = context.files.find(
      f => f.filePath === sourceTranslationFile || f.filePath.endsWith(`/${sourceLocale}.json`),
    );

    for (const key of sourceKeys) {
      // Check if key string appears in any JS/TS source file rawContent
      const isReferenced = sourceFiles.some(file => file.rawContent.includes(key));

      if (!isReferenced) {
        let line = 1;
        if (parsedTransFile) {
          const leafKey = key.split('.').pop() || key;
          const foundIdx = parsedTransFile.lines.findIndex(
            l => l.includes(`"${key}"`) || l.includes(`"${leafKey}"`),
          );
          if (foundIdx >= 0) {
            line = foundIdx + 1;
          }
        }

        findings.push({
          ruleId: WRD102_META.id,
          severity: WRD102_META.defaultSeverity,
          confidence: 0.7,
          message: `Translation key "${key}" appears to be unused in source code`,
          file: sourceTranslationFile,
          line,
          locale: sourceLocale,
          key,
          suggestedFix: `Remove unused key "${key}" if no longer needed`,
          meta: { sourceLocale, key },
        });
      }
    }

    return findings;
  }
}

export const wrd102UnusedTranslationKey = new WRD102UnusedTranslationKey();
