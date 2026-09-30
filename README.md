# Sotto · Design System & Arquitectura de Información

| Carpeta | Contenido |
|---|---|
| `docs/01-information-architecture.md` | Los 4 sistemas de AI (organización, etiquetado, navegación, búsqueda) + modelo de jerarquía |
| `docs/02-design-system.md` | Tokens en 3 niveles + Atomic Design (átomos → pages) + gobernanza |
| `tokens/` | Fuente de verdad (W3C DTCG): `global` → `semantic` (dark/light) → `component` |
| `build/` | `build-tokens.mjs` genera `tokens.css`, `tokens.ts`, `tokens.resolved.json` |
| `mockup/index.html` | Pantalla "Guiones" interactiva (búsqueda, facetas, tema, sidebar colapsable); solo usa tokens |

```bash
node design_system/build/build-tokens.mjs   # regenerar build/
# abrir design_system/mockup/index.html en el navegador
```

Los valores replican `lib/core/design/tokens.dart`; ver la tabla de equivalencias en `docs/02-design-system.md`.
