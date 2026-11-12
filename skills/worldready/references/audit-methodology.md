# WorldReady Audit Methodology

This document outlines the engineering architecture, parsing models, confidence scoring heuristics, and false-positive prevention mechanisms that power the WorldReady audit engine.

---

## 1. Why AST Parsing Over Regular Expressions

Traditional linters or naive i18n detection tools frequently rely on regular expression pattern matching (e.g. matching strings between quotes or HTML tags). While regex is fast, it fundamentally fails in modern UI engineering:

### Critical Flaws of Regex in i18n Auditing:
1. **Context Blindness**: A regex cannot determine whether `"Submit"` appears in a JSX button, an import statement (`import "styles/Submit.css"`), a TypeScript type union (`type Status = "Pending" | "Done"`), a database query, or a debug log (`console.log("Submit clicked")`).
2. **Template Literals and Nested Expressions**: In JSX and modern JavaScript, strings are often composed dynamically:
   ```tsx
   <div className={`card ${isActive ? 'active' : ''}`}>
     <span>{user.name ? `Welcome ${user.name}` : "Guest"}</span>
   </div>
   ```
   A regex cannot reliably isolate the human-readable text `"Welcome "` and `"Guest"` from CSS classes `'card'`, `'active'`, and object property accesses.
3. **Comment and String Escaping**: Regex struggles with multiline JSX comments `{/* TODO: text */}` vs rendered comments vs inline string escapes.

### The WorldReady AST Solution:
WorldReady uses full Abstract Syntax Tree (AST) parsers:
- **TypeScript / JavaScript**: Built on the TypeScript Compiler API (`typescript`). Traversing AST nodes allows inspection of node kinds (`ts.SyntaxKind.JsxText`, `ts.SyntaxKind.StringLiteral`, `ts.SyntaxKind.TemplateExpression`), parent hierarchy, call expressions, and type annotations.
- **HTML**: Built on `parse5` or standard DOM AST parsing to inspect elements, text nodes, and localized attribute specifications (`aria-label`, `title`, `placeholder`).
- **CSS**: Built on PostCSS to traverse declarations (`decl.prop`, `decl.value`), at-rules (`@media`, `@supports`), and selector rules.
- **Locale JSON**: Recursive key-value parser validating structure, interpolation syntax, and leaf-node types.

---

## 2. False Positive Prevention

A string literal in source code is not automatically user-facing. In fact, in a typical TypeScript codebase, over 80% of string literals represent internal identifiers, dictionary keys, API endpoints, CSS classes, or log messages.

WorldReady applies multi-layer semantic filtering before flagging an issue:

### Exclusion Layer 1: Code Context
A node is discarded if its AST ancestry contains:
- `ImportDeclaration` or `ExportDeclaration`:
  ```ts
  import { Button } from './components/Button'; // Ignored
  export const config = 'v1'; // Ignored
  ```
- `TypeNode` / Type Definitions:
  ```ts
  type Alignment = 'left' | 'right'; // Ignored
  ```
- Logger and Debug Calls:
  ```ts
  console.log("Database connection established"); // Ignored
  logger.warn("Payload empty"); // Ignored
  ```
- Comparison and Switch Statements:
  ```ts
  if (status === 'active') ... // Ignored
  ```

### Exclusion Layer 2: String Heuristics
Even within JSX or function parameters, string values are filtered if they match technical patterns:
- **Pure Numbers & Punctuation**: Strings with no alphabetic characters (e.g. `"123"`, `" / "`, `"-"`, `":"`).
- **URLs & Protocols**: `https://...`, `mailto:...`, `/api/v1/users`, `#section`.
- **CSS Class Identifiers / Tailwind**: Kebab-case tokens without whitespace (e.g. `flex-col`, `items-center`, `text-sm`).
- **File Extensions & Paths**: `.png`, `.svg`, `images/logo.svg`.
- **GUIDs & Hex Codes**: UUIDs, hex color codes (`#FFFFFF`, `#333`).

### Inclusion Layer: High-Confidence UI Anchors
Strings are marked with high confidence when:
1. They exist directly as a `JsxText` node with non-whitespace text (e.g. `<button>Save Changes</button>`).
2. They are passed to known UI attributes:
   - `aria-label="Close dialog"`
   - `placeholder="Enter your email"`
   - `title="Help tooltip"`
   - `alt="Company logo"`

---

## 3. Confidence Scoring Model

WorldReady findings include a `confidence` metric (float between `0.0` and `1.0`):

| Confidence Range | Classification | Engine Action | Recommended Developer Action |
| :--- | :--- | :--- | :--- |
| **0.90 – 1.00** | High | Fails CI when severity is `error`. Emitted as error/warning. | Must remediate immediately. Almost zero chance of being non-UI text. |
| **0.70 – 0.89** | Medium | Emitted as warning or suggestion. Does not fail build unless `--strict`. | Review during PR. Safe to suppress via baseline or ignore comment if intentional. |
| **Below 0.70** | Low | Filtered out or emitted as suggestions. | Non-blocking guidance. |

### Confidence Calculation Factors:
- **Direct JSX Text**: `0.95`
- **UI Attribute (`placeholder`, `aria-label`)**: `0.90`
- **Missing Translation Key in Target Locale**: `1.00` (Deterministic catalog diff)
- **Placeholder Name Mismatch in Target Locale**: `0.98` (Direct token extraction comparison)
- **Physical CSS Property (`margin-left`) with RTL locale declared**: `0.85`
- **Dynamic String Concatenation in JSX**: `0.85`

---

## 4. Scope and Project Discovery

The WorldReady discovery engine (`@worldready/parsers/src/discovery.ts`) identifies relevant project files based on framework conventions:

1. **Framework Auto-Detection**:
   - Next.js (`next.config.js`, `public/locales/`, `messages/`)
   - Vite / React / Vue / Svelte
   - Generic web apps (`locales/`, `i18n/`)
2. **Path Filtering**:
   - Default includes: `**/*.{ts,tsx,js,jsx,html,css,json}`
   - Default excludes: `node_modules/**`, `.next/**`, `dist/**`, `build/**`, `coverage/**`, `**/*.test.*`, `**/*.spec.*`
3. **Locale Catalog Association**:
   - Detects source locale (default `en`) and target locales (e.g. `fr`, `de`, `ar`, `ja`).
   - Maps translation files by locale directory or locale file suffix (e.g., `locales/en/common.json` or `locales/en.json`).

---

## 5. Baseline and Technical Debt Suppression

Large legacy codebases cannot immediately resolve 500 hardcoded strings or legacy CSS properties without slowing down active development.

WorldReady solves this via **Fingerprinted Baselines**:
1. Findings are hashed using a canonical SHA-256 fingerprint:
   $$\text{Fingerprint} = \text{SHA256}(\text{ruleId} + ":" + \text{file} + ":" + \text{message} + ":" + \text{key})$$
2. Saving baseline:
   ```bash
   npx worldready audit --save-baseline .worldready-baseline.json
   ```
3. Subsequent CI audits check only for **new** regressions:
   ```bash
   npx worldready audit --baseline .worldready-baseline.json
   ```
4. As legacy files are touched and fixed, the baseline can be refreshed, ratcheting down technical debt over time.
