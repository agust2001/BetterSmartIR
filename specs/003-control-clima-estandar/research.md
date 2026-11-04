# Investigación: Control de clima estándar en la prueba

R1 y R2 se comprobaron el 2026-11-04 en Home Assistant 2026.10.3 real, desde el panel y sin enviar comandos.

## R1. Tarjeta real con un clima simulado

- **Decisión**: crear la tarjeta `thermostat` con `window.loadCardHelpers()`, dentro del panel, apuntando a un
  clima que solo existe en el navegador.
- **Prueba realizada**:
  - La tarjeta mostró el dial, los botones de temperatura y los selectores de modo, ventilador y oscilación.
  - Pulsar "+" produjo `climate.set_temperature` con la temperatura nueva, y la llamada se capturó.
  - No se creó ninguna entidad.
- **Requisito hallado**: la tarjeta debe estar dentro del árbol de `home-assistant`. Fuera de él, el dial no
  se dibuja.
- **Razón**: `loadCardHelpers` es la vía que usan las tarjetas personalizadas, y la tarjeta y sus
  características se configuran con opciones públicas de dashboards.

## R2. Vista de un clima

- **Hallazgo**: `more-info-climate` no está definido hasta que se abre un diálogo, y no tiene una vía pública
  para crearlo.
- **Decisión**: usar la tarjeta, con estas características en modo desplegable: `climate-hvac-modes`,
  `climate-fan-modes`, `climate-swing-modes` y `climate-preset-modes`.
- **Alternativas descartadas**: abrir el diálogo real necesita una entidad en el estado global de Home
  Assistant, y quedaría fuera de la pantalla de prueba.

## R3. Sin entidad temporal

- **Decisión**: no crear ninguna entidad en el servidor.
- **Razón**: incluso una entidad sin registro pasa por el grabador, aparece en los selectores y queda hasta
  que alguien la quite. Un navegador cerrado a mitad de prueba la dejaría huérfana (FR-015 a FR-017).

## R4. Captura de las acciones

- **Hallazgo**: la tarjeta recibe `hass` como propiedad, pero sus elementos internos leen los estados y llaman
  a los servicios mediante contextos, con solicitudes `context-request` que suben por el DOM. La propiedad
  sola no basta: al pulsar "+" se llamó al servicio real, y Home Assistant registró un aviso de entidad
  inexistente. No se envió nada al aire.
- **Decisión**: un contenedor alrededor de la tarjeta responde a las solicitudes `states` y `hassApi`. Las
  demás, como el idioma y el formato, siguen hasta Home Assistant, y por eso la tarjeta hereda el tema y el
  idioma reales.
- **Costo**: esos nombres son internos. Por eso:
  - `tests/test_frontend_contract.py` comprueba que siguen en el frontend fijado para los tests.
  - Al montar, el panel comprueba que llegaron las dos solicitudes. Si no, muestra el mensaje de FR-022 en
    lugar de un control que no hace nada.
  - Un fallo no envía nada al aire, porque la entidad no existe.
- **Otros eventos**: el contenedor detiene `hass-more-info`, para que el menú de la tarjeta no abra un diálogo
  vacío.

## R5. Coherencia con la entidad

- **Decisión**: `tests/fixtures/climate_parity.json` lista acciones y los comandos esperados. Lo cumplen tanto
  `virtual_climate.js` como `climate.py`.
- **Razón**: las reglas quedan escritas en dos lenguajes, y SC-005 exige que no se separen.

Reglas que se replican de `climate.py`:

| Regla | Valor |
|---|---|
| Modos | Los del código con comandos, más `off` |
| Ventilador y oscilación | Los que tienen comandos en algún modo, en el orden del código |
| Valores iniciales | Apagado, temperatura mínima y primer ventilador y oscilación |
| Con el control apagado | Guarda el valor sin enviar |
| De apagado a un modo | Acción `on` |
| De un modo a apagado | Acción `off` |
| Encendido | Acción `state` |
| `turn_on` | Vuelve al último modo usado |

## R6. Actualizar sin volver a crear

- **Decisión**: la tarjeta se crea una sola vez por código, y el estado se actualiza mediante las suscripciones
  al contexto `states`. El panel la conserva fuera del dibujo normal, que reemplaza el contenido.
- **Razón**: el panel vuelve a dibujar en cada cambio, y eso cortaría un arrastre del dial.

## R7. Unidades

- **Hallazgo**: el catálogo y la entidad trabajan en Celsius, y Home Assistant convierte a la unidad de la
  instalación. El clima simulado no pasa por esa conversión.
- **Decisión**: `virtual_climate.js` convierte al mostrar y al recibir acciones, si la instalación usa
  Fahrenheit. El comando siempre usa el valor Celsius del código.

## R8. Textos del control

- **Hallazgo**: en la prueba, el selector mostró `off` y `up` en minúsculas, mientras que el dial mostró `Off`.
- **Decisión**: revisarlo en la validación. No se corrige con textos propios, porque el control debe ser el de
  Home Assistant.

## R9. Pantalla de prueba

- **Decisión**: la tarjeta ocupa el lugar de la tarjeta destacada y de las opciones. La banda de resultado y
  las acciones de código no cambian.
- **Acción principal**: `primaryAction` deja de devolver `on`, y devuelve `null` antes de enviar (FR-013).
- **Categorías del resumen**: cada acción se traduce a la categoría que ya usa el resumen de comandos probados:
  `on`, `off`, `mode`, `temperature`, `fan` y `swing`.

## R10. Página de prueba

- **Decisión**: `harness.html` usa una tarjeta sustituta mínima que llama a los mismos servicios, porque fuera
  de Home Assistant no existe `loadCardHelpers`.
- **Consecuencia**: sirve para el flujo, no para el aspecto del control.

## Validación

Medido el 2026-11-04 con la versión 0.3.0 en Home Assistant 2026.10.3, con un Broadlink y un aire.

- **Suscripción**: la primera versión perdía la suscripción a `states`, porque cada aviso llevaba otra
  función de cancelación. La tarjeta seguía viendo el clima apagado e ignoraba Off. El aviso ahora conserva
  la misma función, y `harness.html` reproduce esa regla.
- **Control**: dial y selectores con el tema real. Con la tarjeta real, los códigos 1030 y 1390 mostraron los
  selectores esperados, incluida la oscilación del 1030. Se revisaron además 16 códigos de Midea y 6 de
  Panasonic.
- **Comandos**: Cool, subir la temperatura y Off, con clics reales, salieron por el emisor.
- **Errores**: con el emisor apagado y con una combinación faltante apareció el error, y el clima conservó su
  estado anterior.
- **Coherencia**: para el código 1390, la prueba y el clima guardado coinciden en modos, ventilador, rango,
  paso, características y sensor.
- **Sin rastro**: `climate.better_smartir_test` no aparece en la base de datos del historial ni en los
  registros de entidades y dispositivos, ni después de cerrar la pestaña a mitad de una prueba.
- **Flujo**: crear, cambiar el nombre y borrar un clima funcionan. La entidad nueva apareció 55 ms después de
  guardar.
- **Control no disponible**: se probó en la página de prueba, sin `loadCardHelpers` y con una tarjeta que no
  pide los contextos.
- **No observado**: estas pruebas leen el estado de Home Assistant. Que el aire obedeciera no se observó.
- **Caché del panel**: un teléfono mezcló el panel 0.3.0 con `session.js` de la 0.2.0 y mostró el código 1390 como
  sin comandos. La versión pasó de la URL del panel a la ruta de todos sus archivos. En ese teléfono, el control
  volvió a aparecer.
