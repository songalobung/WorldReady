import { describe, it, expect } from 'vitest';
import {
  wrd001HardcodedText,
  wrd002TextConcatenation,
  wrd101MissingTranslationKey,
  wrd102UnusedTranslationKey,
  wrd103PlaceholderMismatch,
  wrd301RtlDeclaration,
  wrd302PhysicalCss,
  wrd401LocaleInsensitiveFormatting,
  allRules,
} from './index.js';
import type { ParsedFile, RuleContext, WorldReadyConfig } from './types.js';

function createMockConfig(overrides: Partial<WorldReadyConfig> = {}): WorldReadyConfig {
  return {
    sourceLocale: 'en',
    targetLocales: ['es', 'ar'],
    include: ['**/*'],
    exclude: ['node_modules/**'],
    rules: {},
    ...overrides,
  };
}

function createMockFile(
  filePath: string,
  rawContent: string,
  language: ParsedFile['language'] = 'typescript',
): ParsedFile {
  return {
    filePath,
    rawContent,
    language,
    lines: rawContent.split('\n'),
  };
}

describe('WRD001: Hard-coded UI text', () => {
  it('1. A JSX file with hardcoded text → should find it', () => {
    const file = createMockFile(
      'src/components/Header.tsx',
      `export function Header() {
        return (
          <div>
            <h1>Welcome to WorldReady</h1>
            <input type="text" placeholder="Search items..." />
          </div>
        );
      }`,
    );

    const context: RuleContext = {
      files: [file],
      config: createMockConfig(),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd001HardcodedText.check(context);
    expect(findings.length).toBeGreaterThan(0);
    const textFinding = findings.find(f => f.message.includes('Welcome to WorldReady'));
    expect(textFinding).toBeDefined();
    expect(textFinding?.confidence).toBe(0.85);

    const attrFinding = findings.find(f => f.message.includes('Search items...'));
    expect(attrFinding).toBeDefined();
    expect(attrFinding?.confidence).toBe(0.75);
  });

  it('2. A file with only translated t() calls → should find nothing', () => {
    const file = createMockFile(
      'src/components/Header.tsx',
      `export function Header({ t }: { t: (k: string) => string }) {
        return (
          <div>
            <h1>{t('header.welcome')}</h1>
            <input type="text" placeholder={t('header.search_placeholder')} />
          </div>
        );
      }`,
    );

    const context: RuleContext = {
      files: [file],
      config: createMockConfig(),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd001HardcodedText.check(context);
    expect(findings).toEqual([]);
  });

  it('3. CSS class strings should not be flagged', () => {
    const file = createMockFile(
      'src/components/Button.tsx',
      `export function Button({ t }: { t: (k: string) => string }) {
        return (
          <button className="btn btn-primary bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            {t('common.submit')}
          </button>
        );
      }`,
    );

    const context: RuleContext = {
      files: [file],
      config: createMockConfig(),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd001HardcodedText.check(context);
    expect(findings).toEqual([]);
  });
});

describe('WRD101: Missing translation key', () => {
  it('4. Missing key in target locale → should find it', () => {
    const context: RuleContext = {
      files: [],
      config: createMockConfig({ sourceLocale: 'en', targetLocales: ['es', 'fr'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es', 'fr'],
        translations: {
          en: {
            'common.save': 'Save',
            'common.cancel': 'Cancel',
            'dashboard.title': 'Dashboard',
          },
          es: {
            'common.save': 'Guardar',
            // missing common.cancel and dashboard.title
          },
          fr: {
            'common.save': 'Enregistrer',
            'common.cancel': 'Annuler',
            'dashboard.title': 'Tableau de bord',
          },
        },
        translationFiles: {
          en: 'locales/en.json',
          es: 'locales/es.json',
          fr: 'locales/fr.json',
        },
      },
    };

    const findings = wrd101MissingTranslationKey.check(context);
    expect(findings.length).toBe(2);
    expect(findings.some(f => f.key === 'common.cancel' && f.locale === 'es')).toBe(true);
    expect(findings.some(f => f.key === 'dashboard.title' && f.locale === 'es')).toBe(true);
    expect(findings[0].confidence).toBe(0.98);
  });

  it('5. All keys present → should find nothing', () => {
    const context: RuleContext = {
      files: [],
      config: createMockConfig({ sourceLocale: 'en', targetLocales: ['es'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {
          en: {
            'home.title': 'Welcome',
            'home.subtitle': 'Glad you are here',
          },
          es: {
            'home.title': 'Bienvenido',
            'home.subtitle': 'Nos alegra que estés aquí',
          },
        },
        translationFiles: {
          en: 'locales/en.json',
          es: 'locales/es.json',
        },
      },
    };

    const findings = wrd101MissingTranslationKey.check(context);
    expect(findings).toEqual([]);
  });
});

describe('WRD302: Physical CSS direction properties', () => {
  it('6. CSS with margin-left when project has RTL locales → should find it', () => {
    const cssFile = createMockFile(
      'src/styles/app.css',
      `.sidebar {
        margin-left: 20px;
        padding-right: 10px;
        text-align: left;
      }`,
      'css',
    );

    const context: RuleContext = {
      files: [cssFile],
      config: createMockConfig({ targetLocales: ['es', 'ar'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es', 'ar'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd302PhysicalCss.check(context);
    expect(findings.length).toBe(3);
    expect(findings.some(f => f.message.includes('margin-left'))).toBe(true);
    expect(findings.some(f => f.message.includes('padding-right'))).toBe(true);
    expect(findings.some(f => f.message.includes('text-align: left'))).toBe(true);
    expect(findings[0].confidence).toBe(0.85);
  });

  it('7. CSS with margin-inline-start → should find nothing', () => {
    const cssFile = createMockFile(
      'src/styles/app.css',
      `.sidebar {
        margin-inline-start: 20px;
        padding-inline-end: 10px;
        text-align: start;
      }`,
      'css',
    );

    const context: RuleContext = {
      files: [cssFile],
      config: createMockConfig({ targetLocales: ['es', 'ar'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es', 'ar'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd302PhysicalCss.check(context);
    expect(findings).toEqual([]);
  });

  it('8. CSS with physical properties when project has NO RTL locales → should find nothing', () => {
    const cssFile = createMockFile(
      'src/styles/app.css',
      `.sidebar {
        margin-left: 20px;
      }`,
      'css',
    );

    const context: RuleContext = {
      files: [cssFile],
      config: createMockConfig({ targetLocales: ['es', 'fr', 'de'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es', 'fr', 'de'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd302PhysicalCss.check(context);
    expect(findings).toEqual([]);
  });
});

describe('Additional rules coverage', () => {
  it('WRD002: Dynamic text concatenation in JSX', () => {
    const file = createMockFile(
      'src/App.tsx',
      `export function App({ name, count }: { name: string; count: number }) {
        return (
          <div>
            <span>{"Hello " + name}</span>
            <p>{\`You have \${count} items\`}</p>
          </div>
        );
      }`,
    );

    const context: RuleContext = {
      files: [file],
      config: createMockConfig(),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd002TextConcatenation.check(context);
    expect(findings.length).toBe(2);
    expect(findings[0].confidence).toBe(0.8);
  });

  it('WRD102: Unused translation keys', () => {
    const sourceFile = createMockFile(
      'src/App.tsx',
      `export function App({ t }: { t: (k: string) => string }) {
        return <span>{t('used.key')}</span>;
      }`,
    );

    const context: RuleContext = {
      files: [sourceFile],
      config: createMockConfig(),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {
          en: {
            'used.key': 'Used Key',
            'unused.key': 'Unused Key',
          },
        },
        translationFiles: {
          en: 'locales/en.json',
        },
      },
    };

    const findings = wrd102UnusedTranslationKey.check(context);
    expect(findings.length).toBe(1);
    expect(findings[0].key).toBe('unused.key');
    expect(findings[0].confidence).toBe(0.7);
  });

  it('WRD103: Placeholder mismatch', () => {
    const context: RuleContext = {
      files: [],
      config: createMockConfig({ targetLocales: ['es'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {
          en: {
            greeting: 'Hello {name}, you have {count} messages',
          },
          es: {
            greeting: 'Hola {name}, tienes mensajes', // missing {count}
          },
        },
        translationFiles: {
          en: 'locales/en.json',
          es: 'locales/es.json',
        },
      },
    };

    const findings = wrd103PlaceholderMismatch.check(context);
    expect(findings.length).toBe(1);
    expect(findings[0].message).toContain('count');
    expect(findings[0].confidence).toBe(0.95);
  });

  it('WRD301: Missing dir in HTML with RTL target', () => {
    const htmlFile = createMockFile(
      'index.html',
      `<!DOCTYPE html>
      <html lang="en">
        <head><title>App</title></head>
        <body>Hello</body>
      </html>`,
      'html',
    );

    const context: RuleContext = {
      files: [htmlFile],
      config: createMockConfig({ targetLocales: ['ar'] }),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['ar'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd301RtlDeclaration.check(context);
    expect(findings.length).toBe(1);
    expect(findings[0].message).toContain('dir');
    expect(findings[0].confidence).toBe(0.9);
  });

  it('WRD401: Locale-insensitive formatting', () => {
    const file = createMockFile(
      'src/format.tsx',
      `export function Display() {
        const d = new Date();
        const dateStr = d.toLocaleDateString();
        const price = 42;
        return (
          <div>
            <span>{d.toISOString()}</span>
            <span>{price.toFixed(2)}</span>
          </div>
        );
      }`,
    );

    const context: RuleContext = {
      files: [file],
      config: createMockConfig(),
      localeData: {
        sourceLocale: 'en',
        targetLocales: ['es'],
        translations: {},
        translationFiles: {},
      },
    };

    const findings = wrd401LocaleInsensitiveFormatting.check(context);
    expect(findings.length).toBe(3);
    expect(findings.some(f => f.message.includes('toLocaleDateString'))).toBe(true);
    expect(findings.some(f => f.message.includes('toISOString'))).toBe(true);
    expect(findings.some(f => f.message.includes('toFixed'))).toBe(true);
  });

  it('allRules exports all 8 rules', () => {
    expect(allRules.length).toBe(8);
    const ids = allRules.map(r => r.meta.id);
    expect(ids).toContain('WRD001');
    expect(ids).toContain('WRD002');
    expect(ids).toContain('WRD101');
    expect(ids).toContain('WRD102');
    expect(ids).toContain('WRD103');
    expect(ids).toContain('WRD301');
    expect(ids).toContain('WRD302');
    expect(ids).toContain('WRD401');
  });
});
