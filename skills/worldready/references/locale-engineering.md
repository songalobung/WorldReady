# WorldReady: Locale Engineering & CLDR Standards

This reference covers the engineering requirements for international formatting, Unicode CLDR plural rules, text expansion dynamics, and pseudo-localization testing.

---

## 1. Locale-Sensitive Formatting vs. Naive Patterns (`WRD401`)

One of the most persistent software localization bugs is assuming that formatting numbers, currencies, and dates can be solved by string concatenation or fixed decimal formatting.

### Flawed Patterns Flagged by `WRD401`:

#### 1. Hardcoded Currency Symbols & Placement
```ts
// Flawed: Assumes symbol always precedes number, decimal separator is always '.',
// and thousand separator is always ','
const formattedPrice = '$' + price.toFixed(2);
```
**Why this breaks:**
- In France (`fr-FR`): `49,99 $US` or `49,99 €` (symbol follows number with a non-breaking space, comma as decimal).
- In Germany (`de-DE`): `49,99 $` (comma as decimal, period as thousand separator).
- In Arabic (`ar-EG`): `٤٩٫٩٩ ج.م.` (Eastern Arabic numerals and local currency abbreviation).

#### 2. Naive Date and Time Formatting
```ts
// Flawed: Inconsistent output across platforms, unlocalized timezone
const displayDate = new Date(timestamp).toLocaleDateString();
// Or worse:
const displayDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
```
**Why this breaks:**
- `04/05/2026`: In the US, this is April 5th. In the UK, Germany, and most of the world, this is May 4th. In Japan (`ja-JP`), standard format is `2026/04/05`.

#### 3. Naive Percentage and Number Formatting
```ts
// Flawed: Hardcoded '%' symbol
const percentString = (rate * 100).toFixed(1) + '%';
```
**Why this breaks:**
- In Turkish (`tr-TR`), the percent symbol precedes the number: `%25`.
- In French, a non-breaking space precedes the percent symbol: `25 %`.

---

## 2. Standards-Compliant Formatting with `Intl`

Modern JavaScript and Node.js provide full standard implementations of the ECMAScript Internationalization API (`Intl`), backed by the Unicode CLDR.

### Recommended Patterns:

#### Currency Formatting:
```ts
export function formatCurrency(amount: number, locale: string, currency = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol'
  }).format(amount);
}

// Results:
// formatCurrency(1250.5, 'en-US', 'USD') => "$1,250.50"
// formatCurrency(1250.5, 'de-DE', 'EUR') => "1.250,50 €"
// formatCurrency(1250.5, 'fr-FR', 'EUR') => "1 250,50 €"
// formatCurrency(1250.5, 'ja-JP', 'JPY') => "￥1,251" (zero decimal digits automatically respected)
```

#### Date and Time Formatting:
```ts
export function formatDate(date: Date | number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

// Results:
// formatDate(date, 'en-US') => "Apr 5, 2026, 3:30 PM"
// formatDate(date, 'en-GB') => "5 Apr 2026, 15:30"
// formatDate(date, 'ar-EG') => "٥ أبريل ٢٠٢٦ ٣:٣٠ م"
```

#### Relative Time Formatting:
```ts
export function formatTimeAgo(value: number, unit: Intl.RelativeTimeFormatUnit, locale: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
}

// Results:
// formatTimeAgo(-1, 'day', 'en') => "yesterday"
// formatTimeAgo(-1, 'day', 'fr') => "hier"
// formatTimeAgo(-3, 'day', 'es') => "hace 3 días"
```

---

## 3. Unicode CLDR Plural Rules

A major source of syntax errors and broken UI phrasing is assuming that languages only have two plural forms: "singular" (1) and "plural" (other).

### The Six CLDR Plural Categories:
The Unicode Common Locale Data Repository (CLDR) defines six categories:
- `zero`
- `one`
- `two`
- `few`
- `many`
- `other`

Different languages utilize different subsets of these rules:

| Language | Number of Plural Categories | Active Categories | Notes |
| :--- | :--- | :--- | :--- |
| **English (`en`)**, **German (`de`)** | 2 | `one`, `other` | 1 item vs 0 or 2+ items. |
| **French (`fr`)** | 2 | `one`, `other` | 0 and 1 are both `one`! |
| **Russian (`ru`)**, **Ukrainian (`uk`)** | 3 | `one`, `few`, `many` | 1, 21, 31... (`one`); 2-4, 22-24... (`few`); 5-20, 25-30... (`many`). |
| **Polish (`pl`)** | 3 | `one`, `few`, `many` | Complex endings depending on last digit. |
| **Arabic (`ar`)** | 6 | `zero`, `one`, `two`, `few`, `many`, `other` | Full 6-category inflection (0; 1; 2; 3-10; 11-99; 100+). |
| **Japanese (`ja`)**, **Chinese (`zh`)** | 1 | `other` | No grammatical plural inflection. |

### Inspecting Plural Categories with `Intl.PluralRules`:
```ts
const arabicPlurals = new Intl.PluralRules('ar');
arabicPlurals.select(0);  // "zero"
arabicPlurals.select(1);  // "one"
arabicPlurals.select(2);  // "two"
arabicPlurals.select(5);  // "few"
arabicPlurals.select(25); // "many"
arabicPlurals.select(100);// "other"
```

**Never assemble plural strings with string concatenation like:**
```ts
// BROKEN:
count + ' ' + (count === 1 ? 'item' : 'items');
```
Always use ICU MessageFormat or translation library plural keys:
```json
{
  "item_count": "{count, plural, one {# item} other {# items}}"
}
```

---

## 4. Text Expansion & Space Requirements

When English source text is translated into other languages, the word length and character count expand significantly:

| Language | Typical Text Expansion vs. English | Common Layout Risks |
| :--- | :--- | :--- |
| **German (`de`)** | +30% to +50% | Long compound words (`Geschwindigkeitsbegrenzung`), button text clipping, navigation overflow. |
| **Finnish (`fi`)** | +30% to +40% | Agglutinative suffixes cause extreme word length. |
| **French (`fr`)**, **Spanish (`es`)**, **Italian (`it`)** | +20% to +30% | Multi-word phrases replace concise English verbs. |
| **Chinese (`zh`)**, **Japanese (`ja`)**, **Korean (`ko`)** | -20% to -40% length, but +20% line-height | Shorter character count, but complex glyphs require larger font sizes and taller line heights (`line-height: 1.4` minimum). |
| **Arabic (`ar`)**, **Hebrew (`he`)** | Variable length, mirrored alignment | Diacritics (harakat), vertical spacing, text clipping at container bounds. |

---

## 5. Pseudo-Localization: `en-XA` and `ar-XB`

Pseudo-localization is an automated testing technique that transforms source text into a readable simulated foreign language without requiring real translators.

WorldReady provides `@worldready/pseudo-localization` with two standard test locales:

### 1. `en-XA` (Accented Expansion)
Transforms Latin characters into accented equivalents and expands text length by ~35% while preserving delimiters `[` and `]`:
- **Source**: `"Edit Profile"`
- **Pseudo-localized**: `"[Éðîţ Þřöƒîĺé !one! !two!]"`

#### What `en-XA` Proves:
1. **Hardcoded Strings**: Any string remaining in unaccented plain English was never extracted to a translation key.
2. **Clipping & Truncation**: If the closing bracket `]` is cut off, the CSS container has a fixed width or `overflow: hidden` without text wrapping.
3. **Placeholder Integrity**: Placeholders like `{username}` and `<Link>` tags remain uncorrupted.

### 2. `ar-XB` (Simulated RTL)
Wraps strings in Unicode Right-to-Left Override (`\u202E`) and Pop Directional Formatting (`\u202C`) markers, enclosed in brackets:
- **Source**: `"Dashboard"`
- **Pseudo-localized**: `"[‮Ɗåšĥƀöåřð‬]"`

#### What `ar-XB` Proves:
1. **Layout Direction**: Exposes components that fail to mirror when rendered in RTL context.
2. **Punctuation Flipping**: Uncovers mixed-direction strings where punctuation jumps to the wrong edge.
