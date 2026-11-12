import type {
  AuditResult,
  Finding,
  LocaleData,
  ParsedFile,
  Reporter,
  Rule,
  RuleContext,
  WorldReadyConfig,
} from './types.js';

/**
 * The central audit engine.
 *
 * Register rules and reporters, then call `audit()` to run all enabled rules
 * against a set of parsed files and receive a consolidated `AuditResult`.
 */
export class AuditEngine {
  private readonly rules: Rule[] = [];
  private readonly reporters: Reporter[] = [];

  /** Register a rule to be run during audits. */
  registerRule(rule: Rule): void {
    this.rules.push(rule);
  }

  /** Register a reporter that can format audit results. */
  registerReporter(reporter: Reporter): void {
    this.reporters.push(reporter);
  }

  /** Return all registered reporters. */
  getReporters(): readonly Reporter[] {
    return this.reporters;
  }

  /**
   * Run every enabled rule against the provided files and return a full
   * `AuditResult` with sorted findings and computed statistics.
   */
  async audit(
    files: ParsedFile[],
    config: WorldReadyConfig,
    localeData: LocaleData,
  ): Promise<AuditResult> {
    const context: RuleContext = { files, config, localeData };

    // Determine which rules are enabled
    const enabledRules = this.rules.filter((rule) => {
      const entry = config.rules[rule.meta.id];
      // A rule is enabled unless explicitly disabled
      if (entry?.enabled === false) return false;
      return true;
    });

    // Run all enabled rules (in parallel)
    const results = await Promise.all(
      enabledRules.map((rule) => rule.check(context)),
    );

    // Flatten and apply severity overrides
    const findings: Finding[] = results.flat().map((finding) => {
      const entry = config.rules[finding.ruleId];
      if (entry?.severity) {
        return { ...finding, severity: entry.severity };
      }
      return finding;
    });

    // Sort by file path, then line number
    findings.sort((a, b) => {
      const fileCmp = a.file.localeCompare(b.file);
      if (fileCmp !== 0) return fileCmp;
      return a.line - b.line;
    });

    // Compute stats
    const stats = {
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      suggestions: findings.filter((f) => f.severity === 'suggestion').length,
      filesScanned: files.length,
      rulesRan: enabledRules.length,
    };

    return {
      findings,
      stats,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      config,
    };
  }
}
