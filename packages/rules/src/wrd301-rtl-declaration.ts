import type { Finding, ParsedFile, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD301_META: RuleMeta = {
  id: 'WRD301',
  name: 'RTL declaration issue',
  description: 'Detects missing HTML dir attributes and hardcoded CSS direction properties when targeting RTL locales',
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

function isHtmlFile(file: ParsedFile): boolean {
  return (
    file.language === 'html' ||
    file.filePath.endsWith('.html') ||
    file.filePath.endsWith('.htm')
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

export class WRD301RtlDeclaration implements Rule {
  meta = WRD301_META;

  check(context: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const isRtlProject = hasRtlLocales(context);

    for (const file of context.files) {
      // Check 1: HTML files missing dir attribute when project targets RTL locales
      if (isHtmlFile(file) && isRtlProject) {
        // Find <html> opening tag
        const htmlTagRegex = /<html\b([^>]*)>/i;
        const match = htmlTagRegex.exec(file.rawContent);
        if (match) {
          const attributesStr = match[1];
          const hasDir = /\bdir\s*=/i.test(attributesStr);
          if (!hasDir) {
            // Find line number of <html tag
            let lineNum = 1;
            for (let i = 0; i < file.lines.length; i++) {
              if (/<html\b/i.test(file.lines[i])) {
                lineNum = i + 1;
                break;
              }
            }

            findings.push({
              ruleId: WRD301_META.id,
              severity: WRD301_META.defaultSeverity,
              confidence: 0.9,
              message: '<html> element is missing "dir" attribute in project targeting RTL locales',
              file: file.filePath,
              line: lineNum,
              suggestedFix: 'Add dir="ltr" (or dynamic dir attribute like dir={isRtl ? "rtl" : "ltr"}) to <html> tag',
              meta: { tag: match[0] },
            });
          }
        }
      }

      // Check 2: CSS files using hardcoded direction property
      if (isCssFile(file)) {
        if (file.ast && typeof (file.ast as { walkDecls?: Function }).walkDecls === 'function') {
          (file.ast as { walkDecls: (fn: (decl: any) => void) => void }).walkDecls((decl: any) => {
            if (decl.prop && decl.prop.toLowerCase() === 'direction') {
              const line = decl.source?.start?.line || 1;
              const column = decl.source?.start?.column;
              findings.push({
                ruleId: WRD301_META.id,
                severity: WRD301_META.defaultSeverity,
                confidence: 0.9,
                message: `Avoid hardcoded CSS "direction: ${decl.value}"; prefer document-level "dir" attribute or CSS logical properties`,
                file: file.filePath,
                line,
                column,
                suggestedFix: 'Remove hardcoded "direction" property and rely on HTML dir attribute or logical properties',
                meta: { prop: decl.prop, value: decl.value },
              });
            }
          });
        } else {
          // Fallback line-by-line regex
          for (let i = 0; i < file.lines.length; i++) {
            const line = file.lines[i];
            const match = /^\s*direction\s*:\s*([^;]+);?/i.exec(line);
            if (match) {
              findings.push({
                ruleId: WRD301_META.id,
                severity: WRD301_META.defaultSeverity,
                confidence: 0.9,
                message: `Avoid hardcoded CSS "direction: ${match[1].trim()}"; prefer document-level "dir" attribute or CSS logical properties`,
                file: file.filePath,
                line: i + 1,
                suggestedFix: 'Remove hardcoded "direction" property and rely on HTML dir attribute or logical properties',
                meta: { value: match[1].trim() },
              });
            }
          }
        }
      }
    }

    return findings;
  }
}

export const wrd301RtlDeclaration = new WRD301RtlDeclaration();
