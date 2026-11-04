# Investigación: Rediseño visual del panel

Los colores se leyeron del frontend `20260930.5` de Home Assistant, y el contraste se calculó con la
fórmula de WCAG.

## R1. Estilos propios, sin componentes del frontend

- **Decisión**: mantener un Web Component con HTML y CSS propios, sin usar `ha-button`, `ha-card` ni
  `ha-icon`.
- **Razón**: esos elementos son internos y cambian entre versiones. El plan de la feature 001 ya decidió
  depender solo de la propiedad `hass`.
- **Alternativas descartadas**: los componentes de Home Assistant darían un aspecto idéntico, pero
  podrían no estar cargados al abrir el panel y romperlo en una actualización. Una librería como Lit
  obligaría a incluirla o a compilar.

## R2. Variables de tema con valor de respaldo

- **Decisión**: usar las variables clásicas del tema, como `--primary-color`, `--card-background-color`
  y `--primary-text-color`, y los colores de estado `--state-climate-*-color`, con un valor de respaldo.
- **Razón**: son las que definen los temas personalizados, y hacen que los modos coincidan con los
  colores de la tarjeta de clima de Home Assistant.

| Modo | Variable | Valor predeterminado |
|---|---|---|
| Frío | `--state-climate-cool-color` | `#2196f3` |
| Calor | `--state-climate-heat-color` | `#ff6f22` |
| Secar | `--state-climate-dry-color` | `#ff9800` |
| Ventilación | `--state-climate-fan_only-color` | `#00bcd4` |
| Automático | `--state-climate-auto-color` | `#4caf50` |
| Frío/Calor | Sin variable predeterminada | Usa el color de automático |

## R3. Contraste de los colores de modo

- **Hallazgo**: los colores de modo no llegan a 3:1 sobre una tarjeta blanca, salvo frío: calor 2,78,
  secar 2,16, ventilación 2,30, automático 2,78. El color de error tampoco llega a 4,5:1 como texto:
  4,29 en claro y 3,97 en oscuro.
- **Decisión**:
  - El texto siempre usa el color de texto del tema, nunca el color del modo.
  - Los fondos usan un 16% del color del modo sobre la tarjeta.
  - Los iconos y bordes usan un 70% del color del modo mezclado con el color de texto del tema. Eso
    oscurece en modo claro y aclara en modo oscuro con una sola regla.
- **Resultado** con esa mezcla, sobre la tarjeta y sobre el fondo teñido. Se calculó con texto `#141414`
  en claro y `#e1e1e1` en oscuro; con texto blanco en oscuro, el contraste es mayor:

| Color | Claro | Oscuro |
|---|---|---|
| Frío | 5,31 / 4,48 | 6,99 / 5,60 |
| Calor | 4,85 / 4,12 | 7,41 / 5,86 |
| Secar | 3,90 / 3,44 | 8,97 / 6,68 |
| Ventilación | 4,13 / 3,58 | 8,45 / 6,44 |
| Automático | 4,80 / 4,14 | 7,68 / 5,98 |
| Error | 6,91 / 5,56 | 5,46 / 4,68 |
| Éxito | 5,53 / 4,67 | 6,87 / 5,52 |

- **Alternativas descartadas**: fijar colores propios para cada modo claro y oscuro ignoraría el tema de
  la persona.

## R4. Contraste de los botones llenos

- **Hallazgo**: el blanco sobre el color primario predeterminado, `#009ac7`, da cerca de 3,3:1, y no
  llega a 4,5:1. Sobre el rojo de error tampoco alcanza.
- **Decisión**: los botones llenos usan un 70% del color primario mezclado con negro, y un 80% en el caso
  del color de error. Se comprueba con `tests/frontend/contrast.test.js`.
- **Alternativas descartadas**: `--ha-color-fill-primary-loud-hover` da buen contraste, pero ignora el
  `--primary-color` que define un tema personalizado.

## R5. Foco al volver a dibujar

- **Hallazgo**: el panel reemplaza su contenido en cada cambio y recupera el foco desde el elemento
  activo. Al enviar, el botón se deshabilita, pierde el foco y no lo recupera.
- **Decisión**: recordar el último control con foco entre dibujos. Si ya no existe o está deshabilitado,
  el foco pasa a la acción principal de la pantalla.
- **Alternativas descartadas**: actualizar solo partes de la pantalla obligaría a reescribir el panel, con
  más riesgo de cambiar su comportamiento.

## R6. Animaciones

- **Decisión**: solo con CSS y de 400 ms como máximo: un indicador en el botón que envía, ondas sobre el
  modo mientras se envía, y una entrada breve del resultado. Toda animación se anula con
  `prefers-reduced-motion: reduce`, y el texto "Enviando…" comunica lo mismo.
- **Razón**: el panel se dibuja de nuevo al cambiar de estado, así que las animaciones de entrada se
  disparan solas en el momento correcto. Solo se aplican a elementos que aparecen en ese estado.
- **Excepción**: el indicador de envío se repite mientras dura el envío, porque refleja una espera. Los
  400 ms son la duración de cada ciclo.

## R7. Iconos

- **Decisión**: incluir en `icons.js` los trazados SVG de los iconos usados, copiados de `@mdi/js`.
- **Razón**: son los iconos que usa Home Assistant, funcionan sin internet y no requieren compilación. La
  licencia Apache-2.0 permite incluirlos con su atribución.
- **Alternativas descartadas**: `ha-icon` es un elemento interno (R1). Una fuente de iconos pesa más y
  necesita descargarse.

## R8. Acción principal como función pura

- **Decisión**: agregar a `session.js` una función `primaryAction`, que devuelve la acción principal de
  la pantalla de prueba.
- **Razón**: es la única lógica nueva, y como función pura se prueba sin navegador.

## R9. Disposición de la pantalla de prueba

- **Decisión**: una columna en celular. En pantallas anchas, dos columnas: el modo, la temperatura y el
  estado a la izquierda, y las opciones a la derecha. El orden del documento es el mismo en ambos casos,
  para que el orden del teclado sea lógico.
- **Razón**: la persona ve el modo y la temperatura sin desplazarse, y el espacio de estado reservado
  evita que los controles salten al enviar (FR-006).

## R10. Comprobación visual

- **Decisión**: guardar la página de prueba como `tests/frontend/harness.html`, con Home Assistant
  simulado y selector de tema claro y oscuro.
- **Razón**: la feature 001 la usó como archivo temporal. El rediseño necesita revisar todas las pantallas
  en varios temas y anchos, y volver a hacerlo en cada cambio.
- **Alternativas descartadas**: tests automáticos con un navegador real exigirían instalar herramientas
  en CI, y el panel no tiene comportamiento nuevo que los justifique.

## Validación

Medido el 2026-11-04 con la versión 0.2.0.

**Página de prueba**, con Home Assistant simulado:

- "Enviando" apareció 2 ms después de pulsar.
- Los controles no se mueven entre los cuatro estados de envío, a 320 y 375 píxeles.
- A 320 píxeles, en 7 pantallas, no hubo desplazamiento horizontal ni controles de menos de 44 píxeles.
- Un alta completa se hizo solo con teclado, sin perder el foco.

**Home Assistant real** 2026.10.3, con un Broadlink y un aire:

- Los colores del tema coinciden con los de `research.md`, en claro y oscuro, y el panel siguió el cambio
  de tema sin recargar.
- Escenarios de la feature 001: el emisor apagado muestra el error y conserva el código; recargar durante
  un alta no crea nada; salir sin guardar conserva el código; cambiar el nombre conserva el `entity_id`; y
  borrar quita la entidad y deja el otro clima.
- La entidad de un clima nuevo apareció 51 ms después de guardar.
- Tras el reinicio de la instalación, el clima volvió disponible y conservó su sensor.
- Estas pruebas leen el estado de Home Assistant. Que el aire obedeciera no se observó.
