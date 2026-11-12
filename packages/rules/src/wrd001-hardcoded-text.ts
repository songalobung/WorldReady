import ts from 'typescript';
import type { Finding, Rule, RuleContext, RuleMeta } from './types.js';

export const WRD001_META: RuleMeta = {
  id: 'WRD001',
  name: 'Hard-coded UI text',
  description: 'Detects hard-coded user-facing text in JSX/TSX elements and UI attributes that should be localized',
  category: 'source-text',
  defaultSeverity: 'warning',
};

const UI_ATTRIBUTES = new Set(['title', 'placeholder', 'aria-label', 'alt']);

function isUrl(str: string): boolean {
  return /^(https?:\/\/|\/|#|mailto:|tel:|[a-zA-Z0-9_-]+\.[a-z]{2,4}(\/.*)?$)/.test(str);
}

function isCssClassOrIdentifier(str: string): boolean {
  // Pure kebab-case or BEM-like class strings, tailwind classes, etc.
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(str) && !str.includes(' ')) {
    return true;
  }
  return false;
}

function hasMeaningfulText(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length === 0) return false;
  // If it contains no letters, it's just punctuation, numbers, or symbols
  if (!/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) return false;
  // Exclude URLs
  if (isUrl(trimmed)) return false;
  return true;
}

function isExcludedContext(node: ts.Node): boolean {
  let curr: ts.Node | undefined = node.parent;
  while (curr) {
    // Import declaration
    if (ts.isImportDeclaration(curr) || ts.isImportEqualsDeclaration(curr) || ts.isExportDeclaration(curr)) {
      return true;
    }
    // Type annotation / type reference
    if (ts.isTypeNode(curr)) {
      return true;
    }
    // console.log / console.error call
    if (ts.isCallExpression(curr)) {
      const expr = curr.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        if (ts.isIdentifier(expr.expression) && expr.expression.text === 'console') {
          return true;
        }
      }
    }
    curr = curr.parent;
  }
  return false;
}

export class WRD001HardcodedText implements Rule {
  meta = WRD001_META;

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
        if (isExcludedContext(node)) {
          return;
        }

        // Case 1: JSX Text child of JSX Element or Fragment
        if (ts.isJsxText(node)) {
          const rawText = node.getText(sourceFile);
          const trimmed = rawText.trim();
          if (hasMeaningfulText(trimmed)) {
            const offset = rawText.indexOf(trimmed);
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(
              node.getStart(sourceFile) + (offset >= 0 ? offset : 0),
            );
            findings.push({
              ruleId: WRD001_META.id,
              severity: WRD001_META.defaultSeverity,
              confidence: 0.85,
              message: `Hard-coded text "${trimmed}" should be localized`,
              file: file.filePath,
              line: line + 1,
              column: character + 1,
              suggestedFix: `Replace "${trimmed}" with localized translation call`,
              meta: { text: trimmed, context: 'jsx-text' },
            });
          }
        }

        // Case 2: String literal child inside JSX expression, e.g. <span>{'Hello world'}</span>
        if (
          ts.isStringLiteral(node) &&
          node.parent &&
          ts.isJsxExpression(node.parent) &&
          node.parent.parent &&
          (ts.isJsxElement(node.parent.parent) || ts.isJsxFragment(node.parent.parent))
        ) {
          const text = node.text;
          if (hasMeaningfulText(text) && !isCssClassOrIdentifier(text)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(
              node.getStart(sourceFile),
            );
            findings.push({
              ruleId: WRD001_META.id,
              severity: WRD001_META.defaultSeverity,
              confidence: 0.85,
              message: `Hard-coded text "${text}" should be localized`,
              file: file.filePath,
              line: line + 1,
              column: character + 1,
              suggestedFix: `Replace "${text}" with localized translation call`,
              meta: { text, context: 'jsx-text-expression' },
            });
          }
        }

        // Case 3: JSX Attribute values for title, placeholder, aria-label, alt
        if (ts.isJsxAttribute(node)) {
          const attrName = (
            ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile)
          ).toLowerCase();
          if (UI_ATTRIBUTES.has(attrName)) {
            let stringNode: ts.StringLiteral | null = null;
            if (node.initializer) {
              if (ts.isStringLiteral(node.initializer)) {
                stringNode = node.initializer;
              } else if (
                ts.isJsxExpression(node.initializer) &&
                node.initializer.expression &&
                ts.isStringLiteral(node.initializer.expression)
              ) {
                stringNode = node.initializer.expression;
              }
            }

            if (stringNode) {
              const text = stringNode.text;
              if (hasMeaningfulText(text) && !isCssClassOrIdentifier(text)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(
                  stringNode.getStart(sourceFile),
                );
                findings.push({
                  ruleId: WRD001_META.id,
                  severity: WRD001_META.defaultSeverity,
                  confidence: 0.75,
                  message: `Hard-coded UI attribute "${attrName}" value "${text}" should be localized`,
                  file: file.filePath,
                  line: line + 1,
                  column: character + 1,
                  suggestedFix: `Use localized translation call for attribute "${attrName}"`,
                  meta: { text, attribute: attrName, context: 'jsx-attribute' },
                });
              }
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

export const wrd001HardcodedText = new WRD001HardcodedText();
