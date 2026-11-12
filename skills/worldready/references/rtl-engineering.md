# WorldReady: Right-to-Left (RTL) & Bidirectional Engineering

Supporting Right-to-Left (RTL) writing systems—such as Arabic, Hebrew, Persian (Farsi), Urdu, and Dhivehi—requires more than flipping text alignment. It requires architectural support for script direction, layout mirroring, bidirectional (bidi) text isolation, and logical styling.

---

## 1. Script vs. Language: The Fundamental Distinction

A common engineering mistake is assuming direction is a fixed property of a language code.

### W3C Internationalisation Guidance:
> **Direction is a property of the script, not the language.**

Several languages are written in different scripts depending on geography, history, or user preference:
- **Azerbaijani (`az`)**:
  - Written in Latin script in the Republic of Azerbaijan (`az-Latn`) → Left-to-Right (LTR)
  - Written in Arabic/Perso-Arabic script in Iran (`az-Arab`) → Right-to-Left (RTL)
  - Written in Cyrillic script historically (`az-Cyrl`) → Left-to-Right (LTR)
- **Kurdish (`ku`)**:
  - Kurmanji in Latin script (`ku-Latn`) → LTR
  - Sorani in Arabic script (`ckb` / `ku-Arab`) → RTL
- **Sindhi (`sd`)**, **Malay (`ms` / `zlm`)**, **Serbian (`sr`)**.

### Best Practice for Declaring Direction:
Never set `dir="rtl"` based solely on a two-letter country or generic language code without checking the script subtag. When configuring target locales in `worldready.config.json`, WorldReady recognizes primary RTL script families:
- Arabic (`Arab`)
- Hebrew (`Hebr`)
- Syriac (`Syrc`)
- Thaana (`Thaa`)
- Persian / Farsi (`fa`)
- Urdu (`ur`)
- Yiddish (`yi`)

---

## 2. Document & Container Direction Declarations (`WRD301`)

The W3C recommends declaring direction **at the document root** in HTML, rather than relying on CSS `direction: rtl`:

```html
<!-- Recommended HTML declaration -->
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>...</head>
  <body>...</body>
</html>
```

### Why CSS `direction: rtl` Is Dangerous When Used Alone:
1. **Forms & Plaintext Handlers**: Form inputs, text areas, and clipboard operations derive behavior from the DOM `dir` attribute, not CSS layout engines.
2. **Cascading Failures**: If CSS fails to load, or in lightweight readers/search engine parsers, the content renders with broken punctuation and backwards alignment.
3. **Accessibility Trees**: Screen readers rely on DOM `dir` attributes to correctly announce reading order and pronounce bidirectional sequences.

### Dynamic Root Direction in Modern Frameworks:

#### Next.js (App Router):
```tsx
// app/[locale]/layout.tsx
import { getLangDir } from 'rtl-detect'; // or custom helper

export default function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dir = ['ar', 'he', 'fa', 'ur'].includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

#### React / Single Page Applications:
```tsx
useEffect(() => {
  document.documentElement.dir = isRtlLocale(currentLocale) ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLocale;
}, [currentLocale]);
```

---

## 3. CSS Logical Properties vs. Physical Properties (`WRD302`)

When a document switches from LTR to RTL, the layout should mirror horizontally: start is right, end is left.
Physical properties (`left`, `right`, `margin-left`, `padding-right`) do NOT adapt automatically, forcing teams to maintain fragile override stylesheets (`styles.rtl.css`).

**CSS Logical Properties** eliminate the need for separate RTL styles by adapting relative to the writing mode and direction:

| Physical Property (Flags `WRD302`) | CSS Logical Equivalent (Safe & Recommended) | Behavior in LTR | Behavior in RTL |
| :--- | :--- | :--- | :--- |
| `margin-left: 16px;` | `margin-inline-start: 16px;` | Left: 16px | Right: 16px |
| `margin-right: 24px;` | `margin-inline-end: 24px;` | Right: 24px | Left: 24px |
| `padding-left: 8px;` | `padding-inline-start: 8px;` | Left: 8px | Right: 8px |
| `padding-right: 12px;` | `padding-inline-end: 12px;` | Right: 12px | Left: 12px |
| `left: 0;` | `inset-inline-start: 0;` | Left: 0 | Right: 0 |
| `right: 0;` | `inset-inline-end: 0;` | Right: 0 | Left: 0 |
| `border-left: 1px solid #ccc;` | `border-inline-start: 1px solid #ccc;` | Left border | Right border |
| `border-right: 1px solid #ccc;` | `border-inline-end: 1px solid #ccc;` | Right border | Left border |
| `border-top-left-radius: 4px;` | `border-start-start-radius: 4px;` | Top-left | Top-right |
| `border-bottom-right-radius: 4px;` | `border-end-end-radius: 4px;` | Bottom-right | Bottom-left |
| `text-align: left;` | `text-align: start;` | Left aligned | Right aligned |
| `text-align: right;` | `text-align: end;` | Right aligned | Left aligned |
| `clear: left;` | `clear: inline-start;` | Clear left | Clear right |
| `float: left;` | `float: inline-start;` | Float left | Float right |

### Browser Support:
CSS Logical Properties have been supported across all modern browsers (Chrome, Safari, Firefox, Edge) since 2018. They are standard baseline CSS.

---

## 4. Bidirectional (Bidi) Isolation & Mixed Content

When Arabic or Hebrew text contains Latin product names, numbers, email addresses, or phone numbers, the Unicode Bidirectional Algorithm (UBA) must determine how to order the glyphs.

Without proper isolation, punctuation and adjacent Latin words become garbled:

```text
Problem:
Original: "أهلاً بك يا John!"
Rendered incorrectly without isolation: "!أهلاً بك يا John" (Exclamation mark jumps to left)
```

### The Solution: Isolation with `<bdi>` or `dir="auto"`

1. **User-Generated Content**:
   Always wrap user names, file paths, comments, and external data in `<bdi>` (Bidirectional Isolate) elements:
   ```tsx
   <p>
     <span>تم إرسال الرسالة إلى: </span>
     <bdi>{recipient.name}</bdi>
   </p>
   ```

2. **Form Inputs with Unknown Direction**:
   When users might enter either Latin or Arabic input (e.g. search bars, comment fields), use `dir="auto"`:
   ```html
   <input type="text" name="comment" dir="auto" placeholder="..." />
   ```

3. **CSS Isolation**:
   When HTML markup cannot be changed directly, use CSS unicode-bidi isolation:
   ```css
   .user-provided-label {
     unicode-bidi: isolate;
   }
   ```

---

## 5. What Mirrors vs. What Does NOT Mirror

A common trap in RTL engineering is over-mirroring:

### What MUST Mirror:
- **Navigation flow**: "Back" buttons point right (towards previous), "Forward" buttons point left.
- **Reading alignment**: Text starts on the right; checkboxes and radio buttons precede their labels on the right.
- **Form layouts**: Labels align to `start` (right).
- **Progress bars & breadcrumbs**: Step 1 is on the far right, progressing leftwards.
- **Columns & tables**: First column starts on the right.

### What MUST NOT Mirror:
- **Media player controls**: Play, pause, rewind, fast-forward, progress scrubber. (Play always points right, representing time flowing forward).
- **Numbers & Phone Numbers**: Phone numbers (`+1-800-555-0199`) and mathematical formulas remain LTR.
- **Physical symbols and brand logos**: Brand icons, clockwise indicators, search icons (unless containing script).
- **Code snippets & URLs**: Source code and web addresses (`https://...`) are always LTR. Always set `dir="ltr"` on code blocks:
  ```html
  <pre dir="ltr"><code>npm install @worldready/core</code></pre>
  ```
