# Modelo de datos: Control de clima estándar en la prueba

Los datos guardados y la API no cambian. Ver el
[modelo de la feature 001](../001-climas-ir-prueba-grafica/data-model.md).

## Clima simulado (solo en el navegador)

Reemplaza a `selection` en la sesión de prueba. Se crea al cargar cada código y se descarta al cambiar de
código o salir.

| Campo | Regla |
|---|---|
| `hvacMode` | `off` o un modo del código. Empieza en `off` |
| `temperature` | Empieza en la temperatura mínima del código |
| `fan` | Empieza en el primer ventilador disponible |
| `swing` | Empieza en la primera oscilación disponible, o vacío |
| `lastOnMode` | Empieza en el primer modo del código |

Si el código no tiene comandos utilizables, el clima simulado está vacío y no se muestra el control.

## Estado para la tarjeta

`virtualState(details, climate, options)` genera el objeto que recibe la tarjeta, con el identificador fijo
`climate.better_smartir_test`.

| Atributo | Origen |
|---|---|
| `hvac_modes` | `off` y los modos del código con comandos |
| `fan_modes`, `swing_modes` | Los que tienen comandos en algún modo, en el orden del código |
| `min_temp`, `max_temp`, `target_temp_step` | Del código, convertidos a la unidad de la instalación |
| `temperature`, `fan_mode`, `swing_mode` | Del clima simulado |
| `current_temperature`, `current_humidity` | De los sensores del clima que se está cambiando, si tiene |
| `supported_features` | Temperatura, ventilador, encendido y apagado; oscilación solo si el código la tiene |
| `friendly_name` | Marca y código |
| `assumed_state` | `true` |

## Traducción de acciones

`applyAction(climate, details, service, data)` devuelve el clima nuevo, el pedido de envío y la categoría.

| Servicio | Efecto |
|---|---|
| `set_hvac_mode` | Cambia `hvacMode` |
| `set_temperature` | Cambia `temperature`, y `hvacMode` si viene incluido |
| `set_fan_mode` | Cambia `fan` |
| `set_swing_mode` | Cambia `swing` |
| `turn_on` | Pasa a `lastOnMode` |
| `turn_off` | Pasa a `off` |

| Antes | Después | Acción enviada | Categoría |
|---|---|---|---|
| Apagado | Apagado | Ninguna | Ninguna |
| Apagado | Un modo | `on` | `on` |
| Un modo | Apagado | `off` | `off` |
| Un modo | Otro modo | `state` | `mode` |
| Un modo | Mismo modo | `state` | `temperature`, `fan` o `swing` |

El clima nuevo se aplica solo si el envío termina bien. Si falla, o si hay otro envío en curso, se conserva el
anterior y se actualiza la tarjeta.

## Acción principal

`primaryAction` cambia solo en la última regla:

| Orden | Condición | Resultado |
|---|---|---|
| 6 | Cualquier otro caso | `null`, en lugar de `on` |
