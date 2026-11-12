import ts from 'typescript';
import type { Finding, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD401_META: RuleMeta = {
  id: 'WRD401',
  name: 'Locale-insensitive formatting',
  description: 'Detects locale-insensitive date, time, and number formatting methods',
  category: 'locale-formatting',
  defaultSeverity: 'warning',
};

const CURRENCY_KEYWORDS = new Set([
  'price',
  'cost',
  'amount',
  'total',
  'balance',
  'currency',
  'fee',
  'rate',
  'salary',
  'revenue',
  'tax',
  'subtotal',
  'payment',
]);

function isInsideJsx(node: ts.Node): boolean {
  let curr: ts.Node | undefined = node.parent;
  while (curr) {
    if (ts.isJsxElement(curr) || ts.isJsxFragment(curr) || ts.isJsxAttribute(curr)) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function hasCurrencyContext(node: ts.CallExpression): boolean {
  // 1. Inside JSX
  if (isInsideJsx(node)) {
    return true;
  }

  // 2. Caller expression name
  if (ts.isPropertyAccessExpression(node.expression)) {
    const callerText = node.expression.expression.getText().toLowerCase();
    for (const kw of CURRENCY_KEYWORDS) {
      if (callerText.includes(kw)) {
        return true;
      }
    }
  }

  // 3. Parent is concatenation with currency symbol
  if (node.parent && ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const parentText = node.parent.getText();
    if (/[\$€£¥₹]/.test(parentText)) {
      return true;
    }
  }

  // 4. Inside template literal with currency symbol
  if (node.parent && ts.isTemplateSpan(node.parent) && node.parent.parent) {
    const tplText = node.parent.parent.getText();
    if (/[\$€£¥₹]/.test(tplText)) {
      return true;
    }
  }

  return false;
}

export class WRD401LocaleInsensitiveFormatting implements Rule {
  meta = WRD401_META;

  check(context: RuleContext): Finding[] {
    const findings: Finding[] = [];

    for (const file of context.files) {
      if (
        file.language !== 'typescript' &&
        file.language !== 'javascript' &&
        !file.filePath.endsWith('.tsx') &&
        !file.filePath.endsWith('.jsx') &&
        !file.filePath.endsWith('.ts') &&
        !file.filePath.endsWith('.js')
      ) {
        continue;
      }

      const sourceFile: ts.SourceFile =
        file.ast && (file.ast as ts.SourceFile).kind === ts.SyntaxKind.SourceFile
          ? (file.ast as ts.SourceFile)
          : ts.createSourceFile(
              file.filePath,
              file.rawContent,
              ts.ScriptTarget.Latest,
              /* setParentNodes */ true,
              ts.ScriptKind.TSX,
            );

      const walk = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          if (ts.isPropertyAccessExpression(node.expression)) {
            const methodName = node.expression.name.text;

            // Detection 1: toLocaleDateString() or toLocaleString() without arguments
            if (
              (methodName === 'toLocaleDateString' ||
                methodName === 'toLocaleString' ||
                methodName === 'toLocaleTimeString') &&
              node.arguments.length === 0
            ) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              );
              findings.push({
                ruleId: WRD401_META.id,
                severity: WRD401_META.defaultSeverity,
                confidence: 0.75,
                message: `"${methodName}()" called without explicit locale argument`,
                file: file.filePath,
                line: line + 1,
                column: character + 1,
                suggestedFix: `Pass explicit locale to ${methodName}(locale, options) or use Intl.DateTimeFormat`,
                meta: { method: methodName },
              });
            }

            // Detection 2: new Date().toISOString() used in UI context (in JSX)
            if (methodName === 'toISOString' && isInsideJsx(node)) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              );
              findings.push({
                ruleId: WRD401_META.id,
                severity: WRD401_META.defaultSeverity,
                confidence: 0.75,
                message: 'toISOString() used in UI context; format dates using Intl.DateTimeFormat or localized date formatter',
                file: file.filePath,
                line: line + 1,
                column: character + 1,
                suggestedFix: 'Use Intl.DateTimeFormat or a localized date formatting library instead of toISOString()',
                meta: { method: 'toISOString', context: 'jsx' },
              });
            }

            // Detection 3: .toFixed() for currency display without Intl.NumberFormat
            if (methodName === 'toFixed' && hasCurrencyContext(node)) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              );
              findings.push({
                ruleId: WRD401_META.id,
                severity: WRD401_META.defaultSeverity,
                confidence: 0.75,
                message: 'Number.toFixed() used for UI or currency display without Intl.NumberFormat',
                file: file.filePath,
                line: line + 1,
                column: character + 1,
                suggestedFix: 'Use Intl.NumberFormat for locale-aware currency and number formatting',
                meta: { method: 'toFixed', context: 'currency-or-ui' },
              });
            }
          }
        }

        ts.forEachChild(node, walk);
      };

      walk(sourceFile);
    }

    return findings;
  }
}

export const wrd401LocaleInsensitiveFormatting = new WRD401LocaleInsensitiveFormatting();
