import ts from 'typescript';
import type { Finding, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD002_META: RuleMeta = {
  id: 'WRD002',
  name: 'Dynamic text concatenation',
  description: 'Detects string concatenation and template literals mixing text with variables in UI context',
  category: 'source-text',
  defaultSeverity: 'warning',
};

function isInsideJsx(node: ts.Node): boolean {
  let curr: ts.Node | undefined = node.parent;
  while (curr) {
    if (ts.isJsxExpression(curr)) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function containsStringLiteralWithText(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(node.text);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return containsStringLiteralWithText(node.left) || containsStringLiteralWithText(node.right);
  }
  return false;
}

function containsDynamicVariable(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return false;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return containsDynamicVariable(node.left) || containsDynamicVariable(node.right);
  }
  // Any identifier, property access, call expression, etc. is dynamic
  return true;
}

export class WRD002TextConcatenation implements Rule {
  meta = WRD002_META;

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
        // Case 1: Template literals with substitutions in JSX context: {`Hello ${name}`}
        if (ts.isTemplateExpression(node) && isInsideJsx(node)) {
          const hasLiteralText =
            /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(node.head.text) ||
            node.templateSpans.some(span =>
              /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(span.literal.text),
            );

          if (hasLiteralText && node.templateSpans.length > 0) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(
              node.getStart(sourceFile),
            );
            const textPreview = node.getText(sourceFile);
            findings.push({
              ruleId: WRD002_META.id,
              severity: WRD002_META.defaultSeverity,
              confidence: 0.8,
              message: `Template literal mixing text and expressions in UI context: ${textPreview}`,
              file: file.filePath,
              line: line + 1,
              column: character + 1,
              suggestedFix: 'Use a parameterized translation key instead of template literal concatenation',
              meta: { expression: textPreview, type: 'template-expression' },
            });
          }
        }

        // Case 2: Binary "+" concatenation in JSX context: {"Hello " + name}
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
          isInsideJsx(node)
        ) {
          // Avoid duplicate sub-expression warnings: only check root binary + expression
          const parentIsPlus =
            node.parent &&
            ts.isBinaryExpression(node.parent) &&
            node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken;

          if (!parentIsPlus) {
            const hasString = containsStringLiteralWithText(node);
            const hasVar = containsDynamicVariable(node);

            if (hasString && hasVar) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              );
              const textPreview = node.getText(sourceFile);
              findings.push({
                ruleId: WRD002_META.id,
                severity: WRD002_META.defaultSeverity,
                confidence: 0.8,
                message: `String concatenation mixing text and variables in UI context: ${textPreview}`,
                file: file.filePath,
                line: line + 1,
                column: character + 1,
                suggestedFix: 'Use a parameterized translation key (e.g. t("key", { param })) instead of concatenation',
                meta: { expression: textPreview, type: 'binary-concatenation' },
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

export const wrd002TextConcatenation = new WRD002TextConcatenation();
