import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import type { Finding } from './types.js';

/**
 * Create a deterministic SHA-256 fingerprint for a finding based on its
 * ruleId, file path, and message. This lets us recognise the "same" finding
 * across successive audit runs even when line numbers shift.
 */
export function createFingerprint(finding: Finding): string {
  const data = `${finding.ruleId}\0${finding.file}\0${finding.message}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Persist a set of finding fingerprints to disk so that future runs can
 * suppress already-known issues.
 */
export async function saveBaseline(
  findings: Finding[],
  path: string,
): Promise<void> {
  const fingerprints = findings.map(createFingerprint);
  await writeFile(path, JSON.stringify(fingerprints, null, 2), 'utf-8');
}

/**
 * Load a previously saved baseline from disk.
 * Returns an empty array when the file does not exist.
 */
export async function loadBaseline(path: string): Promise<string[]> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Filter out findings whose fingerprints already appear in the baseline,
 * returning only genuinely new findings.
 */
export function filterNewFindings(
  findings: Finding[],
  baseline: string[],
): Finding[] {
  const baselineSet = new Set(baseline);
  return findings.filter((f) => !baselineSet.has(createFingerprint(f)));
}
