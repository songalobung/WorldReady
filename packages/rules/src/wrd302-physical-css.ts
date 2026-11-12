import type { Finding, ParsedFile, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD302_META: RuleMeta = {
  id: 'WRD302',
  name: 'Physical CSS direction properties',
  description: 'Detects physical CSS direction properties that should use logical equivalents when targeting RTL locales',
  category: 'rtl',
  defaultSeverity: 'warning',
};

const RTL_LANG_PREFIXES = ['ar', 'he', 'fa', 'ur'];

function hasRtlLocales(context: RuleContext): boolean {
  const allLocales = [
    ...(context.config?.targetLocales || []),
    ...(context.localeData?.targetLocales || []),
  ];
  return allLocales.some(loc =>
    RTL_LANG_PREFIXES.some(
      rtl => loc === rtl || loc.startsWith(`${rtl}-`) || loc.startsWith(`${rtl}_`),
    ),
  );
}

function isCssFile(file: ParsedFile): boolean {
  return (
    file.language === 'css' ||
    file.filePath.endsWith('.css') ||
    file.filePath.endsWith('.scss') ||
    file.filePath.endsWith('.less')
  );
}

const PHYSICAL_PROPERTIES: Record<string, string> = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
  'border-left-width': 'border-inline-start-width',
  'border-right-width': 'border-inline-end-width',
  'border-left-color': 'border-inline-start-color',
  'border-right-color': 'border-inline-end-color',
  'border-left-style': 'border-inline-start-style',
  'border-right-style': 'border-inline-end-style',
  'left': 'inset-inline-start',
  'right': 'inset-inline-end',
};

function checkDeclaration(
  prop: string,
  value: string,
): { message: string; suggestedFix: string } | null {
  const lowerProp = prop.toLowerCase().trim();
  const lowerVal = value.toLowerCase().trim();

  // Direct physical property mapping
  if (PHYSICAL_PROPERTIES[lowerProp]) {
    const logical = PHYSICAL_PROPERTIES[lowerProp];
    return {
      message: `Physical CSS property "${lowerProp}" should use logical alternative "${logical}" for RTL compatibility`,
      suggestedFix: `Replace "${lowerProp}" with "${logical}"`,
    };
  }

  // text-align: left | right
  if (lowerProp === 'text-align') {
    if (lowerVal === 'left') {
      return {
        message: 'Physical CSS value "text-align: left" should use "text-align: start" for RTL compatibility',
        suggestedFix: 'Replace "text-align: left" with "text-align: start"',
      };
    }
    if (lowerVal === 'right') {
      return {
        message: 'Physical CSS value "text-align: right" should use "text-align: end" for RTL compatibility',
        suggestedFix: 'Replace "text-align: right" with "text-align: end"',
      };
    }
  }

  // float: left | right
  if (lowerProp === 'float') {
    if (lowerVal === 'left') {
      return {
        message: 'Physical CSS value "float: left" should use "float: inline-start" for RTL compatibility',
        suggestedFix: 'Replace "float: left" with "float: inline-start"',
      };
    }
    if (lowerVal === 'right') {
      return {
        message: 'Physical CSS value "float: right" should use "float: inline-end" for RTL compatibility',
        suggestedFix: 'Replace "float: right" with "float: inline-end"',
      };
    }
  }

  // clear: left | right
  if (lowerProp === 'clear') {
    if (lowerVal === 'left') {
      return {
        message: 'Physical CSS value "clear: left" should use "clear: inline-start" for RTL compatibility',
        suggestedFix: 'Replace "clear: left" with "clear: inline-start"',
      };
    }
    if (lowerVal === 'right') {
      return {
        message: 'Physical CSS value "clear: right" should use "clear: inline-end" for RTL compatibility',
        suggestedFix: 'Replace "clear: right" with "clear: inline-end"',
      };
    }
  }

  return null;
}

export class WRD302PhysicalCss implements Rule {
  meta = WRD302_META;

  check(context: RuleContext): Finding[] {
    const findings: Finding[] = [];

    // Only flag physical properties when project has RTL target locales
    if (!hasRtlLocales(context)) {
      return findings;
    }

    for (const file of context.files) {
      if (!isCssFile(file)) continue;

      if (file.ast && typeof (file.ast as { walkDecls?: Function }).walkDecls === 'function') {
        (file.ast as { walkDecls: (fn: (decl: any) => void) => void }).walkDecls((decl: any) => {
          if (!decl.prop) return;
          const result = checkDeclaration(decl.prop, decl.value || '');
          if (result) {
            findings.push({
              ruleId: WRD302_META.id,
              severity: WRD302_META.defaultSeverity,
              confidence: 0.85,
              message: result.message,
              file: file.filePath,
              line: decl.source?.start?.line || 1,
              column: decl.source?.start?.column,
              suggestedFix: result.suggestedFix,
              meta: { prop: decl.prop, value: decl.value },
            });
          }
        });
      } else {
        // Fallback: line-by-line regex parsing
        for (let i = 0; i < file.lines.length; i++) {
          const line = file.lines[i];
          const match = /^\s*([a-zA-Z-]+)\s*:\s*([^;]+);?/i.exec(line);
          if (match) {
            const prop = match[1];
            const value = match[2];
            const result = checkDeclaration(prop, value);
            if (result) {
              findings.push({
                ruleId: WRD302_META.id,
                severity: WRD302_META.defaultSeverity,
                confidence: 0.85,
                message: result.message,
                file: file.filePath,
                line: i + 1,
                suggestedFix: result.suggestedFix,
                meta: { prop, value: value.trim() },
              });
            }
          }
        }
      }
    }

    return findings;
  }
}

export const wrd302PhysicalCss = new WRD302PhysicalCss();
