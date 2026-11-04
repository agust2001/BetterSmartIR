# Contrato: Control de clima en el panel

Define cómo se conecta el panel con la tarjeta de Home Assistant. La
[API WebSocket](../../001-climas-ir-prueba-grafica/contracts/websocket-api.md) no cambia.

## Tarjeta

```json
{
  "type": "thermostat",
  "entity": "climate.better_smartir_test",
  "features": [
    { "type": "climate-hvac-modes", "style": "dropdown" },
    { "type": "climate-fan-modes", "style": "dropdown" },
    { "type": "climate-swing-modes", "style": "dropdown" }
  ]
}
```

- La característica de oscilación se incluye solo si el código la tiene.
- La de presets se agrega si algún código llega a tenerlos. Hoy ninguno de los 333 los tiene.

## Contenedor

El contenedor debe estar dentro del árbol de `home-assistant`, y atiende estos eventos que suben desde la
tarjeta:

| Evento | Respuesta |
|---|---|
| `context-request` con `states` | Estados reales más el clima simulado, y guarda la suscripción |
| `context-request` con `hassApi` | La API real, con `callService` reemplazado |
| Cualquier otro `context-request` | Sin intervenir, para heredar tema, idioma y formato |
| `hass-more-info` | Detenerlo |

`callService` solo atiende el dominio `climate` con el identificador simulado. Cualquier otra llamada se
descarta, y nunca llega a Home Assistant. Siempre se resuelve sin error, porque el panel muestra sus propios
errores en la banda de resultado.

## Detección de fallo

Si 5 segundos después de montar la tarjeta no llegaron las solicitudes `states` y `hassApi`, o si falla
`loadCardHelpers`, el panel quita la tarjeta y muestra el texto `control_unavailable`. Deja usar anterior,
siguiente y cancelar, pero no guardar. Los 5 segundos dan margen a la carga de la tarjeta, que es bajo demanda.

## Compatibilidad

- Se conservan `data-action` de `previous`, `next`, `review`, `cancel` y `result`.
- Se quitan `send`, `choose` y `temperature`, que eran de los controles propios.
- Las demás vistas no cambian.
