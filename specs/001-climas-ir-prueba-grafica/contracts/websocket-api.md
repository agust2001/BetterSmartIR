# Contrato: API WebSocket del panel

Es la interfaz entre el panel y la integración. Todos los comandos exigen permisos de administración.
El prefijo de todos los tipos es `better_smartir/`.

## Consulta

### `emitters`

Lista los emisores Broadlink.

- **Entrada**: ninguna.
- **Salida**: `{ "emitters": [{ "entity_id", "name", "state" }] }`

### `brands`

- **Entrada**: ninguna.
- **Salida**: `{ "brands": [{ "name", "code_count" }] }`, en orden alfabético.

### `codes`

- **Entrada**: `{ "brand": string }`
- **Salida**: `{ "codes": [{ "code", "models" }] }`, en orden numérico ascendente.
- **Errores**: `brand_not_found`.

### `code`

Devuelve lo necesario para dibujar los controles. Nunca incluye los comandos IR.

- **Entrada**: `{ "code": number }`
- **Salida**:

```json
{
  "code": 1000,
  "manufacturer": "Toyotomi",
  "models": ["AKIRA GAN/GAG-A128 VL"],
  "min_temperature": 16,
  "max_temperature": 30,
  "precision": 1,
  "modes": ["heat", "cool", "fan_only"],
  "fan_modes": ["low", "mid", "high", "auto"],
  "swing_modes": [],
  "available": { "cool": { "low": ["16", "17"] } }
}
```

Con oscilación, `available` agrega un nivel: `modo → ventilador → oscilación → temperaturas`.

- **Errores**: `code_not_found`.

### `climates/list`

- **Entrada**: ninguna.
- **Salida**: `{ "climates": [{ "climate_id", "name", "emitter_entity_id", "code", "manufacturer",
  "temperature_sensor", "humidity_sensor", "entity_id" }] }`

## Prueba

### `test/send`

Envía un comando al aire sin guardar nada.

- **Entrada**:

```json
{
  "emitter_entity_id": "remote.sala",
  "code": 1000,
  "action": "state",
  "mode": "cool",
  "fan": "low",
  "swing": null,
  "temperature": 24
}
```

| `action` | Efecto | Campos de combinación |
|---|---|---|
| `off` | Envía el comando de apagado | No se usan |
| `on` | Envía `on` si el código lo tiene, espera 0,5 s y envía la combinación | Obligatorios |
| `state` | Envía la combinación | Obligatorios |

- **Salida**: `{ "sent": true }`. Significa que se emitió, no que el aire respondió.
- **Errores**: `emitter_not_found`, `emitter_unavailable`, `emitter_off`, `code_not_found`,
  `combination_not_available`, `send_failed`.

## Gestión de climas

### `climates/create`

- **Entrada**: `{ "name", "emitter_entity_id", "code", "temperature_sensor"?, "humidity_sensor"? }`
- **Salida**: `{ "climate_id" }`
- **Efecto**: crea la subentrada. La entidad aparece tras la recarga, sin reiniciar.
- **Errores**: `invalid_name`, `emitter_not_found`, `code_not_found`, `invalid_sensor`.

### `climates/update`

- **Entrada**: `{ "climate_id", "name"?, "emitter_entity_id"?, "code"?, "temperature_sensor"?,
  "humidity_sensor"? }`. Un sensor con valor `null` se desasocia.
- **Salida**: `{ "climate_id" }`
- **Efecto**: conserva el identificador de la entidad.
- **Errores**: `climate_not_found` y los de `climates/create`.

### `climates/delete`

- **Entrada**: `{ "climate_id" }`
- **Salida**: `{}`
- **Efecto**: quita la subentrada, su dispositivo y su entidad.
- **Errores**: `climate_not_found`.

## Errores

Se usa `connection.send_error` con el código de la tabla. El panel traduce el código a un mensaje en el
idioma de la persona.

| Código | Mensaje para la persona |
|---|---|
| `emitter_not_found` | El emisor ya no existe |
| `emitter_unavailable` | El emisor no está disponible |
| `emitter_off` | La entidad del emisor está apagada; enciéndela para enviar |
| `code_not_found` | El código no está en el catálogo |
| `brand_not_found` | La marca no está en el catálogo |
| `combination_not_available` | El código no admite esa combinación |
| `send_failed` | El emisor no pudo enviar el comando |
| `climate_not_found` | El clima ya no existe |
| `invalid_name` | El nombre no puede estar vacío |
| `invalid_sensor` | El sensor elegido no es válido |
| `not_configured` | La integración ya no está agregada |
