export type Severity = 'error' | 'warning' | 'suggestion';

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
