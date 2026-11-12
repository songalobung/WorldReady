import { describe, it, expect } from 'vitest';
import { pseudoLocalize } from './transform.js';
import { transformLocaleData } from './file-transform.js';

describe('pseudoLocalize', () => {
  describe('en-XA locale (accented expansion)', () => {
    it('transforms lowercase and uppercase letters to accented variants', () => {
      const lowercaseAlphabet = 'abcdefghijklmnopqrstuvwxyz';
      const lowerOutput = pseudoLocalize(lowercaseAlphabet, 'en-XA', {
        expansionFactor: 0,
        delimiters: ['', ''],
      });

      // Check specific expected mappings from spec:
      // a → å, b → ƀ, c → ç, d → ð, e → é, f → ƒ, g → ĝ, h → ĥ, i → î, j → ĵ,
      // k → ƙ, l → ĺ, m → ɱ, n → ñ, o → ö, p → þ, q → q, r → ř, s → š, t → ţ,
      // u → û, v → ṽ, w → ŵ, x → ×, y → ý, z → ž
      expect(lowerOutput).toBe('åƀçðéƒĝĥîĵƙĺɱñöþqřšţûṽŵ×ýž');

      const uppercaseAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const upperOutput = pseudoLocalize(uppercaseAlphabet, 'en-XA', {
        expansionFactor: 0,
        delimiters: ['', ''],
      });
      expect(upperOutput).toBe('ÅƁÇÐÉƑĜĤÎĴƘĹṀÑÖÞQŘŠŢÛṼŴ×ÝŽ');
    });

    it('wraps with default delimiters [ and ]', () => {
      const res = pseudoLocalize('Hello', 'en-XA', { expansionFactor: 0 });
      expect(res.startsWith('[')).toBe(true);
      expect(res.endsWith(']')).toBe(true);
    });

    it('supports custom delimiters', () => {
      const res = pseudoLocalize('Hello', 'en-XA', {
        delimiters: ['«', '»'],
        expansionFactor: 0,
      });
      expect(res.startsWith('«')).toBe(true);
      expect(res.endsWith('»')).toBe(true);
    });

    it('preserves {name} and {0} placeholders without corrupting them', () => {
      const res = pseudoLocalize('Welcome {name}! Your score is {0}.', 'en-XA', {
        expansionFactor: 0,
        delimiters: ['', ''],
      });
      expect(res).toContain('{name}');
      expect(res).toContain('{0}');
      // Letters outside placeholders should still be accented
      expect(res).toContain('Ŵéĺçöɱé');
    });

    it('preserves complex/nested ICU placeholders', () => {
      const res = pseudoLocalize(
        '{count, plural, one {# item} other {# items}} remaining',
        'en-XA',
        { expansionFactor: 0, delimiters: ['', ''] }
      );
      expect(res).toContain('{count, plural, one {# item} other {# items}}');
      expect(res).toContain('řéɱåîñîñĝ');
    });

    it('preserves <tag> and HTML entities intact', () => {
      const res = pseudoLocalize(
        'Click <a href="/login" class="btn">here</a> &amp; register &copy; 2026',
        'en-XA',
        { expansionFactor: 0, delimiters: ['', ''] }
      );
      expect(res).toContain('<a href="/login" class="btn">');
      expect(res).toContain('</a>');
      expect(res).toContain('&amp;');
      expect(res).toContain('&copy;');
      expect(res).toContain('2026');
      // The word "here" between tags should be accented
      expect(res).toContain('ĥéřé');
    });

    it('preserves printf placeholders like %s and %1$d', () => {
      const res = pseudoLocalize('Processed %1$d of %2$d items (%s)', 'en-XA', {
        expansionFactor: 0,
        delimiters: ['', ''],
      });
      expect(res).toContain('%1$d');
      expect(res).toContain('%2$d');
      expect(res).toContain('(%s)');
    });

    it('transforms placeholders when preservePlaceholders is false', () => {
      const res = pseudoLocalize('Hello {name}', 'en-XA', {
        preservePlaceholders: false,
        expansionFactor: 0,
        delimiters: ['', ''],
      });
      // '{name}' letters should be transformed (e.g., n -> ñ, a -> å, m -> ɱ, e -> é)
      expect(res).not.toContain('{name}');
      expect(res).toContain('{ñåɱé}');
    });

    it('increases text length by expected ratio via expansionFactor', () => {
      const text = 'Testing length expansion for pseudo-localization strings.';
      const factor = 0.5;
      const res = pseudoLocalize(text, 'en-XA', { expansionFactor: factor, delimiters: ['', ''] });

      const expectedLength = text.length + Math.round(text.length * factor);
      expect(res.length).toBe(expectedLength);
      expect(res).toContain('!one!');
    });

    it('applies default expansion factor of ~30-40%', () => {
      const text = 'This is a sufficiently long sentence to evaluate default length expansion ratio.';
      const res = pseudoLocalize(text, 'en-XA', { delimiters: ['', ''] });

      const expansionRatio = (res.length - text.length) / text.length;
      expect(expansionRatio).toBeGreaterThanOrEqual(0.3);
      expect(expansionRatio).toBeLessThanOrEqual(0.4);
    });

    it('handles expansionFactor: 0 without padding', () => {
      const text = 'Simple text';
      const res = pseudoLocalize(text, 'en-XA', { expansionFactor: 0, delimiters: ['', ''] });
      expect(res.length).toBe(text.length);
    });

    it('handles empty string and non-string inputs gracefully', () => {
      expect(pseudoLocalize('', 'en-XA')).toBe('');
      // @ts-expect-error test invalid inputs
      expect(pseudoLocalize(null, 'en-XA')).toBe('');
    });
  });

  describe('ar-XB locale (RTL simulation)', () => {
    it('wraps in RTL directional markers RLO (\\u202E) and PDF (\\u202C)', () => {
      const input = 'Hello World';
      const res = pseudoLocalize(input, 'ar-XB');

      expect(res).toContain('\u202E');
      expect(res).toContain('\u202C');
      expect(res.startsWith('[\u202E')).toBe(true);
      expect(res.endsWith('\u202C]')).toBe(true);
    });

    it('preserves text content and placeholders within directional markers', () => {
      const input = 'Welcome, {user}! Click <button>OK</button>';
      const res = pseudoLocalize(input, 'ar-XB');

      expect(res).toBe('[\u202EWelcome, {user}! Click <button>OK</button>\u202C]');
    });

    it('supports custom delimiters in ar-XB', () => {
      const res = pseudoLocalize('RTL test', 'ar-XB', { delimiters: ['«', '»'] });
      expect(res.startsWith('«\u202E')).toBe(true);
      expect(res.endsWith('\u202C»')).toBe(true);
    });

    it('applies optional expansion factor when specified for ar-XB', () => {
      const input = 'This is a longer string to test expansion in ar-XB';
      const res = pseudoLocalize(input, 'ar-XB', { expansionFactor: 0.5 });
      expect(res.startsWith('[\u202E')).toBe(true);
      expect(res.endsWith('\u202C]')).toBe(true);
      expect(res).toContain('!one!');
    });
  });
});

describe('transformLocaleData', () => {
  it('nested JSON structures transform recursively', () => {
    const sourceData = {
      app: {
        title: 'WorldReady Platform',
        navigation: {
          home: 'Home',
          settings: 'Settings',
        },
      },
      messages: {
        welcome: 'Hello {name}!',
        itemsCount: 'You have {count} items.',
      },
      stats: {
        count: 100,
        active: true,
        unassigned: null,
      },
      tags: ['internationalization', 'localization'],
    };

    const transformed = transformLocaleData(sourceData, 'en-XA', {
      expansionFactor: 0,
      delimiters: ['[', ']'],
    });

    // Check nested objects
    const app = transformed.app as Record<string, unknown>;
    const nav = app.navigation as Record<string, unknown>;
    expect(nav.home).toBe('[Ĥöɱé]');
    expect(nav.settings).toBe('[Šéţţîñĝš]');

    // Check placeholders preserved inside nested strings
    const messages = transformed.messages as Record<string, unknown>;
    expect(messages.welcome).toBe('[Ĥéĺĺö {name}!]');
    expect(messages.itemsCount).toBe('[Ýöû ĥåṽé {count} îţéɱš.]');

    // Check non-string primitives are preserved as-is
    const stats = transformed.stats as Record<string, unknown>;
    expect(stats.count).toBe(100);
    expect(stats.active).toBe(true);
    expect(stats.unassigned).toBe(null);

    // Check arrays of strings
    const tags = transformed.tags as string[];
    expect(tags[0]).toBe('[îñţéřñåţîöñåĺîžåţîöñ]');
    expect(tags[1]).toBe('[ĺöçåĺîžåţîöñ]');
  });

  it('transforms nested structures with ar-XB locale', () => {
    const sourceData = {
      menu: {
        file: 'File',
        edit: 'Edit',
      },
    };

    const transformed = transformLocaleData(sourceData, 'ar-XB');
    const menu = transformed.menu as Record<string, unknown>;
    expect(menu.file).toBe('[\u202EFile\u202C]');
    expect(menu.edit).toBe('[\u202EEdit\u202C]');
  });

  it('handles empty dictionary gracefully', () => {
    expect(transformLocaleData({})).toEqual({});
  });
});
