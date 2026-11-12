<div align="center">

# 🌐 WorldReady (Deutsch)

### Internationalisierungs-Engineering für KI-Coding-Agenten
**Erkennen. Beheben. Nachweisen.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

[English](../README.md) | [简体中文](README.zh-CN.md) | [العربية (RTL)](README.ar.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

<p align="center">
  <b>Ein quelloffener Auditor für Internationalisierungs- (i18n) und RTL-Bereitschaft mit nachweisbaren Tests für KI-Agenten und CI-Pipelines.</b>
</p>

</div>

---

## 🎯 Das Kernversprechen

> **Geben Sie einem KI-Coding-Agenten ein Repository. WorldReady identifiziert Internationalisierungsfehler, erklärt deren Auswirkungen, schlägt sichere Fehlerbehebungen vor und verifiziert das Ergebnis mit ausführbaren Tests.**

Der entscheidende Unterschied ist der **Beweis, nicht nur Ratschlag**.

---

## 🌟 Die Fünf Kernmerkmale

1. **Framework-unabhängige AST-Analyse**: Tiefenanalyse von TypeScript/JSX, HTML, CSS und JSON-Katalogen ohne fehleranfälliges Regex.
2. **Erstklassige RTL- und BiDi-Unterstützung**: Erkennt fehlende `dir`-Attribute und physische CSS-Eigenschaften (`margin-left`) und empfiehlt logische Eigenschaften (`margin-inline-start`).
3. **Echtes Locale-Verhalten nach Unicode CLDR**: Prüfung von Zahlen-, Datums- und Währungsformaten sowie Pluralregeln.
4. **Deterministische Behebungs- und Verifikationsschleife**: Audit ➔ Erklärung ➔ Lösungsvorschlag ➔ Anwendung ➔ Re-Audit.
5. **Vollständig lokal & unabhängig von externen KI-APIs**: Garantiert maximalen Schutz Ihres Quellcodes.

---

## ⚡ Schnellstart

```bash
# 1. Konfiguration initialisieren
npx worldready init

# 2. Audit ausführen
npx worldready audit

# 3. SARIF-Bericht für GitHub Code Scanning erstellen
npx worldready audit --format sarif -o worldready.sarif

# 4. Strenger CI-Lauf
npx worldready ci

# 5. UI-Stresstest mit Pseudo-Lokalisierung
npx worldready test --locale en-XA
npx worldready test --locale ar-XB
```

---

## 📄 Lizenz

Lizenziert unter der **Apache License, Version 2.0**. Siehe [LICENSE](../LICENSE).

