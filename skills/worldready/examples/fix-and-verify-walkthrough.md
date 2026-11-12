# WorldReady Fix-and-Verify Walkthrough

This example demonstrates the complete 5-step fix-and-verify workflow in action on a real React & i18next application.

---

## Initial State: Codebase with i18n Defects

The repository contains:
1. `src/components/NotificationBanner.tsx`: Hardcoded button text (`WRD001`) and concatenated message (`WRD002`).
2. `public/locales/en/common.json` vs `public/locales/fr/common.json`: Missing translation key (`WRD101`) and placeholder mismatch (`WRD103`).
3. `src/styles/banner.css`: Physical CSS `margin-left` and `padding-right` while targeting Arabic (`ar`) (`WRD302`).

---

## Step 1: Execute Audit

The agent executes:
```bash
npx worldready audit
```

### Audit Output:
```text
WorldReady Audit Report (version 0.1.0)
Scanned 14 files across 4 locales (en, fr, ar, de)

[ERROR] WRD101: Missing translation key 'banner.dismiss_action' in target locale 'fr'
  at public/locales/fr/common.json:1

[ERROR] WRD103: Placeholder mismatch for key 'banner.welcome_notice' in locale 'fr'
  Expected: {name}, Actual: {username}
  at public/locales/fr/common.json:12

[WARNING] WRD001: Hard-coded UI text "Dismiss notification" found in JSX element
  at src/components/NotificationBanner.tsx:18

[WARNING] WRD002: Dynamic text concatenation in UI render expression
  at src/components/NotificationBanner.tsx:14

[WARNING] WRD302: Physical CSS direction property 'margin-left: 12px' used while targeting RTL locales (ar)
  at src/styles/banner.css:6

Summary: 2 errors, 3 warnings, 0 suggestions (5 findings total)
```

---

## Step 2: Explain Findings

The agent explains each finding to the user before editing:

1. **`WRD101` in `fr/common.json`**: Key `banner.dismiss_action` exists in English (`en`) but is missing from French (`fr`). French users will see an untranslated fallback key.
2. **`WRD103` in `fr/common.json`**: Key `banner.welcome_notice` uses `{username}` in French, but the code and English catalog pass `{name}`. At runtime, the placeholder will not interpolate.
3. **`WRD001` & `WRD002` in `NotificationBanner.tsx`**: Line 14 concatenates `"Welcome " + user.name`, and line 18 contains raw text `<button>Dismiss notification</button>`.
4. **`WRD302` in `banner.css`**: `margin-left: 12px` fails to mirror in Arabic (`ar`), causing incorrect spacing in RTL mode.

---

## Step 3: Propose Safe Fixes

The agent details the patch plan:
- Add `banner.dismiss_action: "Ignorer la notification"` to `fr/common.json`.
- Correct placeholder `{username}` to `{name}` in `fr/common.json`.
- Refactor `NotificationBanner.tsx` to use `t('banner.welcome_notice', { name: user.name })` and `t('banner.dismiss_action')`.
- Replace `margin-left: 12px` with `margin-inline-start: 12px` in `banner.css`.

---

## Step 4: Apply Fixes

### 1. Update `public/locales/fr/common.json`:
```json
{
  "banner": {
    "welcome_notice": "Bienvenue, {name} !",
    "dismiss_action": "Ignorer la notification"
  }
}
```

### 2. Update `src/components/NotificationBanner.tsx`:
```tsx
import { useTranslation } from 'react-i18next';

export function NotificationBanner({ user }: { user: { name: string } }) {
  const { t } = useTranslation('common');

  return (
    <div className="banner-container">
      <span>{t('banner.welcome_notice', { name: user.name })}</span>
      <button onClick={() => {}}>{t('banner.dismiss_action')}</button>
    </div>
  );
}
```

### 3. Update `src/styles/banner.css`:
```css
.banner-container {
  display: flex;
  align-items: center;
  margin-inline-start: 12px;
  padding-inline-end: 16px;
}
```

---

## Step 5: Re-Audit and Verify

The agent re-runs the audit:
```bash
npx worldready audit
```

### Output:
```text
WorldReady Audit Report (version 0.1.0)
Scanned 14 files across 4 locales (en, fr, ar, de)

✔ 0 errors, 0 warnings, 0 suggestions (0 findings total)
Audit passed with zero regressions.
```

### Result:
All 5 findings verified resolved with deterministic evidence. No guesswork, no untested advice.
