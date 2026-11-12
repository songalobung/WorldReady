/**
 * Severity levels for audit findings.
 */
export type Severity = 'error' | 'warning' | 'suggestion';

/**
 * Core audit finding — a single issue discovered during an audit run.
 */
export interface Finding {
  ruleId: string;
  severity: Severity;
  confidence: number;
  message: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  locale?: string;
  key?: string;
  suggestedFix?: string;
  meta?: Record<string, unknown>;
}

/**
 * Categories that a rule can belong to.
 */
export type RuleCategory =
  | 'source-text'
  | 'translations'
  | 'locale-formatting'
  | 'rtl'
  | 'seo';

/**
 * Static metadata describing a rule.
 */
export interface RuleMeta {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  defaultSeverity: Severity;
  url?: string;
}

/**
 * A rule that can inspect files and produce findings.
 */
export interface Rule {
  meta: RuleMeta;
  check(context: RuleContext): Finding[] | Promise<Finding[]>;
}

/**
 * A parsed source file ready for rule inspection.
 */
export interface ParsedFile {
  filePath: string;
  language:
    | 'typescript'
    | 'javascript'
    | 'html'
    | 'css'
    | 'json'
    | 'unknown';
  ast?: unknown;
  rawContent: string;
  lines: string[];
}

/**
 * Context passed to every rule's `check` method.
 */
export interface RuleContext {
  files: ParsedFile[];
  config: WorldReadyConfig;
  localeData: LocaleData;
}

/**
 * Locale / translation data available during an audit.
 */
export interface LocaleData {
  sourceLocale: string;
  targetLocales: string[];
  translations: Record<string, Record<string, unknown>>;
  translationFiles: Record<string, string>;
}

/**
 * Top-level WorldReady configuration.
 */
export interface WorldReadyConfig {
  sourceLocale: string;
  targetLocales: string[];
  include: string[];
  exclude: string[];
  localesDir?: string;
  rules: Record<string, RuleConfigEntry>;
  baseline?: string;
}

/**
 * Per-rule configuration override.
 */
export interface RuleConfigEntry {
  severity?: Severity;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

/**
 * The result of a full audit run.
 */
export interface AuditResult {
  findings: Finding[];
  stats: {
    errors: number;
    warnings: number;
    suggestions: number;
    filesScanned: number;
    rulesRan: number;
  };
  timestamp: string;
  version: string;
  config: WorldReadyConfig;
}

/**
 * A reporter that serialises an AuditResult into a specific format.
 */
export interface Reporter {
  name: string;
  format(result: AuditResult): string | Promise<string>;
}
