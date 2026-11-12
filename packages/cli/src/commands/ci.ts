import type { AuditResult } from '@worldready/core';
import { auditCommand, type AuditCommandOptions } from './audit.js';

export async function ciCommand(options: AuditCommandOptions = {}): Promise<AuditResult> {
  const result = await auditCommand({
    format: options.format ?? 'sarif',
    ...options,
  });

  // Strict CI exit code: exit 1 on any error findings
  if (result.stats.errors > 0) {
    process.exitCode = 1;
  }

  return result;
}

