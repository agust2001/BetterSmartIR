---

description: "Lista de tareas para implementar Climas IR con prueba gráfica"
---

# Tareas: Climas IR con prueba gráfica

**Entrada**: Documentos de diseño en `specs/001-climas-ir-prueba-grafica/`

**Requisitos previos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [websocket-api.md](contracts/websocket-api.md)

**Tests**: Incluidos, porque el principio IV de la constitución los exige. Dentro de cada bloque, los
tests se escriben primero y deben fallar antes de implementar.

**Organización**: Las tareas se agrupan por historia de usuario.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: Se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Historia]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Las referencias `R1` a `R12` apuntan a las decisiones de [research.md](research.md)

---

## Fase 1: Preparación

**Propósito**: Dejar el repositorio y el entorno de tests funcionando.

- [X] T001 Inicializar el repositorio git, crear `.gitignore` en la raíz excluyendo `.claude/settings.local.json`, cachés de Python y entornos virtuales, quitar el comentario del informe de impacto al inicio de `.specify/memory/constitution.md`, y crear con `gh repo create` el repositorio público `agust2001/BetterSmartIR` como `origin`
- [X] T002 Crear `custom_components/better_smartir/manifest.json` con `domain` `better_smartir`, `name` `BetterSmartIR`, `version` `0.1.0`, `config_flow` `true`, `single_config_entry` `true`, `integration_type` `hub`, `iot_class` `assumed_state`, `dependencies` `http`, `frontend`, `panel_custom`, `websocket_api` y `remote`, y `after_dependencies` `broadlink`; `documentation` `https://github.com/agust2001/BetterSmartIR`, `issue_tracker` `https://github.com/agust2001/BetterSmartIR/issues` y `codeowners` `@agust2001` (R12)
- [X] T003 [P] Crear `custom_components/better_smartir/const.py` con el dominio, el tipo de subentrada `climate`, las claves de datos y la demora de 0,5 segundos
- [X] T004 [P] Crear `hacs.json` en la raíz con `name` `BetterSmartIR` y `homeassistant` `2026.10.0` (R1, R12)
- [X] T005 [P] Crear `requirements_test.txt` fijando la versión de `pytest-homeassistant-custom-component` que corresponda a Home Assistant 2026.10.x, y `Dockerfile.test` basado en Python 3.14 que ejecute `pytest` por defecto (R11)
- [X] T006 [P] Crear `LICENSE` en la raíz con licencia MIT y un `README.md` inicial con el propósito del proyecto
- [X] T007 Crear `tests/conftest.py` con el fixture `enable_custom_integrations`, una entrada contenedora de prueba y un emisor Broadlink simulado; comprobar que `docker build -f Dockerfile.test -t better-smartir-test .` y `docker run --rm better-smartir-test` funcionan
- [X] T008 [P] Crear `.github/workflows/validate.yml` con los tests de Python, `node --test "tests/frontend/*.test.js"`, `hassfest` y la validación de HACS (R11)

---

## Fase 2: Base común

**Propósito**: Catálogo, resolución de comandos, envío y ciclo de vida. Todas las historias lo necesitan.

**⚠️ CRÍTICO**: Ninguna historia puede empezar hasta terminar esta fase.

### Catálogo

- [X] T009 Crear `scripts/build_catalog.py`: descarga SmartIR en el commit `e4df2957ad915536f41ffb39daa96886d7cfe040`, toma los códigos con `supportedController` `Broadlink`, repara la coma sobrante del `2680` sin tocar comandos, y genera `index.json`, `codes/<code>.json.gz`, `SOURCE.json` y `LICENSE.SmartIR` en `custom_components/better_smartir/catalog_data/` de forma reproducible (FR-026, R9, R10)
- [X] T010 Ejecutar `scripts/build_catalog.py` y agregar el resultado a `custom_components/better_smartir/catalog_data/`
- [X] T011 [P] Escribir `tests/test_catalog_data.py`: el catálogo tiene 333 códigos y 125 marcas normalizadas, conserva los números de SmartIR, incluye `LICENSE.SmartIR`, y todos los archivos se pueden leer (FR-026)
- [X] T012 [P] Escribir `tests/test_catalog.py`: lista de marcas sin duplicados por mayúsculas ni espacios, códigos de una marca en orden numérico ascendente, lectura de un código, código inexistente, y filtrado de modos que Home Assistant no reconoce (FR-003, FR-004, FR-014)
- [X] T013 Implementar `custom_components/better_smartir/catalog.py`: lectura del índice y de cada código con `async_add_executor_job`, sin red, y normalización de marcas (FR-003, FR-004, R10)

### Comandos y envío

- [X] T014 [P] Escribir `tests/test_commands.py`: resolución con y sin oscilación, clave de temperatura sin ceros sobrantes (`24`, `24.5`), combinación faltante, comando vacío tratado como faltante, secuencia con `on` y sin `on`, y cálculo de `available` (FR-010, R8, R9)
- [X] T015 Implementar `custom_components/better_smartir/commands.py`: de combinación a secuencia de comandos IR y cálculo de combinaciones disponibles, sin alterar el contenido de los comandos (FR-010, FR-026, R8)
- [X] T016 [P] Escribir `tests/test_emitter.py`: solo lista entidades `remote` de la plataforma `broadlink`; llama a `remote.send_command` con el prefijo `b64:` y el paquete intacto; devuelve `emitter_not_found`, `emitter_unavailable`, `emitter_off` y `send_failed`; y no llama al servicio si el estado no es `on` (FR-002, FR-027, R2)
- [X] T017 Implementar `custom_components/better_smartir/emitter.py`, el único módulo que conoce Broadlink, comprobando que el estado sea `on` antes de enviar (FR-002, FR-027, R2)

### Ciclo de vida

- [X] T018 [P] Escribir `tests/test_config_flow.py`: el alta crea la entrada contenedora y un segundo intento se rechaza (FR-028)
- [X] T019 [P] Escribir `tests/test_init.py`: el panel se registra con `require_admin` al agregar la integración sin reiniciar, sigue registrado tras una recarga, se quita al eliminar la entrada, cambiar una subentrada recarga la entrada, y la integración no lee `configuration.yaml` (FR-022, FR-028, R3, R4, R5)
- [X] T020 Implementar `custom_components/better_smartir/config_flow.py` con el alta única del contenedor (FR-028)
- [X] T021 Implementar `custom_components/better_smartir/__init__.py`: `CONFIG_SCHEMA` de solo entradas de configuración, registro de la API WebSocket en `async_setup`, registro único del panel con `StaticPathConfig` y `panel_custom.async_register_panel`, retirada del panel solo en `async_remove_entry`, y `update_listener` que recarga la entrada (FR-022, FR-028, R4, R5, R6)
- [X] T022 [P] Crear `custom_components/better_smartir/strings.json` y `custom_components/better_smartir/translations/en.json` y `custom_components/better_smartir/translations/es.json` con los textos del flujo de alta y de la entidad

**Punto de control**: el catálogo se lee, los comandos se resuelven y se envían, y agregar la integración muestra una entrada en la barra lateral.

---

## Fase 3: Historia de usuario 1 - Agregar un aire y dejarlo funcionando (Prioridad: P1) 🎯 MVP

**Objetivo**: Agregar un aire desde el panel probando sus códigos, y obtener una entidad climate sin reiniciar.

**Prueba independiente**: Completar el flujo desde cero y controlar el aire con la entidad creada, sin editar archivos ni reiniciar. Es el escenario 1 de [quickstart.md](quickstart.md).

### Tests de la historia 1

- [X] T023 [P] [US1] Escribir en `tests/test_websocket_api.py` los tests de `emitters`, `brands`, `codes`, `code` y `test/send`: forma de la respuesta según el contrato, rechazo a usuarios sin permisos de administración, ausencia de comandos IR en `code`, todos los códigos de error, y que `test/send` no crea entidades ni configuración (FR-002 a FR-011, FR-027)
- [X] T024 [US1] Agregar a `tests/test_websocket_api.py` los tests de `climates/create` y `climates/list`: crea la subentrada, "El nombre no puede estar vacío" (`invalid_name`), `emitter_not_found`, `code_not_found`, `invalid_sensor`, y dos climas con el mismo emisor y nombre (FR-012, FR-013, FR-017)
- [X] T025 [P] [US1] Escribir `tests/test_climate.py`: la entidad aparece tras crear el clima sin reiniciar, usa el `subentry_id` como `unique_id`, ofrece solo modos reconocidos, temperaturas, ventilador y oscilación del código, envía `on` con su demora, apaga, devuelve un error comprensible ante una combinación faltante o un emisor apagado, restaura el último estado, usa los valores por defecto si el restaurado no es válido, y queda no disponible si el emisor no existe o está `unavailable` (FR-013 a FR-016)
- [X] T026 [P] [US1] Escribir `tests/frontend/session.test.js`: avance y retroceso entre códigos, posición, reinicio de `results` al cambiar de código, combinaciones ofrecidas, resumen de comandos fallidos o sin probar, agotamiento de códigos, y conservación de la posición tras un error (FR-006, FR-008 a FR-010, FR-012)

### Implementación de la historia 1

- [X] T027 [US1] Implementar en `custom_components/better_smartir/websocket_api.py` los comandos `emitters`, `brands`, `codes`, `code` y `test/send`, con `require_admin` y validación con `probatio` (FR-002 a FR-005, FR-007, FR-010, FR-027, R1, R6)
- [X] T028 [US1] Implementar en `custom_components/better_smartir/websocket_api.py` los comandos `climates/create` y `climates/list`, con las reglas de `data-model.md`: "Nombre del clima, no vacío. Puede repetirse", emisor "Entidad `remote` de la plataforma `broadlink`", y código "presente en el catálogo" (FR-012, FR-013, FR-017)
- [X] T029 [US1] Implementar `custom_components/better_smartir/climate.py`: una entidad y un dispositivo por subentrada con `config_subentry_id`, `assumed_state`, `RestoreEntity`, seguimiento de disponibilidad del emisor, y envío mediante `commands.py` y `emitter.py` (FR-013 a FR-016, R4)
- [X] T030 [P] [US1] Implementar `custom_components/better_smartir/frontend/session.js`, sin dependencias del DOM, con los estados y transiciones de la sesión de prueba de `data-model.md` (FR-006, FR-008 a FR-012, R7)
- [X] T031 [P] [US1] Crear `custom_components/better_smartir/frontend/i18n.js` con los textos en español e inglés, incluidos todos los mensajes de error del contrato
- [X] T032 [US1] Crear en `custom_components/better_smartir/frontend/better-smartir-panel.js` el Web Component, la vista de lista de climas y la selección de emisor y marca, con los mensajes de "sin emisores" y "marca no disponible" (FR-001 a FR-003, FR-024)
- [X] T033 [US1] Agregar a `custom_components/better_smartir/frontend/better-smartir-panel.js` la pantalla tipo control remoto: código y posición, botones de encender, apagar, modo, temperatura, ventilador y oscilación que envían la combinación completa, estado "enviado" separado de "¿respondió?", y anterior y siguiente (FR-005 a FR-010, R8)
- [X] T034 [US1] Agregar a `custom_components/better_smartir/frontend/better-smartir-panel.js` el guardado con nombre, el resumen de comandos fallidos o sin probar, y el aviso de códigos agotados con las opciones de recorrer de nuevo o cancelar (FR-011, FR-012)

**Punto de control**: la Historia 1 funciona por sí sola y se cumple el criterio de éxito principal.

---

## Fase 4: Historia de usuario 2 - Cambiar un clima existente (Prioridad: P2)

**Objetivo**: Cambiar nombre, emisor, código y sensores de un clima sin reiniciar y sin perder la entidad.

**Prueba independiente**: Cambiar el emisor y el código de un clima usado en una automatización, y comprobar que sigue funcionando sin reiniciar. Es el escenario 4 de [quickstart.md](quickstart.md).

### Tests de la historia 2

- [X] T035 [P] [US2] Agregar a `tests/test_websocket_api.py` los tests de `climates/update`: cambia cada campo, conserva `subentry_id` y `entity_id`, un sensor con `null` se desasocia, y `climate_not_found` (FR-018, FR-019)
- [X] T036 [P] [US2] Agregar a `tests/test_climate.py` los tests de sensores: muestra temperatura y humedad, sigue funcionando si el sensor no está disponible, y aplica un cambio de emisor o de código sin reiniciar (FR-018, FR-019, FR-025)
- [X] T037 [P] [US2] Agregar a `tests/frontend/session.test.js` los tests de edición: salir sin guardar no genera ningún cambio y guardar usa `climates/update` (FR-020)

### Implementación de la historia 2

- [X] T038 [US2] Implementar `climates/update` en `custom_components/better_smartir/websocket_api.py` con `async_update_subentry` (FR-018, FR-019)
- [X] T039 [US2] Agregar a `custom_components/better_smartir/climate.py` el seguimiento de los sensores opcionales de temperatura y humedad (FR-025)
- [X] T040 [US2] Agregar `editingClimateId` a `custom_components/better_smartir/frontend/session.js` (FR-020)
- [X] T041 [US2] Agregar a `custom_components/better_smartir/frontend/better-smartir-panel.js` la vista de edición con nombre, emisor y sensores, y el acceso a la pantalla de prueba desde un clima existente (FR-018, FR-020, FR-025)

**Punto de control**: las Historias 1 y 2 funcionan.

---

## Fase 5: Historia de usuario 3 - Borrar un clima (Prioridad: P3)

**Objetivo**: Eliminar un clima y su entidad sin reiniciar.

**Prueba independiente**: Borrar un clima y comprobar que su entidad ya no existe y que los demás siguen funcionando. Es el escenario 5 de [quickstart.md](quickstart.md).

### Tests de la historia 3

- [X] T042 [US3] Agregar a `tests/test_websocket_api.py` los tests de `climates/delete`: quita la subentrada, su entidad y su dispositivo, deja intactos los demás climas, y `climate_not_found` (FR-021)

### Implementación de la historia 3

- [X] T043 [US3] Implementar `climates/delete` en `custom_components/better_smartir/websocket_api.py` con `async_remove_subentry` (FR-021)
- [X] T044 [US3] Agregar a `custom_components/better_smartir/frontend/better-smartir-panel.js` la acción de borrar con confirmación (FR-021, FR-024)

**Punto de control**: las tres historias funcionan.

---

## Fase 6: Cierre y publicación

**Propósito**: Preparar la publicación y validar con hardware real.

- [X] T045 [P] Completar `README.md` con instalación por HACS, el paso único de agregar la integración, uso del panel, limitaciones y atribución a SmartIR con su licencia MIT
- [X] T046 [P] Agregar los recursos de marca en `custom_components/better_smartir/brand/` (R12)
- [X] T047 Subir el código a `agust2001/BetterSmartIR` y comprobar que pasan los tests, `hassfest` y la validación de HACS de `.github/workflows/validate.yml`
- [X] T048 Comprobar en una instancia real cómo se ven las subentradas en Dispositivos y servicios y, si hace falta, declarar el tipo en `custom_components/better_smartir/config_flow.py` (riesgo del plan)
- [X] T049 Medir en una instancia real cuánto tarda la recarga y comprobar SC-002 y SC-005; registrar el resultado en `specs/001-climas-ir-prueba-grafica/research.md`
- [X] T050 Ejecutar todos los tests y la validación manual de `specs/001-climas-ir-prueba-grafica/quickstart.md` con un Broadlink y un aire reales
- [X] T051 Revisar el cumplimiento de `.specify/memory/constitution.md` y actualizar la tabla de `specs/001-climas-ir-prueba-grafica/plan.md`

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (Fase 1)**: sin dependencias.
- **Base común (Fase 2)**: depende de la Fase 1 y bloquea todas las historias.
- **Historia 1 (Fase 3)**: depende de la Fase 2.
- **Historia 2 (Fase 4)**: depende de la Historia 1, porque cambia climas y reutiliza la pantalla de prueba, la entidad y el panel.
- **Historia 3 (Fase 5)**: depende de la Historia 1, porque usa su lista de climas. No depende de la Historia 2.
- **Cierre (Fase 6)**: depende de las historias que se quieran publicar.

### Dentro de cada fase

- Los tests se escriben antes que su implementación y deben fallar.
- `catalog.py` (T013) va antes que `commands.py` en las pruebas con datos reales, y ambos antes de la API.
- T010 depende de T009.
- T021 necesita que exista `websocket_api.py`: T021 lo crea con su función de registro vacía, y T027 agrega los comandos.
- T032, T033 y T034 modifican el mismo archivo y van en orden.
- T027, T028, T038 y T043 modifican el mismo archivo y van en orden.

### Oportunidades de paralelismo

- Fase 1: T003 a T006 y T008.
- Fase 2: T011, T012, T014, T016, T018, T019 y T022, una vez generado el catálogo.
- Historia 1: T023 (seguida de T024), T025 y T026 entre sí, y T030 y T031 junto con la API.
- Tras la Historia 1: las Historias 2 y 3 pueden avanzar en paralelo, coordinando `websocket_api.py` y el panel, que comparten.

---

## Ejemplo de paralelismo: Historia 1

```text
Tests en paralelo:
  T023 y luego T024 en tests/test_websocket_api.py
  T025 en tests/test_climate.py
  T026 en tests/frontend/session.test.js

Implementación en paralelo:
  T027 y T028 en websocket_api.py, seguidas de T029 en climate.py
  T030 en frontend/session.js
  T031 en frontend/i18n.js
```

---

## Estrategia de implementación

### MVP primero

1. Completar las Fases 1 y 2.
2. Completar la Fase 3.
3. **Detenerse y validar** con el escenario 1 de `quickstart.md` y hardware real.

La Historia 1 ya cumple el criterio de éxito: agregar un aire y dejarlo funcionando sin editar archivos
ni reiniciar.

### Entrega incremental

1. Preparación y base común.
2. Historia 1: primera versión usable.
3. Historia 2: corregir climas sin rehacerlos.
4. Historia 3: ciclo de vida completo.
5. Cierre: publicación en HACS.

---

## Cobertura de requisitos

| Requisito | Tareas |
|---|---|
| FR-001 | T032 |
| FR-002 | T016, T017, T023, T027, T032 |
| FR-003 | T012, T013, T023, T027, T032 |
| FR-004 | T012, T013, T023, T027 |
| FR-005 | T023, T027, T033 |
| FR-006 | T023, T026, T030, T033 |
| FR-007 | T023, T027, T033 |
| FR-008 | T023, T026, T030, T033 |
| FR-009 | T023, T026, T030, T033 |
| FR-010 | T014, T015, T023, T026, T027, T030, T033 |
| FR-011 | T023, T030, T034 |
| FR-012 | T024, T026, T028, T030, T034 |
| FR-013 | T024, T025, T028, T029 |
| FR-014 | T012, T025, T029 |
| FR-015 | T025, T029 |
| FR-016 | T025, T029 |
| FR-017 | T024, T028 |
| FR-018 | T035, T036, T038, T041 |
| FR-019 | T035, T036, T038 |
| FR-020 | T037, T040, T041 |
| FR-021 | T042, T043, T044 |
| FR-022 | T019, T021 |
| FR-023 | Sin tareas: es una exclusión de alcance |
| FR-024 | T032, T044 |
| FR-025 | T036, T039, T041 |
| FR-026 | T009, T011, T015 |
| FR-027 | T016, T017, T023, T027 |
| FR-028 | T018, T019, T020, T021 |

## Notas

- Hacer un commit al terminar cada tarea o grupo lógico.
- Detenerse en cualquier punto de control para validar.
- Evitar tareas vagas, conflictos en un mismo archivo y dependencias que rompan las historias.
