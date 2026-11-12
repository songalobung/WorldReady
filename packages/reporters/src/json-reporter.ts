import type { AuditResult, Reporter } from './types.js';

export class JsonReporter implements Reporter {
  readonly name = 'json';

  format(result: AuditResult): string {
    return JSON.stringify(result, null, 2);
  }
}

export const jsonReporter = new JsonReporter();
