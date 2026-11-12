export * from './types.js';
export * from './json-reporter.js';
export * from './markdown-reporter.js';
export * from './sarif-reporter.js';
export * from './console-reporter.js';

import type { Reporter } from './types.js';
import { jsonReporter } from './json-reporter.js';
import { markdownReporter } from './markdown-reporter.js';
import { sarifReporter } from './sarif-reporter.js';
import { consoleReporter } from './console-reporter.js';

export const allReporters: Reporter[] = [
  jsonReporter,
  markdownReporter,
  sarifReporter,
  consoleReporter,
];

export const reportersByName: Record<string, Reporter> = {
  json: jsonReporter,
  markdown: markdownReporter,
  sarif: sarifReporter,
  console: consoleReporter,
};

export function getReporter(name: string): Reporter | undefined {
  return reportersByName[name];
}
