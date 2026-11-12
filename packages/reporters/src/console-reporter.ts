import type { AuditResult, Finding, Reporter, Severity } from './types.js';

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface SeverityDisplay {
  symbol: string;
  color: string;
}

const severityDisplay: Record<Severity, SeverityDisplay> = {
  error: { symbol: '✖', color: ANSI.red },
  warning: { symbol: '⚠', color: ANSI.yellow },
  suggestion: { symbol: 'ℹ', color: ANSI.blue },
};

export class ConsoleReporter implements Reporter {
  readonly name = 'console';

  format(result: AuditResult): string {
    const lines: string[] = [];

    // Header with summary stats
    lines.push(`${ANSI.bold}WorldReady Audit Report${ANSI.reset}`);
    lines.push(
      `${ANSI.dim}Version: ${result.version} | Timestamp: ${result.timestamp}${ANSI.reset}`,
    );
    lines.push(
      `${ANSI.cyan}Files scanned:${ANSI.reset} ${result.stats.filesScanned}  ${ANSI.cyan}Rules evaluated:${ANSI.reset} ${result.stats.rulesRan}`,
    );
    lines.push('');

    // Group findings by file
    const byFile = new Map<string, Finding[]>();
    for (const finding of result.findings) {
      const list = byFile.get(finding.file) ?? [];
      list.push(finding);
      byFile.set(finding.file, list);
    }

    if (result.findings.length === 0) {
      lines.push(`${ANSI.green}✔ No issues found${ANSI.reset}`);
      lines.push('');
    } else {
      for (const [file, findings] of byFile.entries()) {
        lines.push(`${ANSI.bold}${file}${ANSI.reset}`);
        for (const finding of findings) {
          const display = severityDisplay[finding.severity] ?? severityDisplay.error;
          const pos =
            finding.column !== undefined
              ? `line ${finding.line}:${finding.column}`
              : `line ${finding.line}`;
          lines.push(
            `  ${display.color}${display.symbol} ${finding.ruleId} (${finding.severity})${ANSI.reset} ${pos}: ${finding.message}`,
          );
          if (finding.suggestedFix) {
            lines.push(`    ${ANSI.dim}Suggested fix: ${finding.suggestedFix}${ANSI.reset}`);
          }
        }
        lines.push('');
      }
    }

    // Footer with totals
    const totalIssues =
      result.stats.errors + result.stats.warnings + result.stats.suggestions;
    if (totalIssues === 0) {
      lines.push(`${ANSI.green}✔ All checks passed! 0 issues found.${ANSI.reset}`);
    } else {
      const parts: string[] = [];
      if (result.stats.errors > 0) {
        parts.push(
          `${ANSI.red}${result.stats.errors} error${result.stats.errors === 1 ? '' : 's'}${ANSI.reset}`,
        );
      }
      if (result.stats.warnings > 0) {
        parts.push(
          `${ANSI.yellow}${result.stats.warnings} warning${result.stats.warnings === 1 ? '' : 's'}${ANSI.reset}`,
        );
      }
      if (result.stats.suggestions > 0) {
        parts.push(
          `${ANSI.blue}${result.stats.suggestions} suggestion${result.stats.suggestions === 1 ? '' : 's'}${ANSI.reset}`,
        );
      }
      lines.push(
        `${ANSI.bold}Total: ${totalIssues} issue${totalIssues === 1 ? '' : 's'} (${parts.join(', ')})${ANSI.reset}`,
      );
    }
    lines.push('');

    return lines.join('\n');
  }
}

export const consoleReporter = new ConsoleReporter();
