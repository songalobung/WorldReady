import type { AuditResult, Finding, Reporter, Severity } from './types.js';

export interface SarifArtifactLocation {
  uri: string;
  uriBaseId?: string;
}

export interface SarifRegion {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region: SarifRegion;
}

export interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

export interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: {
    text: string;
  };
  locations: SarifLocation[];
}

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: {
    text: string;
  };
}

export interface SarifDriver {
  name: string;
  version: string;
  rules: SarifRule[];
}

export interface SarifRun {
  tool: {
    driver: SarifDriver;
  };
  results: SarifResult[];
}

export interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

function mapSeverity(severity: Severity): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'suggestion':
      return 'note';
    default:
      return 'warning';
  }
}

export class SarifReporter implements Reporter {
  readonly name = 'sarif';

  format(result: AuditResult): string {
    const seenRules = new Set<string>();
    const rules: SarifRule[] = [];

    for (const finding of result.findings) {
      if (!seenRules.has(finding.ruleId)) {
        seenRules.add(finding.ruleId);
        rules.push({
          id: finding.ruleId,
          name: finding.ruleId,
          shortDescription: {
            text: `Rule ${finding.ruleId}`,
          },
        });
      }
    }

    if (result.config?.rules) {
      for (const ruleId of Object.keys(result.config.rules)) {
        if (!seenRules.has(ruleId)) {
          seenRules.add(ruleId);
          rules.push({
            id: ruleId,
            name: ruleId,
            shortDescription: {
              text: `Rule ${ruleId}`,
            },
          });
        }
      }
    }

    const results: SarifResult[] = result.findings.map((finding: Finding) => {
      const region: SarifRegion = {
        startLine: finding.line,
      };

      if (finding.column !== undefined) {
        region.startColumn = finding.column;
      }
      if (finding.endLine !== undefined) {
        region.endLine = finding.endLine;
      }
      if (finding.endColumn !== undefined) {
        region.endColumn = finding.endColumn;
      }

      return {
        ruleId: finding.ruleId,
        level: mapSeverity(finding.severity),
        message: {
          text: finding.message,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: finding.file.replace(/\\/g, '/'),
              },
              region,
            },
          },
        ],
      };
    });

    const sarif: SarifLog = {
      $schema:
        'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'WorldReady',
              version: result.version || '0.1.0',
              rules,
            },
          },
          results,
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }
}

export const sarifReporter = new SarifReporter();
