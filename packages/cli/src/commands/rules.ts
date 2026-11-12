import '../polyfill.js';
import type { RuleMeta } from '@worldready/core';

export interface RulesCommandOptions {
  json?: boolean;
  category?: string;
  stdout?: (msg: string) => void;
}

export function formatRulesTable(rules: RuleMeta[]): string {
  const headers = ['ID', 'Category', 'Severity', 'Name', 'Description'];
  const rows = rules.map((r) => [
    r.id,
    r.category,
    r.defaultSeverity,
    r.name,
    r.description,
  ]);

  // Compute column widths
  const colWidths = headers.map((header, colIdx) => {
    let max = header.length;
    for (const row of rows) {
      const len = row[colIdx]?.length ?? 0;
      if (len > max) max = len;
    }
    return max;
  });

  // Limit Description width to 60 for clean terminal display
  colWidths[4] = Math.min(colWidths[4] || 60, 60);

  const pad = (str: string, width: number) => {
    if (str.length > width) return str.slice(0, width - 3) + '...';
    return str.padEnd(width);
  };

  const headerLine = headers.map((h, i) => pad(h, colWidths[i]!)).join('  ');
  const separatorLine = colWidths.map((w) => '─'.repeat(w)).join('  ');
  const dataLines = rows.map((row) =>
    row.map((cell, i) => pad(cell, colWidths[i]!)).join('  '),
  );

  return [headerLine, separatorLine, ...dataLines].join('\n');
}

export async function rulesCommand(options: RulesCommandOptions = {}): Promise<RuleMeta[]> {
  const { allRules } = await import('@worldready/rules');
  let metas = allRules.map((r) => r.meta);

  if (options.category) {
    metas = metas.filter((m) => m.category.toLowerCase() === options.category!.toLowerCase());
  }

  const print = options.stdout ?? console.log;

  if (options.json) {
    print(JSON.stringify(metas, null, 2));
  } else {
    print(formatRulesTable(metas));
  }

  return metas;
}
