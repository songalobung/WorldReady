import { glob } from 'glob';

/**
 * Discover files matching the given glob patterns, excluding any paths
 * that match the exclude patterns.
 */
export async function discoverFiles(
  patterns: string[],
  excludePatterns: string[],
  cwd: string,
): Promise<string[]> {
  const files = await glob(patterns, {
    cwd,
    ignore: excludePatterns,
    absolute: true,
    nodir: true,
  });

  return files.sort();
}
