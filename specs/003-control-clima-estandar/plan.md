# Plan de implementación: Control de clima estándar en la prueba

**Rama**: Sin rama propia todavía | **Fecha**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Entrada**: Especificación de la feature en `specs/003-control-clima-estandar/spec.md`

## Resumen

Mostrar en la pantalla de prueba la tarjeta de termostato de Home Assistant, con su dial y sus selectores,
conectada a un clima simulado que solo existe en el navegador. Las acciones de la tarjeta se capturan y se
convierten en los comandos de prueba que ya existen. Como no hay entidad, no hay nada que limpiar ni
historial que ensuciar.

Una prueba en Home Assistant real confirmó que funciona (R1). Tiene un costo: depende de dos nombres
internos del frontend, y es una desviación documentada del principio V.

La API WebSocket, los datos guardados y el backend de Python no cambian.

## Contexto técnico

**Lenguaje/Versión**: JavaScript en módulos ES, sin compilación, igual que el panel actual.

**Dependencias principales**: La tarjeta `thermostat` y sus características, provistas por el frontend de
Home Assistant en ejecución. No se agregan librerías.

**Almacenamiento**: No aplica. El clima simulado vive en la memoria del navegador.

**Testing**: `node --test` para la lógica, `pytest` para la coherencia con la entidad y la comprobación del
frontend, y validación manual en Home Assistant real.

**Plataforma**: Home Assistant 2026.10 o superior, en celular y computadora.

**Tipo de proyecto**: Panel de una integración de Home Assistant.

**Objetivos de rendimiento**: El control responde en menos de 1 segundo, sin contar la espera del emisor.

**Restricciones**: Ninguna entidad de prueba, ni temporal. Sin copiar el control.

**Escala/Alcance**: Solo la pantalla de prueba. 1 módulo nuevo y 3 archivos del panel.

## Verificación de la constitución

*Puerta: revisada antes de la investigación y de nuevo tras el diseño.*

| Principio | Cómo se cumple | Antes | Tras el diseño |
|---|---|---|---|
| I. Instalable por HACS | Sin dependencias nuevas ni pasos de compilación | Cumple | Cumple |
| II. Configuración desde la UI | No cambia ninguna forma de configurar | Cumple | Cumple |
| III. Sin reinicios | El clima simulado no toca la configuración | Cumple | Cumple |
| IV. Código con tests | La lógica nueva y la coherencia con la entidad tienen tests. La parte que depende del frontend se comprueba con un test de sus nombres y a mano | Cumple | Cumple |
| V. Guías de Home Assistant | Usa la tarjeta y los ayudantes públicos, pero intercepta dos nombres internos | A revisar | Cumple, con una desviación justificada abajo |

**Revisión tras implementar (T026)**: los principios I a IV se siguen cumpliendo, y el V mantiene la
desviación aprobada. El backend de Python solo cambió en la versión.

**Resultado**: la puerta se supera. El responsable del proyecto aprobó la desviación el 2026-11-04.

## Hallazgos incorporados a la spec

- **El control es la tarjeta de termostato**, no la vista que se abre al tocar un clima. Esa vista no se
  puede incrustar (R2). Se ve casi igual: mismo dial y selectores desplegables. FR-001 y los supuestos se
  actualizaron.
- **Unidades**: el clima simulado debe mostrar la unidad de la instalación, igual que la entidad (R7).

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/003-control-clima-estandar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── panel-control.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
custom_components/better_smartir/
├── manifest.json                    # Sube a la versión 0.3.0
└── frontend/
    ├── virtual_climate.js           # Nuevo: estado simulado y traducción de acciones, sin DOM
    ├── better-smartir-panel.js      # Monta la tarjeta y atiende sus acciones
    ├── session.js                   # Quita las opciones propias y usa el estado simulado
    ├── styles.js                    # Quita la tarjeta destacada y las pastillas
    └── i18n.js                      # Texto de control no disponible

tests/
├── fixtures/climate_parity.json     # Nuevo: escenarios comunes de prueba y entidad
├── test_climate_parity.py           # Nuevo: la entidad cumple los escenarios
├── test_frontend_contract.py        # Nuevo: el frontend sigue teniendo lo que se usa
└── frontend/
    ├── virtual_climate.test.js      # Nuevo: el clima simulado cumple los escenarios
    ├── session.test.js              # Quita los tests de las opciones propias
    └── harness.html                 # Tarjeta sustituta, porque no hay frontend real
```

**Decisión de estructura**: `virtual_climate.js` no conoce el DOM, igual que `session.js`, para que casi toda
la lógica nueva se pruebe sin navegador.

## Orden de construcción

1. `virtual_climate.js` y los escenarios comunes, con sus tests primero.
2. Comprobación del frontend.
3. Montar la tarjeta en el panel, con un clima simulado sin envíos.
4. Conectar las acciones con el envío y la sesión.
5. Quitar los controles propios.
6. Mensaje de control no disponible.
7. Validación en Home Assistant real.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Una actualización de Home Assistant cambia los nombres internos | Test contra el frontend fijado, detección al montar y mensaje de FR-022 (R4) |
| Si la captura falla, una acción llama a un servicio real | La entidad no existe, así que Home Assistant solo registra un aviso y no se envía nada al aire |
| El control se vuelve a dibujar y pierde lo que se está moviendo | Actualizar el estado sin volver a crear la tarjeta (R6) |
| El clima simulado se comporta distinto de la entidad | Escenarios comunes que deben cumplir los dos (R5) |
| Algunos textos se ven sin traducir, como `off` o `up` | Revisarlo en la validación; es la forma en que el frontend trata una entidad desconocida (R8) |
| La página de prueba ya no muestra el control real | Validación obligatoria en Home Assistant real |

## Seguimiento de complejidad

| Desviación | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Interceptar las solicitudes de contexto `states` y `hassApi` del frontend, que son internas | La tarjeta las usa para leer la entidad y llamar a los servicios. Es la única forma de usar el control real sin una entidad | Una entidad temporal aparecería en el historial y en los selectores, y quedaría si se cierra el navegador (R3). Recrear el control está prohibido por la spec |
