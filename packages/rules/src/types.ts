export type Severity = 'error' | 'warning' | 'suggestion';

export type RuleCategory =
  | 'source-text'
  | 'translations'
  | 'locale-formatting'
  | 'rtl'
  | 'seo';

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

export interface RuleMeta {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  defaultSeverity: Severity;
  url?: string;
}

export interface Rule {
  meta: RuleMeta;
  check(context: RuleContext): Finding[] | Promise<Finding[]>;
}

export interface ParsedFile {
  filePath: string;
  language: 'typescript' | 'javascript' | 'html' | 'css' | 'json' | 'unknown';
  ast?: unknown;
  rawContent: string;
  lines: string[];
}

export interface RuleContext {
  files: ParsedFile[];
  config: WorldReadyConfig;
  localeData: LocaleData;
}

export interface LocaleData {
  sourceLocale: string;
  targetLocales: string[];
  translations: Record<string, Record<string, unknown>>;
  translationFiles: Record<string, string>;
}

export interface WorldReadyConfig {
  sourceLocale: string;
  targetLocales: string[];
  include: string[];
  exclude: string[];
  localesDir?: string;
  rules: Record<string, RuleConfigEntry>;
  baseline?: string;
}

export interface RuleConfigEntry {
  severity?: Severity;
  enabled?: boolean;
  options?: Record<string, unknown>;
}
