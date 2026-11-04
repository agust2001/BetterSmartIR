# Especificación de la feature: Rediseño visual del panel

**Rama de la feature**: Sin rama propia todavía

**Creada**: 2026-11-04

**Estado**: Borrador

**Entrada**: Descripción del usuario:

> Quiero rediseñar la interfaz gráfica de BetterSmartIR para que se vea moderna y sea más atractiva,
> sin cambiar lo que hace.
>
> Problema: la pantalla de pruebas funciona, pero se ve básica. Los botones parecen genéricos, cuesta
> distinguir la acción principal y no resulta agradable de usar.
>
> Qué quiero:
>
> - Botones modernos, con estados claros: normal, al pasar el cursor, presionado, deshabilitado y
>   enviando.
> - Una acción principal evidente en cada pantalla, como "Enviar comando" o "Funcionó".
> - Una jerarquía visual clara, con buen espaciado, tarjetas e iconos.
> - Una apariencia más llamativa: el modo y la temperatura destacan en grande, los modos usan colores
>   distintos (frío azul, calor naranja) y hay animaciones breves al enviar un comando.
> - Una respuesta visual inmediata al enviar un comando, si funcionó y si falló.
>
> Restricciones:
>
> - Debe sentirse parte de Home Assistant, respetar el tema del usuario y funcionar en modo claro y
>   oscuro.
> - Debe funcionar bien en celular y en computadora.
> - Debe cumplir contraste accesible, poder usarse con teclado y respetar la preferencia de reducir
>   animaciones.
>
> Fuera de alcance: cambiar funciones, flujos o datos guardados.
>
> Éxito: al abrir la pantalla se entiende de inmediato qué hacer, y todas las funciones siguen
> funcionando igual que antes.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Entender de un vistazo la pantalla de prueba (Prioridad: P1)

Una persona está probando códigos frente a su aire. Al abrir la pantalla de prueba ve en grande el modo
y la temperatura que va a enviar, reconoce el modo por su color e icono, y distingue sin dudar cuál es
el siguiente paso.

**Por qué esta prioridad**: es la pantalla donde se pasa más tiempo y la que motivó el rediseño. Por sí
sola resuelve el problema principal.

**Prueba independiente**: abrir la pantalla de prueba con un código real y comprobar que el modo, la
temperatura y la acción principal destacan, y que todos los controles anteriores siguen ahí y hacen lo
mismo.

**Escenarios de aceptación**:

1. **Dado** que se abre un código para probar, **cuando** aparece la pantalla, **entonces** el modo y la
   temperatura son los elementos más grandes y la posición "código N de M" sigue visible.
2. **Dado** que la combinación está en frío, **cuando** se cambia a calor, **entonces** el color y el
   icono del modo cambian de azul a naranja.
3. **Dado** que todavía no se envió nada con este código, **cuando** se mira la pantalla, **entonces** la
   acción principal es encender.
4. **Dado** que un comando se envió y falta indicar si el aire respondió, **cuando** se mira la pantalla,
   **entonces** la acción principal es indicar que funcionó.
5. **Dado** que la persona indicó que el aire respondió, **cuando** se mira la pantalla, **entonces** la
   acción principal es guardar el código.
6. **Dado** cualquier botón, **cuando** se pasa el cursor, se presiona, se deshabilita o está enviando,
   **entonces** cada estado se distingue a simple vista de los demás.

---

### Historia de usuario 2 - Ver al instante qué pasó con el comando (Prioridad: P2)

Una persona pulsa un botón de la pantalla de prueba, y el panel le muestra de inmediato que el comando
está saliendo, y después si se envió o si falló, sin que tenga que buscar el mensaje.

**Por qué esta prioridad**: la persona suele estar mirando el aire, no la pantalla. Una respuesta clara
evita repetir comandos y dudar de si salieron.

**Prueba independiente**: enviar un comando con el emisor encendido y otro con el emisor apagado, y
comprobar que cada resultado se distingue de inmediato y sin depender solo del color.

**Escenarios de aceptación**:

1. **Dado** un comando que se está enviando, **cuando** se pulsa el botón, **entonces** ese botón muestra
   el estado "enviando" de inmediato y los demás controles de envío quedan deshabilitados.
2. **Dado** un comando que se emitió, **cuando** termina el envío, **entonces** aparece una confirmación
   con icono y texto que dice que se envió, y pregunta si el aire respondió.
3. **Dado** un comando que no pudo salir, **cuando** termina el envío, **entonces** aparece un error con
   icono y texto, y se conserva la posición en la lista.
4. **Dado** que la persona pidió reducir animaciones, **cuando** envía un comando, **entonces** ve los
   mismos estados y mensajes sin movimiento.

---

### Historia de usuario 3 - Un panel coherente en todas las pantallas (Prioridad: P3)

Una persona recorre el panel, desde la lista de climas hasta guardar, cambiar o borrar, y todas las
pantallas se ven como parte de lo mismo y de Home Assistant, en su tema, en su celular o en su
computadora.

**Por qué esta prioridad**: da unidad al resultado, pero el mayor valor está en la pantalla de prueba.

**Prueba independiente**: recorrer todas las pantallas en modo claro y oscuro, en celular y en
computadora, y solo con teclado, y comprobar que cada una tiene una acción principal y funciona igual
que antes.

**Escenarios de aceptación**:

1. **Dado** un tema de Home Assistant con colores propios, **cuando** se abre el panel, **entonces** el
   panel usa los colores de ese tema.
2. **Dado** el modo oscuro, **cuando** se recorren las pantallas, **entonces** todos los textos e iconos
   se leen sin dificultad.
3. **Dado** un celular, **cuando** se abre cualquier pantalla, **entonces** no hay desplazamiento
   horizontal y los botones se pulsan con comodidad.
4. **Dado** que se usa solo el teclado, **cuando** se recorre una pantalla, **entonces** se alcanza cada
   control en un orden lógico y siempre se ve cuál tiene el foco.
5. **Dado** la pantalla de borrar, **cuando** se mira, **entonces** la acción de borrar se reconoce como
   destructiva.

---

### Casos límite

- **Modo sin color propio**: un modo que no sea frío ni calor usa su propio color o, si no lo tiene, un
  color neutro con su icono y su nombre.
- **Código sin comandos utilizables**: la pantalla no muestra modo ni temperatura grandes, explica el
  motivo y la acción principal es pasar al siguiente código.
- **Sin climas**: la lista muestra el mensaje actual y la acción principal es agregar un clima.
- **Sin emisores**: la pantalla muestra el mensaje actual y deja cancelar.
- **Códigos agotados**: la acción principal es recorrerlos de nuevo.
- **Nombres largos**: un nombre, una marca o un modelo largos no rompen la tarjeta ni causan
  desplazamiento horizontal.
- **Muchas opciones**: un código con muchos modos, ventiladores u oscilaciones sigue siendo usable en
  celular.
- **Tema con poco contraste**: si los colores del tema dan poco contraste con los colores de modo, el
  texto del modo sigue siendo legible.
- **Sin internet**: el panel se ve completo, con sus iconos, aunque Home Assistant no tenga internet.
- **Texto grande**: con el texto del navegador ampliado al 200%, no se pierde contenido ni función.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Sin cambios de comportamiento**

- **FR-001**: El rediseño NO DEBE agregar, quitar ni cambiar funciones, pantallas, pasos ni el orden del
  flujo. Cada botón DEBE producir el mismo efecto que antes.
- **FR-002**: El rediseño NO DEBE cambiar los datos guardados ni requerir ninguna migración.
- **FR-003**: El panel DEBE seguir mostrando la misma información que antes en cada pantalla, en español
  y en inglés.
- **FR-004**: "Enviado" DEBE seguir significando que el comando se emitió, no que el aire respondió, y
  la confirmación visual NO DEBE sugerir otra cosa.

**Jerarquía y acción principal**

- **FR-005**: Cada pantalla DEBE tener una sola acción principal, que destaque sobre las demás:

  | Pantalla | Acción principal |
  |---|---|
  | Lista de climas | Agregar clima |
  | Elegir emisor y marca | Empezar a probar |
  | Prueba, sin nada enviado | Encender |
  | Prueba, esperando respuesta | Indicar que funcionó |
  | Prueba, tras confirmar que respondió | Guardar este código |
  | Prueba, tras indicar que no respondió | Siguiente código |
  | Códigos agotados | Recorrerlos de nuevo |
  | Guardar | Guardar |
  | Cambiar un clima | Guardar |
  | Borrar un clima | Borrar |

- **FR-006**: La acción principal de la pantalla de prueba DEBE cambiar según su estado, sin mover de
  lugar los demás controles.
- **FR-007**: El contenido DEBE organizarse en tarjetas, con espaciado uniforme y títulos que muestren
  la importancia de cada parte.
- **FR-008**: Los botones de acción y los modos DEBEN tener icono, además de su texto.
- **FR-009**: La acción de borrar DEBE verse como destructiva y distinta de una acción principal común.

**Botones**

- **FR-010**: Todos los botones DEBEN mostrar de forma distinguible los estados normal, cursor encima,
  presionado, deshabilitado y con foco de teclado.
- **FR-011**: Los botones que envían comandos DEBEN mostrar además el estado "enviando".

**Modo y temperatura**

- **FR-012**: En la pantalla de prueba, el modo y la temperatura elegidos DEBEN ser los elementos más
  destacados.
- **FR-013**: Cada modo DEBE tener su color e icono: frío azul, calor naranja, y colores distintos para
  los demás modos.

**Respuesta al enviar**

- **FR-014**: Al pulsar un botón de envío, el panel DEBE mostrar el estado "enviando" de inmediato.
- **FR-015**: El panel DEBE mostrar el resultado del envío, con icono y texto, distinguiendo con claridad
  "enviado" de "falló".
- **FR-016**: Los cambios de estado al enviar DEBEN incluir animaciones breves, que no demoren el uso del
  panel.

**Integración con Home Assistant**

- **FR-017**: El panel DEBE tomar sus colores de fondo, texto, tarjetas y acento del tema de la persona,
  y seguir sus modos claro y oscuro.
- **FR-018**: Los colores de los modos y de los resultados DEBEN ser legibles en modo claro y oscuro.
- **FR-019**: El panel DEBE verse completo sin acceso a internet.

**Celular y computadora**

- **FR-020**: Todas las pantallas DEBEN adaptarse desde 320 píxeles de ancho hasta una computadora de
  escritorio, sin desplazamiento horizontal.
- **FR-021**: Los controles táctiles DEBEN medir al menos 44 por 44 píxeles.

**Accesibilidad**

- **FR-022**: El texto DEBE tener un contraste de al menos 4,5:1 con su fondo, y de 3:1 si es texto
  grande. Los iconos y bordes necesarios para entender un control DEBEN tener al menos 3:1.
- **FR-023**: El color NO DEBE ser el único medio para comunicar un modo, un estado o un resultado.
- **FR-024**: Todas las funciones DEBEN poder usarse solo con teclado, en un orden lógico y con un foco
  siempre visible.
- **FR-025**: El foco NO DEBE perderse cuando la pantalla se actualiza después de una acción.
- **FR-026**: Los resultados de un envío y los errores DEBEN anunciarse a los lectores de pantalla.
- **FR-027**: Si la persona pidió reducir animaciones, el panel NO DEBE mostrar movimiento, y DEBE
  comunicar los mismos estados.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En cada una de las pantallas de FR-005, una persona que no conoce el panel identifica la
  acción principal en menos de 5 segundos.
- **SC-002**: Cada estado de la pantalla tiene exactamente una acción principal.
- **SC-003**: El estado "enviando" aparece en menos de 100 milisegundos desde que se pulsa el botón.
- **SC-004**: Ninguna transición dura más de 400 milisegundos, y ninguna retrasa la siguiente acción. El
  indicador de envío se mantiene mientras dura el envío.
- **SC-005**: El 100% de los textos, iconos y bordes necesarios cumple FR-022 en los temas predeterminados
  de Home Assistant, claro y oscuro.
- **SC-006**: El 100% de las funciones se completa solo con teclado.
- **SC-007**: Con la preferencia de reducir animaciones activa, no hay ningún movimiento en el panel.
- **SC-008**: Ninguna pantalla tiene desplazamiento horizontal entre 320 y 1920 píxeles de ancho.
- **SC-009**: Todos los tests existentes siguen pasando sin cambiar lo que comprueban, y todos los
  escenarios de `specs/001-climas-ir-prueba-grafica/quickstart.md` dan el mismo resultado que antes.

## Supuestos

- **Enviar comando**: no se agrega un botón "Enviar comando", porque hoy cada control envía al pulsarlo y
  cambiar eso alteraría el flujo. La acción principal antes de enviar es Encender, que sí envía un
  comando.
- **Funcionó**: el botón "Sí" que confirma la respuesta del aire puede pasar a decir "Funcionó", y "No"
  puede cambiar de forma equivalente. Cambia el texto, no el efecto.
- **Resultado del envío**: "si funcionó y si falló" se refiere a si el comando salió. Solo la persona
  puede saber si el aire respondió, como ya indica FR-004.
- **Alcance visual**: el rediseño abarca todas las pantallas del panel, con el mayor esfuerzo en la
  pantalla de prueba. No cambia la entidad `climate` ni otras pantallas de Home Assistant.
- **Estado real del aire**: la lista de climas no muestra el estado actual de cada aire, porque sería
  información nueva.
- **Colores de los demás modos**: el diseño define los colores de secar, ventilación y automático.
- **Temas**: la conformidad de contraste se garantiza en los temas predeterminados. Un tema personalizado
  puede dar otro contraste, pero el panel no debe perder información.
- **Dependencias**: se parte del panel y del comportamiento publicados en la versión 0.1.0.
