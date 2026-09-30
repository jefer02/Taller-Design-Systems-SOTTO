# 02 · Arquitectura del Design System — Sotto

Identidad: **"Ghost light on a dark stage"** — una luz tenue sobre un escenario oscuro. Dos temas: **Stage** (oscuro, por defecto) y **House lights** (claro).
Implementación actual en Flutter: `lib/core/design/` (tokens, tipografía, tema, iconos) y `lib/core/widgets/`.
Los tokens de este directorio (`tokens/*.json`) son la **fuente agnóstica de plataforma**; `build/` los compila a CSS/TS y el mockup los consume.

---

## 1. Design Tokens en 3 niveles

```
 NIVEL 1 · Global        color.graphite.900 = #131210      (qué valor)         tokens/global.tokens.json
        ▼ alias
 NIVEL 2 · Semántico     color.surface.panel = {color.graphite.900}   (para qué)  tokens/semantic.tokens.json
        ▼ alias                (cambia por tema: dark / light)
 NIVEL 3 · Componente    nav.sidebar.bg = {color.surface.panel}       (dónde)    tokens/component.tokens.json
```

**Reglas**
1. El código de producto **solo** consume niveles 2 y 3. Nunca `graphite.*` ni `#hex` directamente.
2. Un componente nunca referencia un token global; siempre pasa por semántico (garantiza tema claro/oscuro gratis).
3. Los alias solo bajan (3 → 2 → 1). Sin ciclos: el build falla si los detecta.
4. Formato: [W3C DTCG](https://design-tokens.github.io/community-group/format/) (`$value`, `$type`, `$description`).
5. Añadir un valor nuevo = primero global, luego semántico si tiene rol, y solo entonces componente.

### Ejemplos de cadena completa

| Componente | → Semántico | → Global (dark) | → Global (light) |
|---|---|---|---|
| `button.primary.bg.default` | `color.signal.cue` | `tungsten.300` `#F4B55C` | `tungsten.400` `#F3AA40` |
| `nav.sidebar.bg` | `color.surface.panel` | `graphite.900` `#131210` | `graphite.75` `#F2F0ED` |
| `input.border.focus` | `color.focus-ring` | `tungsten.300` | `tungsten.400` |
| `chip.fg.live` | `color.signal.live-capture` | `tally.400` `#F96050` | `tally.650` `#CC291F` |

### Catálogo semántico

| Grupo | Tokens | Rol |
|---|---|---|
| `color.surface.*` | `ground` `panel` `raised` `float` | Capas de elevación: fondo → panel lateral → tarjeta → flotante |
| `color.line.*` | `hairline` `control` `emphasis` | Bordes: divisor sutil → borde de control → énfasis |
| `color.ink.*` | `primary` `secondary` `tertiary` `disabled` | Jerarquía de texto |
| `color.signal.*` | `cue` `cue-text` `on-cue` `cue-hover` `cue-pressed` `live-capture` `confirmed` | Estados con significado (ámbar / rojo / verde) |
| `color.wash.*` | `hover` `press` | Capas translúcidas de interacción (botones fantasma, filas) |
| `space.inline/stack/inset.*` | `xs…xl`, `control`, `card`, `page` | Espaciado por intención (no por número) |
| `corner.*` | `chip` `control` `menu` `card` `sheet` | Radios por tipo de elemento |
| `text.*` | `display` `title-1..3` `body` `body-strong` `caption` `micro` `mono` `mono-label` | Roles tipográficos (size/line/weight/tracking/family) |
| `motion.*` | `hover` `reveal` `move` `leave` | Duración + curva por intención |

**Accesibilidad (medido, WCAG):** `on-cue` sobre `cue` 9.6:1 (dark) / 8.8:1 (light); `ink.primary` sobre `surface.ground` 17.0:1 / 16.4:1; `ink.tertiary` sobre `ground` 5.9:1 / 5.2:1 (AA para texto normal); el estado de color nunca es la única señal (siempre icono/texto: p. ej. punto rojo + "REC").

### Compilar

```bash
node design_system/build/build-tokens.mjs
# → build/tokens.css  (custom properties --sotto-*, :root = dark, [data-theme="light"])
# → build/tokens.ts   (objeto tipado as const: tokens.dark.button.primary.bg.default)
# → build/tokens.resolved.json (todo resuelto, para Figma Tokens Studio / Style Dictionary)
```

Uso en TS: `import { tokens } from './build/tokens'; tokens.dark.color.surface.panel`
Uso en CSS: `background: var(--sotto-nav-sidebar-bg);`

### Equivalencia con Flutter (existente)

| JSON | Dart (`lib/core/design/`) |
|---|---|
| `color.graphite.* / tungsten.* / tally.* / go.*` | `Primitives.*` |
| `color.surface/line/ink/signal/wash` (dark / light) | `SottoPalette.stage` / `SottoPalette.houseLights` |
| `spacing.*` | `Space.s1…s20` |
| `radius.*` | `Radii.*` |
| `duration.*` / `easing.*` | `Motion.*` |
| `size.*` | `Layout.*` |
| `text.*` | `TypeScale.*` (Geist / GeistMono / Atkinson Hyperlegible Next) |

> Sincronización: cuando cambie un valor, editarlo en JSON **y** en `tokens.dart` (pendiente: generador Dart desde el JSON para eliminar la doble edición).

---

## 2. Atomic Design

```
Átomos ─► Moléculas ─► Organismos ─► Templates ─► Pages
```

### 2.1 Átomos
Elementos indivisibles, sin lógica de negocio. Consumen solo tokens de componente.

| Átomo | Variantes / estados | Tokens principales | Flutter |
|---|---|---|---|
| **Button** | primary · secondary · ghost · ×2 tamaños · default/hover/pressed/focus/disabled | `button.*` | `SottoButton` |
| **IconButton** | ghost, con tooltip | `button.ghost.*` | `SottoIconButton` |
| **TextLink** | default/hover | `color.signal.cue-text` | `TextLink` |
| **Input** (texto) | default/hover/focus/error/disabled | `input.*` | `SottoTextField` |
| **Select** | idem input + chevron | `input.*`, `corner.menu` | `SottoSelect` |
| **Toggle / Checkbox / Radio** | on/off/disabled | `signal.cue`, `line.control` | `SottoToggle`, `SottoCheckbox`, `SottoRadio` |
| **Slider** | — | `signal.cue`, `line.control` | `SottoSlider` |
| **Typography** | display, title-1..3, body, caption, micro, mono | `text.*` | `TypeScale` |
| **Icon** | 16 px | `color.ink.*`, `size.icon` | `SottoIcons` |
| **Chip / StatusChip / CueChip** | default · cue · confirmed · live | `chip.*` | `StatusChip`, `SourceChip`, `CueChip` |
| **Keycap** | — | `keycap.*` | `Keycap` |
| **Divider / SectionLabel** | — | `line.hairline`, `text.micro` | `SectionLabel` |
| **LevelMeter** | mic input | `signal.live-capture` | `LevelMeter` |

### 2.2 Moléculas
Combinación de 2–4 átomos con una sola función.

| Molécula | Compuesta por | Flutter |
|---|---|---|
| **SearchBar** | Icon + Input + Keycap (`⌘K`) + botón limpiar | `SottoTextField` + `Keycap` (`_SettingsSearch`) |
| **NavItem** | Icon + label + (badge) | `NavItem` |
| **SettingRow** | label + descripción + control (Toggle/Select/Slider) | `SettingRow` |
| **SegmentedControl** | N × Button-ghost con selección | `SegmentedControl` |
| **ScriptCard** (tarjeta simple) | Title + meta (caption) + Chip de estado + IconButton `⋯` | `SurfaceCard` + átomos |
| **KeyCombo** | N × Keycap + separador | `KeyCombo` |
| **Breadcrumb** *(propuesto)* | TextLink + separador + texto actual | — |
| **Tab** | label + indicador | (dentro de `SectionBar`) |
| **FormField** | label + Input + helper/error | — *(propuesto: envolver `SottoTextField`)* |

### 2.3 Organismos
Secciones autónomas de UI, con estado propio.

| Organismo | Contenido | Flutter |
|---|---|---|
| **Sidebar** | logo + NavItems agrupados + Colecciones + pie (Archivo/Ajustes) + toggle colapso | `LibraryShell` |
| **TopBar / TitleBar** | BackLink + título + acciones + CaptionButtons | `TitleBarArea`, `CaptionButtons` |
| **SectionBar** | Tabs contextuales del editor | `SectionBar` |
| **SettingsGroup** | SectionLabel + N × SettingRow en tarjeta | `SettingsGroup` |
| **DataTable** *(propuesto)* | header + filas (`table.*`) + ordenación + selección + estado vacío | — (hoy: listas de `SessionsScreen`) |
| **Formulario completo** | FormFields + validación + acciones (Cancelar / Guardar) | `forms_page`, `autofill_view` |
| **OverlayPanel** | texto por niveles de lectura (now/next/later/done) + hover controls | `overlay_screen`, `OverlayPalette` |
| **Inspector** | lista de Readiness + metadatos | `editor_inspector` |

### 2.4 Templates
Layouts sin datos reales; definen regiones y proporciones.

| Template | Regiones | Medidas |
|---|---|---|
| **T-Library** | Sidebar · TitleBar · Content (scroll) | 240/56 · 52 · margen 40 |
| **T-Editor** | TitleBar+Tabs · Canvas · Inspector | 52 · flex · 360–400 |
| **T-Settings** | TitleBar · Lista de páginas · Panel de página | 52 · 240 · flex (máx. 720 de lectura) |
| **T-Overlay** | Meta · Cue column · Texto | 560×232 · 36 · 15 · inset 34 |

### 2.5 Pages
Templates + datos reales o de prueba.

| Page | Template | Ruta | Datos de prueba (mockup) |
|---|---|---|---|
| Inicio | T-Library | `/` | 3 recientes, sesión reciente |
| Guiones | T-Library | `/scripts` | 6 guiones con estados variados |
| Sesiones | T-Library | `/sessions` | tabla de 5 sesiones |
| Editor | T-Editor | `/script/:id` | texto con cue + Readiness |
| Ajustes › Voz | T-Settings | `/settings/voice` | formulario de 4 filas |
| Overlay | T-Overlay | ventana nativa | 4 líneas (done/now/next/later) |

---

## 3. Gobernanza

- **Estructura de carpetas del sistema**
  ```
  design_system/
  ├─ docs/          01 AI · 02 Design System
  ├─ tokens/        global · semantic · component  (fuente de verdad)
  ├─ build/         build-tokens.mjs → tokens.css · tokens.ts · tokens.resolved.json
  └─ mockup/        index.html (usa build/tokens.css)
  ```
- **Checklist para un componente nuevo:** (1) ¿existe un átomo/molécula que lo cubra? (2) tokens de componente añadidos en `component.tokens.json`; (3) 5 estados (default, hover, pressed, focus, disabled); (4) probado en ambos temas; (5) foco visible con `focus-ring`; (6) etiquetas en `en` y `es`; (7) `prefers-reduced-motion` → `Motion.reducedMotionFade` (120 ms).
- **Densidad:** compacta por diseño (13 px base, controles 32 px) — es una herramienta de escritorio junto a una presentación.
- **Versionado:** SemVer del paquete de tokens; cambio de valor = *patch*, renombrar/eliminar token = *major*.
