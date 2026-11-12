import type { PseudoLocale, PseudoOptions } from './types.js';

const EN_XA_CHAR_MAP: Record<string, string> = {
  a: 'å',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'î',
  j: 'ĵ',
  k: 'ƙ',
  l: 'ĺ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ö',
  p: 'þ',
  q: 'q',
  r: 'ř',
  s: 'š',
  t: 'ţ',
  u: 'û',
  v: 'ṽ',
  w: 'ŵ',
  x: '×',
  y: 'ý',
  z: 'ž',
  A: 'Å',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Î',
  J: 'Ĵ',
  K: 'Ƙ',
  L: 'Ĺ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ö',
  P: 'Þ',
  Q: 'Q',
  R: 'Ř',
  S: 'Š',
  T: 'Ţ',
  U: 'Û',
  V: 'Ṽ',
  W: 'Ŵ',
  X: '×',
  Y: 'Ý',
  Z: 'Ž',
};

const RLO = '\u202E'; // Right-to-Left Override
const PDF = '\u202C'; // Pop Directional Formatting

interface Token {
  type: 'text' | 'placeholder';
  value: string;
}

/**
 * Tokenizes a string into text portions and protected placeholder portions
 * (such as ICU placeholders {name}, HTML tags <tag>, and HTML entities &amp;).
 */
function tokenize(text: string, preservePlaceholders: boolean): Token[] {
  if (!preservePlaceholders) {
    return [{ type: 'text', value: text }];
  }

  const tokens: Token[] = [];
  let i = 0;
  let textBuf = '';

  const flushText = () => {
    if (textBuf.length > 0) {
      tokens.push({ type: 'text', value: textBuf });
      textBuf = '';
    }
  };

  while (i < text.length) {
    const char = text[i];

    // 1. Check for ICU / curly brace placeholder: { ... } (handles nested braces)
    if (char === '{') {
      let depth = 0;
      let j = i;
      let foundEnd = false;
      while (j < text.length) {
        if (text[j] === '{') {
          depth++;
        } else if (text[j] === '}') {
          depth--;
          if (depth === 0) {
            foundEnd = true;
            j++;
            break;
          }
        }
        j++;
      }
      if (foundEnd) {
        flushText();
        tokens.push({ type: 'placeholder', value: text.slice(i, j) });
        i = j;
        continue;
      }
    }

    // 2. Check for HTML/XML tags: e.g. <b>, </tag>, <span class="...">, <img />
    if (char === '<') {
      const rest = text.slice(i);
      const tagMatch = rest.match(/^<(?:\/?[a-zA-Z][a-zA-Z0-9:-]*(?:\s+[^>]*?)?\/?>|!--[\s\S]*?-->|!\[CDATA\[[\s\S]*?\]\]>)/);
      if (tagMatch) {
        flushText();
        tokens.push({ type: 'placeholder', value: tagMatch[0] });
        i += tagMatch[0].length;
        continue;
      }
    }

    // 3. Check for HTML entities: e.g. &amp;, &lt;, &#39;, &#x1F600;
    if (char === '&') {
      const rest = text.slice(i);
      const entityMatch = rest.match(/^&(?:[a-zA-Z0-9]+|#[0-9]+|#[xX][0-9a-fA-F]+);/);
      if (entityMatch) {
        flushText();
        tokens.push({ type: 'placeholder', value: entityMatch[0] });
        i += entityMatch[0].length;
        continue;
      }
    }

    // 4. Check for printf style placeholders: %s, %d, %1$s, %(name)s
    if (char === '%') {
      const rest = text.slice(i);
      const printfMatch = rest.match(/^%(\(\w+\))?(\d+\$)?[#0\- +']*\d*(\.\d+)?[a-zA-Z%]/);
      if (printfMatch && printfMatch[0] !== '%%') {
        flushText();
        tokens.push({ type: 'placeholder', value: printfMatch[0] });
        i += printfMatch[0].length;
        continue;
      }
    }

    textBuf += char;
    i++;
  }

  flushText();
  return tokens;
}

/**
 * Generates length expansion padding using repeated pad tokens.
 */
function generatePadding(targetLength: number): string {
  if (targetLength <= 0) return '';
  const padSequence = ' !one! !two! !three! !four! !five! !six! !seven! !eight! !nine! !ten!';
  let pad = '';
  while (pad.length < targetLength) {
    pad += padSequence;
  }
  return pad.slice(0, targetLength);
}

function isRtlLocale(locale: string): boolean {
  const norm = locale.toLowerCase().replace(/_/g, '-');
  return norm === 'ar-xb' || norm.startsWith('ar-') || norm === 'ar' || norm === 'xb';
}

/**
 * Pseudo-localizes a string for layout, clipping, and translation testing.
 *
 * @param text The source text string
 * @param locale The pseudo-locale ('en-XA' for accented expansion, 'ar-XB' for RTL simulation)
 * @param options Configuration options for delimiters, expansion ratio, and placeholder preservation
 */
export function pseudoLocalize(
  text: string,
  locale: PseudoLocale = 'en-XA',
  options?: PseudoOptions
): string {
  if (!text || typeof text !== 'string') {
    return text ?? '';
  }

  const preservePlaceholders = options?.preservePlaceholders ?? true;
  const delimiters: [string, string] =
    Array.isArray(options?.delimiters) && options.delimiters.length >= 2
      ? [options.delimiters[0], options.delimiters[1]]
      : ['[', ']'];

  const tokens = tokenize(text, preservePlaceholders);
  const isRtl = isRtlLocale(locale);

  if (isRtl) {
    // ar-XB: Wrap in RLO and PDF directional markers with bracketed delimiters
    const expansionFactor = options?.expansionFactor ?? 0;
    const extraLength = Math.round(text.length * expansionFactor);
    const padding = generatePadding(extraLength);

    const content = tokens.map((t) => t.value).join('');
    return `${delimiters[0]}${RLO}${content}${padding}${PDF}${delimiters[1]}`;
  }

  // en-XA: Accented Unicode character replacement + expansion padding
  const expansionFactor = options?.expansionFactor ?? 0.35;
  const extraLength = Math.round(text.length * expansionFactor);
  const padding = generatePadding(extraLength);

  const transformedContent = tokens
    .map((token) => {
      if (token.type === 'placeholder') {
        return token.value;
      }
      let acc = '';
      for (const ch of token.value) {
        acc += EN_XA_CHAR_MAP[ch] ?? ch;
      }
      return acc;
    })
    .join('');

  return `${delimiters[0]}${transformedContent}${padding}${delimiters[1]}`;
}
