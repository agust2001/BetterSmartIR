# Modelo de datos: Rediseño visual del panel

Los datos guardados, la sesión de prueba y la API no cambian. Ver el
[modelo de la feature 001](../001-climas-ir-prueba-grafica/data-model.md).

Esta feature solo agrega valores derivados, que se calculan en el navegador y no se guardan.

## Acción principal de la pantalla de prueba

`primaryAction(session)` se calcula a partir de la sesión de prueba. Se aplica la primera regla que se
cumple:

| Orden | Condición | Resultado | Botón |
|---|---|---|---|
| 1 | `exhausted` | `restart` | Recorrerlos de nuevo |
| 2 | `selection` vacío | `next` | Siguiente código |
| 3 | `sendStatus` es `sent` | `worked` | Funcionó |
| 4 | `lastResult` es `responded` | `save` | Guardar este código |
| 5 | `lastResult` es `not_responded` | `next` | Siguiente código |
| 6 | Cualquier otro caso | `on` | Encender |

El último resultado es `lastResult`, que guarda la última respuesta de la persona y se vacía al cambiar de
código. Mientras `sendStatus` es `sending`, los controles de envío
están deshabilitados, pero la acción principal no cambia.

## Apariencia de un modo

Asociación fija entre un modo y su presentación.

| Modo | Color | Icono |
|---|---|---|
| `cool` | Frío | `snowflake` |
| `heat` | Calor | `fire` |
| `dry` | Secar | `water-percent` |
| `fan_only` | Ventilación | `fan` |
| `auto` | Automático | `thermostat-auto` |
| `heat_cool` | Automático | `sun-snowflake-variant` |
| Otro | Neutro | `thermostat` |

## Foco recordado

Estado del panel, no de la sesión. Guarda la clave del último control con foco y se aplica al volver a
dibujar (R5).
