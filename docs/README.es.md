<div align="center">

# 🌐 WorldReady (Español)

### Sistema de Ingeniería de Internacionalización para Agentes de IA
**Encuéntralo. Corrígelo. Pruébalo.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

[English](../README.md) | [简体中文](README.zh-CN.md) | [العربية (RTL)](README.ar.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

<p align="center">
  <b>Un auditor de internacionalización (i18n) y soporte RTL de código abierto con pruebas ejecutables para agentes de código y entornos de integración continua (CI).</b>
</p>

</div>

---

## 🎯 La Propuesta Principal

> **Entrega un repositorio a un agente de código con IA. WorldReady identifica fallos de internacionalización, explica su impacto, propone soluciones seguras y verifica el resultado mediante pruebas ejecutables.**

El diferenciador clave es **la prueba, no el consejo**.

No basta con que un modelo de lenguaje diga *"tu diseño en árabe se ve bien"*. WorldReady genera comprobaciones reproducibles, evidencias con archivo y línea, y validaciones directas en el árbol de sintaxis abstracta (AST).

---

## 🌟 Los Cinco Pilares Diferenciadores

1. **Auditoría independiente del framework**: Basado en análisis de AST de TypeScript/JavaScript (TSX/JSX), HTML (parse5), CSS (PostCSS) y catálogos JSON/ICU sin expresiones regulares frágiles.
2. **Corrección RTL y bidireccional de primer nivel**: La dirección es una propiedad del **sistema de escritura**, no solo del idioma. Inspecciona declaraciones `dir`, propiedades físicas de CSS (`margin-left` frente a `margin-inline-start`) y aislamiento de contenido dinámico mediante `<bdi>`.
3. **Validación real de comportamiento de locale**: Con respaldo en el estándar Unicode CLDR para fechas, monedas, números y reglas de pluralización.
4. **Ciclo de corrección y verificación**: `Auditar ➔ Explicar ➔ Proponer ➔ Aplicar ➔ Re-auditar`.
5. **Ejecución 100% local sin dependencias de APIs de IA**: El motor opera de forma determinista y local, garantizando privacidad absoluta del código fuente.

---

## ⚡ Inicio Rápido

```bash
# 1. Inicializar configuración
npx worldready init

# 2. Ejecutar auditoría i18n y RTL
npx worldready audit

# 3. Auditar idiomas objetivo
npx worldready audit --locales en,es,ar,fr

# 4. Generar reporte SARIF para GitHub
npx worldready audit --format sarif -o worldready.sarif

# 5. Ejecutar en CI con código de salida estricto
npx worldready ci

# 6. Probar resiliencia de interfaz con seudo-localización
npx worldready test --locale en-XA
npx worldready test --locale ar-XB
```

---

## 📄 Licencia

Publicado bajo la licencia **Apache License 2.0**. Consulta el archivo [LICENSE](../LICENSE) para más detalles.
