import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const g = globalThis as Record<string, unknown>;
if (typeof g.require === 'undefined') {
  g.require = createRequire(import.meta.url);
}
if (typeof g.__filename === 'undefined') {
  g.__filename = fileURLToPath(import.meta.url);
}
if (typeof g.__dirname === 'undefined') {
  g.__dirname = dirname(fileURLToPath(import.meta.url));
}

