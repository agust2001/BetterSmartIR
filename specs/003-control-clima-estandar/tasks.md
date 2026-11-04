---

description: "Lista de tareas para usar el control de clima estándar en la prueba"
---

# Tareas: Control de clima estándar en la prueba

**Entrada**: Documentos de diseño en `specs/003-control-clima-estandar/`

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [panel-control.md](contracts/panel-control.md)

**Tests**: Incluidos, porque el principio IV de la constitución los exige. Dentro de cada bloque, los
tests se escriben primero y deben fallar antes de implementar. El aspecto del control se comprueba con
[quickstart.md](quickstart.md) en Home Assistant real.

**Organización**: Las tareas se agrupan por historia de usuario.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Historia]**: Historia de usuario a la que pertenece (US1, US2, US3, US4)
- Las referencias `R1` a `R10` apuntan a las decisiones de [research.md](research.md)

**Regla para todas las tareas**: no cambiar la API WebSocket, el backend de Python, los datos guardados ni las
demás pantallas del panel.

---

## Fase 1: Preparación

**Propósito**: Fijar lo que deben cumplir el clima simulado y el frontend.

- [X] T001 [P] Crear `tests/fixtures/climate_parity.json`: para los códigos 1000 (sin oscilación), 1030 (con oscilación) y 1089 (con `on`), las opciones esperadas y escenarios de acciones con su acción enviada: apagado a un modo, cambio de modo, temperatura, ventilador, oscilación, apagar, `turn_on` con el último modo, cambios con el control apagado sin envío, y combinación faltante (R5)
- [X] T002 [P] Crear `tests/test_frontend_contract.py`: comprueba en el paquete `hass_frontend` instalado que siguen `hui-thermostat-card`, `climate-hvac-modes`, `climate-fan-modes`, `climate-swing-modes` y los contextos `"hassApi"` y `"states"` (R4)

---

## Fase 2: Base común

**Propósito**: La lógica del clima simulado, sin DOM.

**⚠️ CRÍTICO**: Ninguna historia puede empezar hasta terminar esta fase.

- [X] T003 Crear `tests/frontend/virtual_climate.test.js`: cumple `climate_parity.json`, y comprueba valores iniciales, atributos de `virtualState`, `supported_features` con y sin oscilación, sensores, conversión a Fahrenheit al mostrar y a Celsius al enviar, y categorías (R5, R7, R9)
- [X] T004 Implementar `custom_components/better_smartir/frontend/virtual_climate.js` con `createClimate`, `virtualState` y `applyAction`, según las tablas de `data-model.md`, reutilizando la forma de pedido de `sendRequest` (FR-005 a FR-008, FR-010, R5, R7)

**Punto de control**: el clima simulado cumple los escenarios comunes.

---

## Fase 3: Historia de usuario 1 - Probar un código con el control real de clima (Prioridad: P1) 🎯 MVP

**Objetivo**: Ver el control de Home Assistant en la prueba, y que cada acción envíe el comando del código.

**Prueba independiente**: Abrir la pantalla de prueba, comparar el control con el de un clima real y comprobar que cambiar el modo envía el comando del código en prueba.

### Tests de la historia 1

- [X] T005 [US1] Actualizar `tests/frontend/session.test.js`: quitar los tests de `select`, `options` y `stepTemperature`, y agregar que la sesión crea el clima simulado por código, lo vacía al cambiar de código, y aplica una acción solo cuando el envío termina bien (FR-009, FR-010)

### Implementación de la historia 1

- [X] T006 [US1] Cambiar `custom_components/better_smartir/frontend/session.js` para usar el clima simulado en lugar de `selection`, y quitar `select`, `options`, `stepTemperature`, `reconcile` y las funciones que queden sin uso (FR-003, FR-010)
- [X] T007 [US1] Agregar a `custom_components/better_smartir/frontend/better-smartir-panel.js` el contenedor y la tarjeta de `panel-control.md`: se crea con `window.loadCardHelpers()` una vez por código, dentro del árbol de `home-assistant`, se conserva entre dibujos, y responde a `context-request` de `states` y `hassApi` (FR-001, FR-002, FR-004, R1, R2, R4, R6)
- [X] T008 [US1] Conectar en `custom_components/better_smartir/frontend/better-smartir-panel.js` el `callService` del contenedor con `applyAction`, `test/send` y la sesión, y actualizar la tarjeta mediante las suscripciones a `states` (FR-006, FR-007, R6)
- [X] T009 [US1] Quitar de `custom_components/better_smartir/frontend/better-smartir-panel.js` y `custom_components/better_smartir/frontend/styles.js` la tarjeta destacada, las pastillas, los botones de encendido y temperatura, y las acciones `send`, `choose` y `temperature`, y ubicar la tarjeta según R9 (FR-003, R9)
- [X] T010 [US1] Agregar a `tests/frontend/harness.html` una tarjeta sustituta que usa los mismos contextos y servicios, y comprobar el flujo en esa página (R10)
- [X] T011 [US1] Desplegar en Home Assistant real y validar los escenarios 1 a 3 de `specs/003-control-clima-estandar/quickstart.md`, y revisar los textos en minúscula de R8 (FR-001, FR-002, FR-004 a FR-007, SC-001 a SC-003)

**Punto de control**: el control real funciona en la pantalla de prueba.

---

## Fase 4: Historia de usuario 2 - Conservar el flujo de prueba (Prioridad: P2)

**Objetivo**: Conservar la posición, la respuesta al enviar y las acciones de la prueba.

**Prueba independiente**: Recorrer un alta completa, con un comando que funcione y otro que falle, y comprobar que el flujo es el de la versión 0.2.0.

### Tests de la historia 2

- [X] T012 [US2] Actualizar en `tests/frontend/session.test.js` los tests de `primaryAction` para que antes de enviar devuelva `null`, y agregar que el resumen de comandos usa las categorías de `applyAction` (FR-013, R9)

### Implementación de la historia 2

- [X] T013 [US2] Cambiar `primaryAction` en `custom_components/better_smartir/frontend/session.js` y el resumen de comandos (FR-011, FR-013)
- [X] T014 [US2] Implementar en `custom_components/better_smartir/frontend/better-smartir-panel.js` los casos de error: un envío fallido o una acción durante otro envío conservan el clima anterior y actualizan la tarjeta, y la banda de resultado sigue como en la feature 002 (FR-008, FR-009, FR-014)
- [X] T015 [US2] Mostrar en `custom_components/better_smartir/frontend/better-smartir-panel.js` el mensaje de código sin comandos en lugar de la tarjeta, con Siguiente código como acción principal (FR-011, FR-013)
- [X] T016 [US2] Agregar la detección de `panel-control.md` en `custom_components/better_smartir/frontend/better-smartir-panel.js` y el texto `control_unavailable` en `custom_components/better_smartir/frontend/i18n.js`, en español e inglés (FR-022, R4)

**Punto de control**: las Historias 1 y 2 funcionan.

---

## Fase 5: Historia de usuario 3 - Probar sin dejar rastro (Prioridad: P2)

**Objetivo**: Que una prueba no deje nada en Home Assistant.

**Prueba independiente**: Probar varios códigos, cancelar y buscar rastros en las entidades, el historial, el registro de actividad y los selectores de entidades.

- [X] T017 [US3] Detener `hass-more-info` en el contenedor de `custom_components/better_smartir/frontend/better-smartir-panel.js`, y descartar en `callService` toda llamada que no sea del dominio `climate` con el identificador simulado (FR-015, FR-016, R4)
- [X] T018 [US3] Quitar la tarjeta y sus suscripciones al salir de la prueba o cambiar de código en `custom_components/better_smartir/frontend/better-smartir-panel.js` (FR-015, FR-017)
- [X] T019 [US3] Pasar a `virtualState` los sensores del clima que se está cambiando, y comprobar que el clima real no cambia hasta guardar, en `custom_components/better_smartir/frontend/better-smartir-panel.js` (FR-018)
- [X] T020 [US3] Validar el escenario 5 de `specs/003-control-clima-estandar/quickstart.md` en Home Assistant real, incluido el historial en la base de datos (FR-015 a FR-018, SC-004)

**Punto de control**: las pruebas no dejan rastro.

---

## Fase 6: Historia de usuario 4 - El clima guardado se comporta como en la prueba (Prioridad: P3)

**Objetivo**: Garantizar que la prueba y el clima guardado coinciden.

**Prueba independiente**: Comparar, para un mismo código, las opciones y respuestas del control en la prueba y del clima guardado.

- [X] T021 [US4] Crear `tests/test_climate_parity.py`: la entidad de `climate.py` cumple `tests/fixtures/climate_parity.json`, sin cambiar `climate.py` (FR-019, SC-005)
- [X] T022 [US4] Validar el escenario 6 de `specs/003-control-clima-estandar/quickstart.md` en Home Assistant real (FR-019, FR-020)

**Punto de control**: las cuatro historias funcionan.

---

## Fase 7: Cierre

**Propósito**: Validar y preparar la versión.

- [X] T023 [P] Subir `version` a `0.3.0` en `custom_components/better_smartir/manifest.json`
- [X] T024 [P] Actualizar en `README.md` la descripción de la prueba y la dependencia del control de Home Assistant
- [X] T025 Ejecutar todos los tests y los escenarios 4, 7 y 8 de `specs/003-control-clima-estandar/quickstart.md` en Home Assistant real (FR-012, FR-021, FR-022, SC-006, SC-007, SC-008)
- [X] T026 Registrar los resultados en `specs/003-control-clima-estandar/research.md`, revisar el cumplimiento de `.specify/memory/constitution.md` y actualizar la tabla de `specs/003-control-clima-estandar/plan.md`

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (Fase 1)**: sin dependencias.
- **Base común (Fase 2)**: depende de la Fase 1 y bloquea todas las historias.
- **Historia 1 (Fase 3)**: depende de la Fase 2.
- **Historias 2 y 3 (Fases 4 y 5)**: dependen de la Historia 1, porque usan su tarjeta.
- **Historia 4 (Fase 6)**: T021 solo depende de la Fase 1; T022 depende de la Historia 1.
- **Cierre (Fase 7)**: depende de las cuatro historias.

### Dentro de cada fase

- T003 va antes que T004, T005 antes que T006, y T012 antes que T013.
- Las tareas sobre `better-smartir-panel.js` modifican el mismo archivo y van en orden.

### Oportunidades de paralelismo

- Fase 1: T001 y T002.
- T021 junto con cualquier tarea del panel.
- Cierre: T023 y T024.

## Ejemplo de paralelismo: Historia 1

```text
En paralelo:
  T021 en tests/test_climate_parity.py
  T005 y luego T006 en session.test.js y session.js

Después, en orden:
  T007, T008, T009, T010 y T011 en el panel
```

---

## Estrategia de implementación

### MVP primero

1. Completar las Fases 1 y 2.
2. Completar la Fase 3.
3. **Detenerse y validar** en Home Assistant real, porque el aspecto del control solo se ve ahí.

### Entrega incremental

1. Preparación y base común.
2. Historia 1: control real en la prueba.
3. Historia 2: flujo y errores.
4. Historia 3: sin rastro.
5. Historia 4: coherencia con el clima guardado.
6. Cierre: versión 0.3.0.

---

## Cobertura de requisitos

| Requisito | Tareas |
|---|---|
| FR-001 | T007, T011 |
| FR-002 | T007, T011 |
| FR-003 | T006, T009 |
| FR-004 | T007, T011 |
| FR-005 | T001, T003, T004, T011 |
| FR-006 | T004, T008, T011 |
| FR-007 | T001, T004, T008 |
| FR-008 | T001, T004, T014 |
| FR-009 | T005, T014 |
| FR-010 | T004, T005, T006 |
| FR-011 | T013, T015 |
| FR-012 | Regla general, T025 |
| FR-013 | T012, T013, T015 |
| FR-014 | T014 |
| FR-015 | T017, T018, T020 |
| FR-016 | T017, T020 |
| FR-017 | T018, T020 |
| FR-018 | T019, T020 |
| FR-019 | T021, T022 |
| FR-020 | Regla general, T022 |
| FR-021 | Regla general, T025 |
| FR-022 | T016, T025 |

## Notas

- Hacer un commit al terminar cada grupo lógico.
- T011, T020, T022 y T025 necesitan tu sesión en Chrome, y las que usan el control envían comandos reales.
- Cada despliegue con cambios en Python o en la versión necesita un reinicio; los demás no.
