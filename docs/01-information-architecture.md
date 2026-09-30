# 01 · Arquitectura de Información (AI) — Sotto

> **Leyenda:** lo no marcado describe el código actual; lo marcado *(propuesto)* es diseño objetivo aún no implementado (breadcrumbs, facetas, índice con pesos, BottomNav).

Fuente de verdad de rutas: `lib/app/router.dart`. Fuente de verdad de ajustes: `enum SettingsPage` en `lib/features/settings/settings_screen.dart`.
Sotto es una app de escritorio (Windows/macOS/Linux, ventana mínima 960×600) con una ventana secundaria: el **overlay en vivo**.

---

## 0. Modelo de jerarquía

Sotto usa un modelo **híbrido**, cada zona con el modelo que mejor se ajusta a su tarea:

| Zona | Modelo | Por qué |
|---|---|---|
| Biblioteca (guiones, colecciones, archivo, sesiones) | **Jerárquico estricto** (árbol de 3 niveles máx.) + **facetado** en las listas | El contenido tiene contenedores naturales (colección → guion) y se filtra por atributos ortogonales |
| Ajustes | **Jerárquico plano** (1 nivel de 8 páginas, agrupadas en *En vivo* / *Sistema*) | Lista corta, escaneable, con búsqueda transversal |
| Ciclo de un guion (escribir → preparar → ensayar → presentar) | **Secuencial lineal** (con salto libre entre pestañas) | Es un flujo de trabajo con orden natural |
| Formularios / Chat | **Hub-and-spoke** (herramientas independientes desde la sidebar) | Son funciones opt-in, sin relación jerárquica entre sí |
| Overlay en vivo | **Sin navegación** (superficie de una sola tarea; solo controles al hover) | No debe competir con la presentación |

### Árbol de organización (sitemap)

```
Sotto
├─ Biblioteca                       shell: LibraryShell (sidebar + contenido)
│  ├─ Inicio                        /
│  ├─ Guiones                       /scripts
│  │   └─ Guion                     /script/:id            (pantalla completa, sin sidebar)
│  │       ├─ Escribir              ?tab=write
│  │       ├─ Preparar              ?tab=prep
│  │       └─ Ensayos               ?tab=rehearsals
│  ├─ Colecciones
│  │   └─ Colección                 /collections/:id
│  ├─ Archivo                       /archive
│  ├─ Sesiones                      /sessions
│  ├─ Chat            (opt-in)      /chat
│  └─ Formularios     (opt-in)      /forms
├─ Ajustes                          /settings/:page
│  ├─ En vivo:  shortcuts · appearance · voice · answers
│  └─ Sistema:  forms · general · integrations · privacy
└─ Overlay en vivo                  ventana nativa independiente (LiveController)
```

Profundidad máxima: **3 clics** desde Inicio hasta cualquier ajuste o pestaña de guion (Regla: *ninguna tarea frecuente a más de 2 clics*).

### Flujo de layouts principales

```
                ┌───────────────────────────── TitleBar 52px ─────────────────────────────┐
LibraryShell:   │ Sidebar 240/56 │            Contenido (margen 40)                        │
                └─────────────────────────────────────────────────────────────────────────┘
EditorScreen:     TitleBar (BackLink + título + Tabs) │ Contenido │ Inspector 360–400
SettingsScreen:   TitleBar (BackLink)                 │ Lista de páginas + búsqueda │ Página
Overlay:          Ventana flotante 560×232, click-through, sin chrome
```

`Home → (abrir guion) → Editor (write ⇄ prep ⇄ rehearsals) → Presentar → Overlay → Fin → Sessions (revisión)`

---

## 1. Sistema de Organización

**Esquemas** (cómo se agrupa el contenido):

| Esquema | Aplicación |
|---|---|
| **Por tema/contenedor** (jerárquico) | Colecciones → guiones |
| **Por estado (ciclo de vida)** | Guion: `activo` / `archivado`; Sesión: `en curso` / `finalizada` |
| **Por tiempo** (cronológico) | Inicio: *Recientes*; Sesiones: por fecha desc. |
| **Por tarea (funcional)** | Ajustes agrupados *En vivo* vs *Sistema* |
| **Por preparación** (`Readiness`, `CheckLevel.ok/warn/missing`) | Checklist por guion en el Inspector (`features/library/readiness.dart`). *Propuesto:* exponerlo como faceta `draft → ready → rehearsed` |

**Esquemas de organización:** *exacto* (estado, colección, fecha) y *ambiguo* (tema, etiquetas libres). Lo ambiguo se resuelve con búsqueda + facetas, no con más niveles.

**Reglas de estructura**
1. Un guion pertenece a **0 o 1 colección** (evita ambigüedad de ubicación); las etiquetas cubren la multi-pertenencia.
2. Archivar no es borrar: el guion sale de `/scripts` y vive en `/archive` (reversible).
3. Las funciones opt-in (Chat, Formularios) solo aparecen en la sidebar si se activan en Ajustes › General / Formularios.
4. La sidebar tiene 3 bloques: **Trabajo** (Inicio, Guiones, Sesiones) · **Herramientas** (Chat, Formularios) · **Colecciones** (dinámico) + pie fijo (Archivo, Ajustes).

## 2. Sistema de Etiquetado

**Principios:** un concepto = un término (en + es, mismas claves l10n); verbos en imperativo para acciones; sustantivos para destinos; máximo 2 palabras en navegación.

| Concepto | Etiqueta ES | Etiqueta EN | ID de ruta / enum | Clave l10n |
|---|---|---|---|---|
| Inicio | Inicio | Home | `/` | `navHome` |
| Guiones | Guiones | Scripts | `/scripts` | `navAllScripts` |
| Archivo | Archivo | Archive | `/archive` | `navArchive` |
| Colecciones | Colecciones | Collections | `/collections/:id` | `navCollections` |
| Sesiones | Sesiones | Sessions | `/sessions` | `navSessions` |
| Formularios | Formularios | Forms | `/forms` | `navForms` |
| Pestañas del guion | Escribir · Preparar · Ensayos | Write · Prep · Rehearsals | `EditorTab.write/prep/rehearsals` | `tabWrite` · `tabQaPrep` · `tabRehearsals` |
| Ajustes | Atajos, Apariencia, Voz, Respuestas, Formularios, General, Integraciones, Privacidad | Shortcuts, Appearance, Voice, Answers, Forms, General, Integrations, Privacy | `SettingsPage.*` | `set*` |

**Convenciones de nomenclatura técnica**

| Ámbito | Convención | Ejemplo |
|---|---|---|
| Rutas | `kebab-case`, sustantivo plural para listas, `:id` para recurso | `/collections/:id` |
| Query params | `camelCase`, valores = nombre del enum | `?tab=prep` |
| Enums de página/pestaña | `lowerCamelCase`, = último segmento de ruta | `SettingsPage.answers` → `/settings/answers` |
| Claves l10n | `<ámbito><Concepto>` | `navCollections`, `setVoice` |
| Design tokens (CSS) | `--sotto-<nivel-semántico>-<propiedad>-<estado>` | `--sotto-button-primary-bg-hover` |
| Tokens (JSON/TS) | `dot.path` = mismo path | `button.primary.bg.hover` |
| Componentes Flutter | `Sotto<Nombre>` para átomos con equivalente Material | `SottoButton`, `SottoToggle` |

**Vocabulario controlado de estados** (usar siempre estos, nunca sinónimos): `draft`, `ready`, `rehearsed`, `archived`, `live`, `paused`, `finished`.

**Vocabulario de señales de color** (ligado a tokens): `cue` (ámbar = "dónde estás"), `live-capture` (rojo = micrófono capturando), `confirmed` (verde = confirmación sobria).

## 3. Sistema de Navegación

### 3.1 Global (siempre presente en su shell)

| Mecanismo | Dónde | Especificación | Token(s) |
|---|---|---|---|
| **Sidebar** | LibraryShell | 240 px, colapsable a 56 px (solo iconos + tooltip). Item activo: fondo `wash.press` + barra `signal.cue` | `nav.sidebar.*`, `nav.item.*` |
| **TopBar / TitleBar** | Todas las ventanas | 52 px, zona de arrastre, `CaptionButtons` (Win/Linux). Contiene BackLink, título de contexto y acciones primarias | `nav.topbar.*` |
| **BottomNav** | *Reservado* — solo si se porta a móvil/tablet (< 640 px). En escritorio se sustituye por la sidebar colapsada. Máx. 4 destinos: Inicio · Guiones · Sesiones · Ajustes | — |
| **Atajos globales** | `_GlobalShortcuts` (`app.dart`) | Comandos sin ratón; los atajos en vivo se configuran en Ajustes › Atajos | `keycap.*` |

### 3.2 Contextual

| Mecanismo | Uso | Regla |
|---|---|---|
| **Breadcrumbs** *(propuesto)* | Guion dentro de colección: `Colecciones › Keynote Q3 › Guion` | Solo si profundidad ≥ 3. El último nivel no es enlace. Máx. 3 niveles visibles (el resto colapsa a `…`) |
| **Tabs** | Editor (Escribir / Preparar / Ensayos) — estado en URL `?tab=` | Indicador `nav.tab.indicator`. Cambiar de pestaña no pierde el estado del guion |
| **BackLink** | Editor y Ajustes | Siempre vuelve al origen (`context.pop`), no a una ruta fija |
| **Lista lateral de ajustes** | Settings | 8 páginas, 2 grupos, + búsqueda |
| **Menús contextuales** (clic derecho / `⋯`) | Tarjeta o fila de guion: Abrir · Renombrar · Mover a colección › · Archivar · Eliminar | Acciones destructivas al final, separadas, con confirmación |
| **Inspector** | Panel derecho del Editor 360–400 px | Metadatos y preparación del guion actual |

### 3.3 Reglas de orientación
- Siempre visible **dónde estoy** (item activo en sidebar / tab activa / título en TopBar) y **cómo volver**.
- La transición entre shells usa fade `Motion.snappy` (160 ms).
- El overlay nunca muestra navegación; solo controles al hover (`hoverIntent` 150 ms → `hoverHide` 800 ms).

## 4. Sistema de Búsqueda

### 4.1 Superficies

| Superficie | Alcance | Disparador |
|---|---|---|
| **Buscador de guiones** (`ScriptListScreen`) | Título, cuerpo, etiquetas | Campo en cabecera de lista · `Ctrl/⌘ K` (atajo ya registrado en `library_shell.dart`) |
| **Buscador de ajustes** (`_SettingsSearch`) | Título de página + `keywords` bilingües | Campo superior en Ajustes |
| **Filtros facetados** *(propuesto; hoy solo `LibraryFilter`: todos / archivo / colección)* | Estado · Colección · Preparación · Fecha | Chips bajo el buscador |
| **Ordenación** | Recientes (def.) · Nombre · Última sesión | Select alineado a la derecha |

### 4.2 Lógica de indexación *(propuesta; el buscador de ajustes ya usa `keywords` bilingües)*

```
Documento indexable (guion)
  id, title (peso 3), tags[] (peso 2), body (peso 1), collectionId, status,
  readiness, updatedAt, lastSessionAt
Documento indexable (ajuste)
  page (SettingsPage), title (peso 3), keywords (peso 2)   ← ya existe, en+es en la misma cadena
```

1. **Normalización:** minúsculas + quitar diacríticos (`é→e`) + trim; así `configuración` = `configuracion`.
2. **Tokenización:** por espacios/puntuación; búsqueda por **prefijo** (`atal` → `atajos`).
3. **Consulta:** AND entre tokens; puntuación = Σ peso del campo; desempate por `updatedAt` desc.
4. **Facetas:** AND entre facetas distintas, OR dentro de la misma faceta.
5. **Sin resultados:** mostrar la consulta, sugerir quitar filtros activos (con contador) y enlace *Crear guion "…"*.
6. **Índice en memoria** reconstruido al cambiar el repositorio (`LocalStore`); ~O(n) suficiente hasta miles de guiones.

### 4.3 Esquema de consulta (URL / estado) *(propuesto)*

```
/scripts?q=keynote&status=active&collection=c_123&readiness=rehearsed&sort=recent
```

`q` texto libre · `status` = `active|archived` · `collection` = id · `readiness` = `draft|ready|rehearsed` · `sort` = `recent|name|lastSession`.
Los filtros son parte de la URL para que sean enlazables y restaurables al volver (BackLink).

---

## Trazabilidad con el código

| Concepto AI | Archivo |
|---|---|
| Rutas / shell | `lib/app/router.dart`, `lib/features/library/library_shell.dart` |
| Items de navegación | `lib/core/widgets/nav.dart` (`NavItem`, `NavHeading`, `BackLink`) |
| Ajustes y búsqueda | `lib/features/settings/settings_screen.dart` |
| Constantes de layout | `Layout` en `lib/core/design/tokens.dart` ↔ `size.*` en `tokens/global.tokens.json` |
