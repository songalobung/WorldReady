export type Severity = 'error' | 'warning' | 'suggestion';

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

export interface RuleConfigEntry {
  severity?: Severity;
  enabled?: boolean;
  options?: Record<string, unknown>;
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

export interface Reporter {
  name: string;
  format(result: AuditResult): string | Promise<string>;
}
