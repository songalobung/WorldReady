<div align="center">

# 🌐 WorldReady (Français)

### Système d'ingénierie d'internationalisation pour agents IA de codage
**Détecter. Corriger. Prouver.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

[English](../README.md) | [简体中文](README.zh-CN.md) | [العربية (RTL)](README.ar.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

<p align="center">
  <b>Un auditeur de préparation à l'internationalisation (i18n) et au RTL open source avec preuves exécutables pour agents IA et pipelines CI.</b>
</p>

</div>

---

## 🎯 La Proposition Centrale

> **Confiez un référentiel à un agent IA. WorldReady identifie les défaillances d'internationalisation, explique leur impact, propose des correctifs sécurisés et vérifie le résultat par des tests exécutables.**

La différence majeure est **la preuve, pas le simple conseil**. 

---

## 🌟 Les 5 Piliers Différenciateurs

1. **Audit indépendant des frameworks** : Analyse AST en profondeur de TypeScript/JSX, HTML, CSS et JSON.
2. **Gestion de pointe du RTL et du texte bidirectionnel** : Validation conforme aux standards W3C (propriétés logiques CSS comme `margin-inline-start`, balises `<bdi>`).
3. **Tests de comportement localisés (Unicode CLDR)** : Formats monétaires, dates, et règles de pluriel.
4. **Boucle de correction et vérification déterministe** : Audit ➔ Explication ➔ Proposition ➔ Application ➔ Ré-audit.
5. **Fonctionnement local à 100% sans dépendance d'API IA externe** : Confidentialité totale du code source.

---

## ⚡ Démarrage Rapide

```bash
# 1. Initialiser la configuration
npx worldready init

# 2. Lancer l'audit complet
npx worldready audit

# 3. Générer un rapport SARIF pour GitHub Code Scanning
npx worldready audit --format sarif -o worldready.sarif

# 4. Exécuter en mode CI strict
npx worldready ci

# 5. Tester l'interface avec la pseudo-localisation
npx worldready test --locale en-XA
npx worldready test --locale ar-XB
```

---

## 📄 Licence

Distribué sous licence **Apache License 2.0**. Consultez [LICENSE](../LICENSE).

