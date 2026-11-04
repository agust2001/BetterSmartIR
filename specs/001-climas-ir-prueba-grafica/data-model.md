# Modelo de datos: Climas IR con prueba gráfica

Las decisiones de fondo están en [research.md](research.md).

## Datos persistentes

### Contenedor (entrada de configuración)

Única entrada de la integración (`single_config_entry`). No tiene campos propios: existe para activar
el panel y contener los climas.

### Clima (subentrada de tipo `climate`)

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `subentry_id` | texto | Sí | Lo genera Home Assistant. Es el `unique_id` de la entidad y nunca cambia |
| `title` | texto | Sí | Nombre del clima, no vacío. Puede repetirse |
| `emitter_entity_id` | texto | Sí | Entidad `remote` de la plataforma `broadlink` |
| `code` | entero | Sí | Número de código presente en el catálogo |
| `temperature_sensor` | texto | No | Entidad de dominio `sensor` |
| `humidity_sensor` | texto | No | Entidad de dominio `sensor` |

- La marca no se guarda: se obtiene del catálogo a partir de `code`.
- La subentrada no define `unique_id`, de modo que se admiten climas repetidos (FR-017).
- Cada clima crea un dispositivo y una entidad `climate`.

### Último estado de la entidad

Se conserva con `RestoreEntity`, no en la subentrada (FR-015).

| Campo | Regla |
|---|---|
| `hvac_mode` | `off` o un modo disponible del código |
| `target_temperature` | Dentro del rango del código |
| `fan_mode` | Velocidad del código |
| `swing_mode` | Oscilación del código, si tiene |

Si un valor restaurado ya no es válido, por ejemplo tras cambiar de código, se usa el valor por
defecto: `off`, la temperatura mínima y el primer ventilador y oscilación disponibles.

## Catálogo (solo lectura)

### Índice (`catalog_data/index.json`)

| Campo | Tipo | Regla |
|---|---|---|
| `code` | entero | Número original de SmartIR |
| `manufacturer` | texto | Marca. Se agrupa sin distinguir mayúsculas |
| `models` | lista de textos | Modelos admitidos |

Los códigos de una marca se ofrecen en orden numérico ascendente.

### Código (`catalog_data/codes/<code>.json.gz`)

Conserva la estructura de SmartIR y sus comandos sin alterar.

| Campo | Tipo | Regla |
|---|---|---|
| `minTemperature`, `maxTemperature` | número | Rango admitido |
| `precision` | número | Paso de temperatura |
| `operationModes` | lista | Se ignoran los modos que Home Assistant no reconoce |
| `fanModes` | lista | Velocidades del ventilador |
| `swingModes` | lista, opcional | Si existe, forma parte de la combinación |
| `commands` | objeto | Contiene `off`, opcionalmente `on`, y las combinaciones |

### Combinación

Selección de valores que identifica un comando IR:

- Sin oscilación: `commands[modo][ventilador][temperatura]`
- Con oscilación: `commands[modo][ventilador][oscilación][temperatura]`

La clave de temperatura se escribe sin ceros sobrantes (`24`, `24.5`). Una combinación está disponible
solo si existe y su comando no está vacío.

## Datos temporales

### Sesión de prueba (solo en el navegador)

No llega al servidor ni se guarda (FR-011).

| Campo | Regla |
|---|---|
| `emitter`, `brand` | Elegidos al iniciar |
| `codes`, `position` | Códigos candidatos y posición actual |
| `selection` | Combinación actual |
| `sendStatus` | Resultado del último envío: `idle`, `sending`, `sent` o `failed` |
| `results` | Por comando: `responded` o `not_responded`. Se reinicia al cambiar de código |
| `editingClimateId` | Clima que se está cambiando, o vacío si es un alta |

## Transiciones

### Sesión de prueba

```text
elegir emisor y marca → probando código N
probando código N → probando código N+1 o N-1
probando código N → resumen de comandos fallidos o sin probar → probando código N
probando código N → resumen → clima guardado
probando código N → clima guardado (todo confirmado)
probando último código → sin más códigos → recorrer de nuevo o cancelar
cualquier estado → cancelada (sin efectos)
```

### Disponibilidad de la entidad

La entidad está disponible si el emisor existe y su estado no es `unavailable`. Si el emisor está
apagado (`off`), la entidad sigue disponible, pero enviar un comando devuelve un error comprensible.

## Validaciones

| Regla | Requisito |
|---|---|
| El emisor es una entidad `remote` de `broadlink` | FR-002 |
| El código existe en el catálogo | FR-004 |
| La combinación está disponible en el código | FR-010 |
| El nombre no está vacío | FR-012 |
| Los sensores son entidades `sensor` | FR-025 |
