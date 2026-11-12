# WorldReady Remediation Guide: Safe Refactoring Patterns

This guide provides concrete, safe refactoring patterns for resolving internationalisation defects flagged by WorldReady rules.

---

## 1. Remediation Contract for Coding Agents

When remediating code flagged by WorldReady:
1. **Never edit files destructively**: Make minimal edits that preserve surrounding formatting and architectural conventions.
2. **Synchronize catalogs**: When introducing a new translation key, update **both** the source catalog (`en`) and all configured target catalogs (`fr`, `ar`, etc.).
3. **Execute the verification check**: Run `npx worldready audit` immediately after modifying files. Confirm that the flagged issue is resolved and that no secondary issues were introduced.

---

## 2. Refactoring Hardcoded UI Strings (`WRD001`)

### Scenario A: Next.js (App Router with `next-intl`)

#### Flagged Code (`src/app/page.tsx`):
```tsx
export default function Page() {
  return (
    <main>
      <h1>Welcome to WorldReady</h1>
      <button aria-label="Close dialog">Close</button>
    </main>
  );
}
```

#### Step 1: Update Translation Catalogs
In `messages/en.json`:
```json
{
  "home": {
    "title": "Welcome to WorldReady",
    "close_action": "Close"
  }
}
```
In `messages/fr.json`:
```json
{
  "home": {
    "title": "Bienvenue sur WorldReady",
    "close_action": "Fermer"
  }
}
```

#### Step 2: Refactor Component
```tsx
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('home');

  return (
    <main>
      <h1>{t('title')}</h1>
      <button aria-label={t('close_action')}>{t('close_action')}</button>
    </main>
  );
}
```

---

### Scenario B: React with `react-i18next`

#### Flagged Code (`src/components/Header.tsx`):
```tsx
export function Header() {
  return (
    <header>
      <input placeholder="Search products..." />
      <button>Sign In</button>
    </header>
  );
}
```

#### Step 1: Update Translation Catalogs
In `public/locales/en/common.json`:
```json
{
  "header": {
    "search_placeholder": "Search products...",
    "sign_in": "Sign In"
  }
}
```
In `public/locales/fr/common.json`:
```json
{
  "header": {
    "search_placeholder": "Rechercher des produits...",
    "sign_in": "Se connecter"
  }
}
```

#### Step 2: Refactor Component
```tsx
import { useTranslation } from 'react-i18next';

export function Header() {
  const { t } = useTranslation('common');

  return (
    <header>
      <input placeholder={t('header.search_placeholder')} />
      <button>{t('header.sign_in')}</button>
    </header>
  );
}
```

---

## 3. Refactoring Dynamic String Concatenation (`WRD002`)

### The Problem:
Concatenating strings with variables (`"Welcome " + name` or `{"Logged in as " + user.role}`) breaks grammatical structure because sentence order varies across languages:
- English: `Logged in as Admin`
- French: `Connecté en tant qu'administrateur`
- Japanese: `管理者としてログイン中` (Role comes first!)

### Pattern: Interpolated Translation Keys

#### Flagged Code:
```tsx
// Flagged by WRD002
<span>{"Hello " + user.name + ", you have " + unreadCount + " new messages."}</span>
```

#### Safe Remediation:
In `locales/en/common.json`:
```json
{
  "greeting_messages": "Hello {name}, you have {count} new messages."
}
```
In `locales/fr/common.json`:
```json
{
  "greeting_messages": "Bonjour {name}, vous avez {count} nouveaux messages."
}
```
In `locales/ja/common.json`:
```json
{
  "greeting_messages": "{name}様、{count}件の新着メッセージがあります。"
}
```

Component update:
```tsx
<span>{t('greeting_messages', { name: user.name, count: unreadCount })}</span>
```

---

## 4. Resolving Missing Keys (`WRD101`) & Placeholder Mismatches (`WRD103`)

### Missing Translation Keys (`WRD101`):
When `locales/en/common.json` has a key missing from `locales/fr/common.json`:
```json
// locales/en/common.json
{
  "checkout": {
    "pay_now": "Pay Now",
    "secure_badge": "256-bit Encryption"
  }
}

// locales/fr/common.json (WRD101 Error: missing 'checkout.secure_badge')
{
  "checkout": {
    "pay_now": "Payer maintenant"
  }
}
```

#### Safe Remediation:
Add the missing key to `locales/fr/common.json` with an accurate translation or source-language fallback placeholder:
```json
// locales/fr/common.json
{
  "checkout": {
    "pay_now": "Payer maintenant",
    "secure_badge": "Chiffrement 256 bits"
  }
}
```

### Placeholder Mismatches (`WRD103`):
Occurs when placeholders in the translated string do not match those in the source string:
```json
// Source (en):
"welcome_user": "Welcome back, {username}!"

// Target (fr) - WRD103 Error: Expected {username}, found {user}
"welcome_user": "Bon retour, {user}!"
```

#### Safe Remediation:
Align placeholder variable names exactly to match the source key:
```json
// Target (fr) - Corrected:
"welcome_user": "Bon retour, {username}!"
```

---

## 5. Converting Physical to Logical CSS (`WRD302`)

### Standard Property Mapping Table:

```css
/* BEFORE (Flags WRD302): */
.sidebar {
  float: left;
  margin-left: 24px;
  margin-right: 12px;
  padding-left: 16px;
  border-left: 2px solid #e2e8f0;
  text-align: left;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
}

/* AFTER (Clean, bidirectional logical properties): */
.sidebar {
  float: inline-start;
  margin-inline-start: 24px;
  margin-inline-end: 12px;
  padding-inline-start: 16px;
  border-inline-start: 2px solid #e2e8f0;
  text-align: start;
}

.modal-close {
  position: absolute;
  top: 10px;
  inset-inline-end: 10px;
}
```

### Tailwind CSS Equivalents:
If the project uses Tailwind CSS:
- `ml-4` → `ms-4` (`margin-inline-start`)
- `mr-4` → `me-4` (`margin-inline-end`)
- `pl-2` → `ps-2` (`padding-inline-start`)
- `pr-2` → `pe-2` (`padding-inline-end`)
- `left-0` → `start-0` (`inset-inline-start`)
- `right-0` → `end-0` (`inset-inline-end`)
- `text-left` → `text-start`
- `text-right` → `text-end`
- `rounded-l` → `rounded-s`

---

## 6. Verifying the Changes

After applying any remediation:

```bash
# 1. Run audit
npx worldready audit

# Expected output:
# ✔ 0 errors, 0 warnings
```

If the audit passes with 0 new issues, document the fix with file, line, and rule IDs, and conclude the cycle.
