# Contrato: Interfaz del panel

Define lo que el rediseño debe respetar. La
[API WebSocket](../../001-climas-ir-prueba-grafica/contracts/websocket-api.md) no cambia.

## Compatibilidad

- Cada `data-action` actual se conserva, con el mismo efecto.
- Cada vista actual se conserva: `list`, `select`, `test`, `save`, `edit` y `delete`, además del aviso de
  códigos agotados.
- Los textos pueden cambiar solo en los botones de resultado: "Sí" pasa a "Funcionó" y "No" a "No
  funcionó", en español e inglés.

## Variantes de botón

| Variante | Uso | Apariencia |
|---|---|---|
| Principal | Una sola por estado de pantalla | Lleno con el color primario |
| Destructiva | Confirmar un borrado | Lleno con el color de error |
| Secundaria | Resto de las acciones | Borde y fondo de tarjeta |
| Opción | Modo, ventilador y oscilación | Pastilla; si está elegida, con fondo teñido, borde e icono de marca |

## Estados de botón

Todas las variantes, salvo donde se indica:

| Estado | Señal |
|---|---|
| Normal | Apariencia de la variante |
| Cursor encima | Fondo o borde más intenso, solo en dispositivos con cursor |
| Presionado | Más oscuro y levemente reducido |
| Foco de teclado | Anillo de 2 píxeles separado del botón |
| Deshabilitado | Opacidad reducida y cursor normal |
| Enviando | Indicador en lugar del icono, solo en el botón que envía |

## Tamaños

| Elemento | Valor |
|---|---|
| Área mínima de un control | 44 por 44 píxeles |
| Temperatura en celular y computadora | 56 y 72 píxeles |
| Nombre del modo | 22 píxeles |
| Espaciado base | Múltiplos de 4 píxeles |
| Radio de tarjetas y botones | `--ha-card-border-radius`, con respaldo de 12 píxeles |

## Colores

Las proporciones están en [research.md](../research.md), R3 y R4.

| Uso | Regla |
|---|---|
| Fondos, tarjetas, texto y divisores | Variables del tema |
| Fondo de modo | 16% del color del modo sobre la tarjeta |
| Icono y borde de modo | 70% del color del modo con el color de texto |
| Resultado del envío | Igual que un modo, con el color de éxito o de error |
| Texto | Siempre el color de texto del tema |

## Respuesta al enviar

| Estado | Lo que se ve | Lo que se anuncia |
|---|---|---|
| Sin enviar | Indicación breve de qué hacer | Nada |
| Enviando | Indicador en el botón y ondas sobre el modo | Enviando… |
| Enviado | Banda de éxito con marca y pregunta | Enviado. ¿El aire respondió? |
| Falló | Banda de error con aviso y motivo | El motivo, con prioridad |

La banda ocupa un espacio reservado, para que los controles no se muevan.

## Accesibilidad

- Los iconos son decorativos cuando hay texto al lado, y se ocultan a los lectores de pantalla.
- Los botones de temperatura tienen un nombre accesible, porque solo muestran un símbolo.
- Las opciones elegidas se comunican con `aria-pressed`.
- El estado de envío se anuncia en una región `role="status"` que no se vuelve a dibujar, y los errores
  usan `role="alert"`.
- Con `prefers-reduced-motion: reduce` no hay animaciones ni transiciones.
