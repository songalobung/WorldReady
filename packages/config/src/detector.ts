import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { access } from 'node:fs/promises';

interface FrameworkDetection {
  framework: string;
  localesDir?: string;
}

const FRAMEWORK_DEPS: [string[], string][] = [
  [['next-intl'], 'next-intl'],
  [['i18next', 'react-i18next', 'next-i18next'], 'i18next'],
  [['react-intl', '@formatjs/intl'], 'formatjs'],
  [['vue-i18n'], 'vue-i18n'],
  [['svelte-i18n'], 'svelte-i18n'],
];

const COMMON_LOCALE_DIRS = [
  'public/locales',
  'src/locales',
  'locales',
  'messages',
  'lang',
  'src/i18n',
  'i18n',
  'translations',
  'src/translations',
  'public/lang',
];

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath);
    return true;
  } catch {
    return false;
  }
}

async function detectLocalesDir(cwd: string): Promise<string | undefined> {
  for (const dir of COMMON_LOCALE_DIRS) {
    const fullPath = join(cwd, dir);
    if (await directoryExists(fullPath)) {
      return dir;
    }
  }
  return undefined;
}

export async function detectFramework(
  cwd?: string,
): Promise<FrameworkDetection> {
  const root = cwd ?? process.cwd();

  let deps: Record<string, string> = {};
  try {
    const raw = await readFile(join(root, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    // No package.json or unreadable — fall through to "unknown"
  }

  let framework = 'unknown';
  for (const [packages, name] of FRAMEWORK_DEPS) {
    if (packages.some((pkg) => pkg in deps)) {
      framework = name;
      break;
    }
  }

  const localesDir = await detectLocalesDir(root);

  return { framework, localesDir };
}
