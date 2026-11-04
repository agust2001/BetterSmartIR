---

description: "Lista de tareas para implementar el rediseño visual del panel"
---

# Tareas: Rediseño visual del panel

**Entrada**: Documentos de diseño en `specs/002-rediseno-panel/`

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [panel-ui.md](contracts/panel-ui.md)

**Tests**: Incluidos, porque el principio IV de la constitución los exige. Dentro de cada bloque, los
tests se escriben primero y deben fallar antes de implementar. La parte visual se comprueba con
[quickstart.md](quickstart.md).

**Organización**: Las tareas se agrupan por historia de usuario.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Historia]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Las referencias `R1` a `R10` apuntan a las decisiones de [research.md](research.md)

**Regla para todas las tareas**: conservar cada `data-action`, cada vista y el efecto de cada botón (FR-001
a FR-003). `panel-ui.md` define variantes, estados, tamaños y colores.

---

## Fase 1: Preparación

**Propósito**: Tener iconos y una forma de ver el panel sin Home Assistant.

- [X] T001 [P] Crear `tests/frontend/harness.html`: importa el panel desde `custom_components/better_smartir/frontend/`, simula `hass` con `callWS` y `states`, tiene un selector de tema con los valores predeterminados claro y oscuro de `research.md`, una opción para que el envío falle, y datos que cubren oscilación, un código sin comandos, un clima con nombre y modelo largos, y todos los modos (R10)
- [X] T002 [P] Crear `custom_components/better_smartir/frontend/icons.js` con los trazados copiados de `@mdi/js` 7.4.47, sin agregar dependencias al proyecto: los de la tabla de modos de `data-model.md` y los de las acciones del panel, con un comentario de atribución Apache-2.0 y una función que devuelve un `<svg>` con `aria-hidden="true"` (FR-008, FR-019, R7)

---

## Fase 2: Base común

**Propósito**: Estilos y botones que usan todas las pantallas.

**⚠️ CRÍTICO**: Ninguna historia puede empezar hasta terminar esta fase.

- [X] T003 Escribir `tests/frontend/contrast.test.js`: con los colores predeterminados de `research.md`, comprueba las proporciones exportadas por `styles.js`: 3:1 en iconos y bordes de cada modo, de éxito y de error sobre la tarjeta y sobre el fondo teñido, en claro y oscuro; y 4,5:1 en el texto de los botones llenos, en el texto del tema sobre el fondo teñido, y en el texto de error (FR-018, FR-022, R3, R4)
- [X] T004 Crear `custom_components/better_smartir/frontend/styles.js` con los estilos de `better-smartir-panel.js`, reescritos sobre variables de tema con valor de respaldo, y con las proporciones exportadas: fondo 16%, icono y borde 70%, botón principal 70% y botón destructivo 80%. Incluye tarjetas, espaciado en múltiplos de 4 píxeles, controles de 44 píxeles como mínimo y los colores `--state-climate-*-color` (FR-007, FR-017, FR-018, FR-021, FR-022, R2, R3, R4)
- [X] T005 Agregar a `custom_components/better_smartir/frontend/styles.js` las cuatro variantes de botón y los estados normal, cursor encima solo con `@media (hover: hover)`, presionado, foco de teclado con `:focus-visible` y deshabilitado (FR-010)
- [X] T006 Cambiar `_button` en `custom_components/better_smartir/frontend/better-smartir-panel.js` para aceptar variante, icono y nombre accesible, y `aria-pressed` en las opciones; importar `styles.js` y `icons.js`, y comprobar en `harness.html` que todas las pantallas siguen funcionando (FR-008, FR-010)

**Punto de control**: el panel usa los estilos nuevos, pasa el test de contraste y funciona igual.

---

## Fase 3: Historia de usuario 1 - Entender de un vistazo la pantalla de prueba (Prioridad: P1) 🎯 MVP

**Objetivo**: El modo y la temperatura destacan, y la acción principal es evidente en cada estado.

**Prueba independiente**: Abrir la pantalla de prueba con un código y comprobar que el modo, la temperatura y la acción principal destacan, y que todos los controles siguen ahí y hacen lo mismo.

### Tests de la historia 1

- [X] T007 [US1] Agregar a `tests/frontend/session.test.js` los tests de `primaryAction`, uno por cada regla de `data-model.md` y en su orden: `restart`, `next` sin selección, `worked`, `save`, `next` tras `not_responded`, y `on`; y que `sending` no cambia el resultado (FR-005, FR-006)

### Implementación de la historia 1

- [X] T008 [US1] Implementar `primaryAction` en `custom_components/better_smartir/frontend/session.js` (FR-005, FR-006, R8)
- [X] T009 [P] [US1] Cambiar en `custom_components/better_smartir/frontend/i18n.js`, en español e inglés, los textos de los botones de resultado a "Funcionó" y "No funcionó", y agregar los nombres accesibles de subir y bajar la temperatura
- [X] T010 [US1] Agregar a `custom_components/better_smartir/frontend/better-smartir-panel.js` la tarjeta destacada de la pantalla de prueba, con el nombre del modo, su icono, su color y la temperatura de 56 y 72 píxeles, sin mostrarla si el código no tiene comandos, y con color neutro si el modo no tiene uno propio (FR-012, FR-013, FR-023)
- [X] T011 [US1] Reorganizar la pantalla de prueba en `custom_components/better_smartir/frontend/better-smartir-panel.js` y `custom_components/better_smartir/frontend/styles.js`: una columna en celular y dos en pantallas anchas, con el mismo orden en el documento, y las opciones como pastillas con icono y marca de elegida (FR-007, FR-008, FR-020, FR-023, R9)
- [X] T012 [US1] Usar `primaryAction` en `_renderTest` y `_renderExhausted` de `custom_components/better_smartir/frontend/better-smartir-panel.js` para marcar como principal el único botón que corresponde, sin cambiar la posición de los demás (FR-005, FR-006)

**Punto de control**: la pantalla de prueba resuelve el problema principal por sí sola.

---

## Fase 4: Historia de usuario 2 - Ver al instante qué pasó con el comando (Prioridad: P2)

**Objetivo**: Mostrar de inmediato que el comando está saliendo, y después si se envió o falló.

**Prueba independiente**: Enviar un comando que funcione y otro que falle en `harness.html`, y comprobar que cada resultado se distingue de inmediato y sin depender solo del color.

- [X] T013 [US2] Mostrar en `custom_components/better_smartir/frontend/better-smartir-panel.js` y `custom_components/better_smartir/frontend/styles.js` el estado "enviando" solo en el botón que envía, con los demás controles de envío deshabilitados como hasta ahora (FR-011, FR-014)
- [X] T014 [US2] Crear en `custom_components/better_smartir/frontend/better-smartir-panel.js` la banda de resultado, en un espacio reservado, con icono y texto para enviando, enviado y falló, usando `role="status"` y `role="alert"`, sin decir que el aire respondió (FR-004, FR-015, FR-023, FR-026)
- [X] T015 [US2] Agregar a `custom_components/better_smartir/frontend/styles.js` las animaciones del indicador, las ondas sobre el modo y la entrada del resultado, de 400 ms como máximo, y anularlas todas con `prefers-reduced-motion: reduce` (FR-016, FR-027, R6)
- [X] T016 [US2] Recordar el foco en `custom_components/better_smartir/frontend/better-smartir-panel.js`: guardar la clave del último control con foco, recuperarla al dibujar, y si ya no existe o está deshabilitado pasar el foco a la acción principal, solo si el foco estaba dentro del panel (FR-024, FR-025, R5)

**Punto de control**: las Historias 1 y 2 funcionan.

---

## Fase 5: Historia de usuario 3 - Un panel coherente en todas las pantallas (Prioridad: P3)

**Objetivo**: Todas las pantallas se ven como parte de lo mismo y de Home Assistant.

**Prueba independiente**: Recorrer todas las pantallas en modo claro y oscuro, en celular y computadora, y solo con teclado.

- [X] T017 [US3] Rediseñar `_renderList` en `custom_components/better_smartir/frontend/better-smartir-panel.js`: una tarjeta por clima con icono, la misma información que hoy, y Agregar clima como acción principal, también sin climas (FR-005, FR-007, FR-008)
- [X] T018 [US3] Rediseñar `_renderSelect` en `custom_components/better_smartir/frontend/better-smartir-panel.js`, incluido el mensaje sin emisores, con Empezar a probar como acción principal (FR-005, FR-007)
- [X] T019 [US3] Rediseñar `_renderSave` y `_renderEdit` en `custom_components/better_smartir/frontend/better-smartir-panel.js`, con Guardar como acción principal y el resumen de comandos con icono (FR-005, FR-007, FR-008)
- [X] T020 [US3] Rediseñar `_renderDelete` en `custom_components/better_smartir/frontend/better-smartir-panel.js`, con Borrar en la variante destructiva (FR-005, FR-009)
- [X] T021 [US3] Ajustar `custom_components/better_smartir/frontend/styles.js` para que nombres y modelos largos, muchas opciones y el texto al 200% no causen desplazamiento horizontal entre 320 y 1920 píxeles (FR-020)
- [X] T022 [US3] Recorrer todas las pantallas en `tests/frontend/harness.html` solo con teclado y corregir en `custom_components/better_smartir/frontend/better-smartir-panel.js` cualquier problema de orden o de nombre accesible (FR-024)

**Punto de control**: las tres historias funcionan.

---

## Fase 6: Cierre

**Propósito**: Validar y preparar la versión.

- [X] T023 [P] Subir `version` a `0.2.0` en `custom_components/better_smartir/manifest.json`
- [X] T024 [P] Agregar a `README.md` la atribución de Material Design Icons, con su licencia Apache-2.0
- [ ] T025 Ejecutar todos los tests y los escenarios de la página de prueba de `specs/002-rediseno-panel/quickstart.md`, y comprobar que los tests anteriores no cambiaron lo que comprueban (SC-002 a SC-008, SC-009)
- [X] T026 Desplegar en Home Assistant real y repetir los escenarios de `specs/001-climas-ir-prueba-grafica/quickstart.md`, y el cambio de tema de `specs/002-rediseno-panel/quickstart.md` (SC-009)
- [ ] T027 Pedir a una persona que no conozca el panel que identifique la acción principal de cada pantalla, y registrar el resultado en `specs/002-rediseno-panel/research.md` (SC-001)
- [X] T028 Revisar el cumplimiento de `.specify/memory/constitution.md` y actualizar la tabla de `specs/002-rediseno-panel/plan.md`

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (Fase 1)**: sin dependencias.
- **Base común (Fase 2)**: depende de la Fase 1 y bloquea todas las historias.
- **Historia 1 (Fase 3)**: depende de la Fase 2.
- **Historia 2 (Fase 4)**: depende de la Historia 1, porque la respuesta se muestra en su pantalla y el foco usa `primaryAction`.
- **Historia 3 (Fase 5)**: depende de la Fase 2. T022 depende además de T016.
- **Cierre (Fase 6)**: depende de las tres historias.

### Dentro de cada fase

- T003 va antes que T004, y debe fallar porque `styles.js` todavía no existe.
- T007 va antes que T008.
- Las tareas sobre `better-smartir-panel.js` y `styles.js` modifican los mismos archivos y van en orden.

### Oportunidades de paralelismo

- Fase 1: T001 y T002.
- Historia 1: T009 junto con T007 y T008.
- Cierre: T023 y T024.

## Ejemplo de paralelismo: Historia 1

```text
En paralelo:
  T007 y luego T008 en session.test.js y session.js
  T009 en i18n.js

Después, en orden:
  T010, T011 y T012 en el panel
```

---

## Estrategia de implementación

### MVP primero

1. Completar las Fases 1 y 2.
2. Completar la Fase 3.
3. **Detenerse y validar** en `tests/frontend/harness.html`.

La Historia 1 ya resuelve el problema principal: entender qué hacer en la pantalla de prueba.

### Entrega incremental

1. Preparación y base común: el panel ya gana en botones y tema.
2. Historia 1: pantalla de prueba clara.
3. Historia 2: respuesta visual al enviar.
4. Historia 3: todas las pantallas coherentes.
5. Cierre: versión 0.2.0.

---

## Cobertura de requisitos

| Requisito | Tareas |
|---|---|
| FR-001 | Regla general, T025, T026 |
| FR-002 | Regla general, T026 |
| FR-003 | Regla general, T017 |
| FR-004 | T014 |
| FR-005 | T007, T008, T012, T017, T018, T019, T020 |
| FR-006 | T007, T008, T012 |
| FR-007 | T004, T011, T017, T018, T019 |
| FR-008 | T002, T006, T011, T017, T019 |
| FR-009 | T020 |
| FR-010 | T005, T006 |
| FR-011 | T013 |
| FR-012 | T010 |
| FR-013 | T010 |
| FR-014 | T013 |
| FR-015 | T014 |
| FR-016 | T015 |
| FR-017 | T004 |
| FR-018 | T003, T004 |
| FR-019 | T002 |
| FR-020 | T011, T021 |
| FR-021 | T004 |
| FR-022 | T003, T004 |
| FR-023 | T010, T011, T014 |
| FR-024 | T016, T022 |
| FR-025 | T016 |
| FR-026 | T014 |
| FR-027 | T015 |

## Notas

- Hacer un commit al terminar cada grupo lógico.
- Detenerse en cualquier punto de control para validar.
- T026 envía comandos reales al aire y T027 necesita a otra persona.
