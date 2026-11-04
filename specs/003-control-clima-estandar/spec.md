# Especificación de la feature: Control de clima estándar en la prueba

**Rama de la feature**: Sin rama propia todavía

**Creada**: 2026-11-04

**Estado**: Borrador

**Entrada**: Descripción del usuario:

> Quiero que el control del clima en la pantalla de pruebas use la interfaz estándar de Home Assistant,
> en lugar de la interfaz propia actual.
>
> Adjunto dos capturas. La primera es lo que hay hoy: botones sueltos hechos a medida para encendido,
> modo, temperatura y ventilador. La segunda es lo que quiero: el control estándar de clima de Home
> Assistant, con el dial circular de temperatura y los selectores de modo, ventilador, preset y swing.
>
> Problema: la interfaz propia no se parece a Home Assistant, obliga a mantener controles inventados
> desde cero y no muestra cómo se verá realmente el clima una vez configurado.
>
> Qué quiero:
>
> - Probar cada código con el control estándar de clima, sin controles propios para encendido, modo,
>   temperatura o ventilador.
> - Que cada acción en ese control envíe el comando IR del código que se está probando.
> - Que solo aparezcan las opciones que admite ese código.
> - Conservar lo propio de la prueba: "Code 1 of 16", la marca, el código y las acciones para indicar si
>   funcionó o pasar al siguiente.
>
> Restricciones:
>
> - No copiar ni recrear el control a mano: debe ser el de Home Assistant, para que herede su tema y sus
>   mejoras.
> - Los climas de prueba no deben quedar como entidades permanentes si el usuario cancela, ni ensuciar el
>   historial o los dashboards.
> - Sigue sin requerir reinicios ni editar archivos.
>
> Fuera de alcance: cambiar el flujo de prueba o el formato de los códigos.
>
> Éxito: el control de la pantalla de pruebas se ve y funciona igual que el de un clima real de Home
> Assistant, y al guardar un código, el clima final se comporta igual que en la prueba.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Probar un código con el control real de clima (Prioridad: P1)

Una persona está probando códigos. En lugar de botones hechos a medida ve el control de clima de Home
Assistant, con su dial y sus selectores. Al usarlo, el aire recibe el comando del código en prueba.

**Por qué esta prioridad**: es el pedido central. Por sí sola reemplaza los controles propios y muestra
cómo se verá el clima.

**Prueba independiente**: abrir la pantalla de prueba, comparar el control con el de un clima real y
comprobar que cambiar el modo envía el comando del código en prueba.

**Escenarios de aceptación**:

1. **Dado** un código en prueba, **cuando** se abre la pantalla, **entonces** se ve el control estándar
   de clima de Home Assistant, y no hay botones propios de encendido, modo, temperatura ni ventilador.
2. **Dado** el control apagado, **cuando** se elige un modo, **entonces** el aire recibe el comando de
   encendido del código, si lo tiene, y el del estado elegido.
3. **Dado** el control encendido, **cuando** se cambia la temperatura, el modo, el ventilador o la
   oscilación, **entonces** el aire recibe el comando de ese estado completo.
4. **Dado** el control encendido, **cuando** se elige apagado, **entonces** el aire recibe el comando de
   apagado.
5. **Dado** un código con ciertas opciones, **cuando** se abren los selectores, **entonces** solo aparecen
   las que admite ese código, y no aparece un selector si el código no tiene ninguna opción para él.
6. **Dado** un cambio de código, **cuando** se pasa al siguiente, **entonces** el control muestra las
   opciones del nuevo código y vuelve a su estado inicial.

---

### Historia de usuario 2 - Conservar el flujo de prueba (Prioridad: P2)

La persona sigue viendo qué código prueba, sabe si el comando salió, indica si funcionó y pasa al
siguiente o guarda, igual que antes.

**Por qué esta prioridad**: sin esto, el control nuevo no serviría para encontrar el código correcto.

**Prueba independiente**: recorrer un alta completa desde la pantalla de prueba, con un comando que
funcione y otro que falle, y comprobar que el flujo es el mismo que en la versión 0.2.0.

**Escenarios de aceptación**:

1. **Dado** un código en prueba, **cuando** se mira la pantalla, **entonces** se ven su posición, la marca,
   el código y el modelo.
2. **Dado** un comando que salió, **cuando** termina el envío, **entonces** se pregunta si el aire respondió
   y la acción principal es indicar que funcionó.
3. **Dado** un comando que no pudo salir, **cuando** termina el envío, **entonces** se muestra el error, el
   control vuelve a su estado anterior y se conserva la posición en la lista.
4. **Dado** que se confirmó que el aire respondió, **cuando** se mira la pantalla, **entonces** la acción
   principal es guardar el código.
5. **Dado** que se indicó que no respondió, **cuando** se mira la pantalla, **entonces** la acción principal
   es pasar al siguiente código.

---

### Historia de usuario 3 - Probar sin dejar rastro (Prioridad: P2)

La persona prueba varios códigos y cancela. Nada de eso aparece después en sus entidades, su historial ni
sus dashboards.

**Por qué esta prioridad**: el control real no puede costar una instalación sucia.

**Prueba independiente**: probar varios códigos, cancelar y buscar rastros en las entidades, el historial,
el registro de actividad y los selectores de entidades de los dashboards.

**Escenarios de aceptación**:

1. **Dado** una prueba en curso, **cuando** se abre la lista de entidades, **entonces** no aparece ninguna
   entidad de prueba.
2. **Dado** una prueba cancelada, **cuando** se revisan el historial y el registro de actividad,
   **entonces** no hay registros de la prueba.
3. **Dado** que se cierra el navegador durante una prueba, **cuando** se revisa Home Assistant, **entonces**
   no queda nada de esa prueba.
4. **Dado** un clima existente, **cuando** se prueba otro código y se sale sin guardar, **entonces** el clima
   conserva su código, y su estado e historial no cambian.

---

### Historia de usuario 4 - El clima guardado se comporta como en la prueba (Prioridad: P3)

La persona guarda un código y, al usar el clima final, encuentra las mismas opciones y el mismo
comportamiento que en la prueba.

**Por qué esta prioridad**: es lo que hace que la prueba sea fiable, y se apoya en las historias anteriores.

**Prueba independiente**: comparar, para un mismo código, las opciones y respuestas del control en la prueba
y del clima guardado.

**Escenarios de aceptación**:

1. **Dado** un código guardado, **cuando** se abre el clima, **entonces** ofrece los mismos modos,
   temperaturas, ventilador y oscilación que en la prueba.
2. **Dado** una misma acción, **cuando** se hace en la prueba y en el clima guardado, **entonces** se envían
   los mismos comandos.
3. **Dado** una combinación que el código no tiene, **cuando** se elige en la prueba o en el clima guardado,
   **entonces** ambos muestran un error y conservan el estado anterior.

---

### Casos límite

- **Apagado**: mientras el control está apagado, cambiar la temperatura o el ventilador no envía nada,
  igual que en un clima real, y no se pregunta si el aire respondió.
- **Combinación faltante**: una temperatura o un ventilador que el código no tiene para ese modo muestran
  un error y no cambian el control.
- **Código sin comandos utilizables**: no se muestra el control, se explica el motivo y la acción principal
  es pasar al siguiente código.
- **Emisor apagado o no disponible**: se muestra el error actual, sin dar el comando por enviado.
- **Acción durante un envío**: no se envía un segundo comando, y el control refleja el último estado que sí
  se envió.
- **Varios cambios rápidos en el dial**: se envía un solo comando con el valor final, igual que en un clima
  real.
- **Clima existente con sensores**: el control muestra la temperatura y la humedad actuales.
- **Clima nuevo**: el control no muestra temperatura actual, porque todavía no tiene sensores.
- **Sin preset**: si el código no tiene presets, el selector no aparece.
- **Actualización de Home Assistant**: si el control estándar deja de estar disponible, el panel lo indica
  y no deja una pantalla en blanco.
- **Usuario sin permisos de administración**: sigue sin poder usar el panel.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Control estándar**

- **FR-001**: La pantalla de prueba DEBE usar el control de clima de Home Assistant, con su dial y sus
  selectores, en la forma que Home Assistant permite incluir en otras pantallas.
- **FR-002**: El control NO DEBE ser una copia ni una recreación: DEBE provenir de Home Assistant, de modo
  que herede su tema, su idioma y sus mejoras futuras.
- **FR-003**: La pantalla de prueba NO DEBE incluir controles propios de encendido, modo, temperatura,
  ventilador ni oscilación.
- **FR-004**: El control DEBE funcionar en celular, en computadora y con teclado, igual que en un clima real.

**Opciones y comandos**

- **FR-005**: El control DEBE ofrecer solo los modos, el rango de temperatura, el ventilador, la oscilación
  y los presets que admite el código en prueba.
- **FR-006**: Cada acción del control DEBE enviar el comando del código en prueba por el emisor elegido,
  salvo los cambios hechos con el control apagado.
- **FR-007**: Pasar de apagado a un modo DEBE enviar el comando de encendido del código, si lo tiene, y el
  del estado elegido.
- **FR-008**: Una combinación que el código no tiene DEBE mostrar un error y conservar el estado anterior.
- **FR-009**: Un comando que no salió NO DEBE darse por enviado, y el control DEBE volver a su estado
  anterior.
- **FR-010**: El control DEBE empezar apagado en cada código.

**Flujo de prueba**

- **FR-011**: La pantalla DEBE conservar la posición, la marca, el código, el modelo, la indicación de si el
  aire respondió, y las acciones de anterior, siguiente, guardar y cancelar.
- **FR-012**: El flujo de prueba, de alta y de edición, NO DEBE cambiar.
- **FR-013**: La acción principal DEBE ser la definida en la feature 002, con una excepción: antes de enviar
  no hay botón Encender, y el control es el elemento principal de la pantalla.
- **FR-014**: La respuesta visual al enviar DEBE seguir funcionando como en la feature 002.

**Sin rastro**

- **FR-015**: Una prueba NO DEBE crear entidades ni dispositivos permanentes, ni antes ni después de
  cancelar.
- **FR-016**: Una prueba NO DEBE aparecer en el historial, el registro de actividad, los dashboards, los
  selectores de entidades ni las automatizaciones.
- **FR-017**: Cerrar el navegador durante una prueba NO DEBE dejar nada en Home Assistant.
- **FR-018**: Probar un código desde un clima existente NO DEBE cambiar el estado ni el historial de ese
  clima hasta guardar.

**Coherencia con el clima guardado**

- **FR-019**: Para un mismo código, la prueba y el clima guardado DEBEN ofrecer las mismas opciones y enviar
  los mismos comandos ante las mismas acciones.
- **FR-020**: El formato de los códigos y los datos guardados NO DEBEN cambiar.

**Reglas generales**

- **FR-021**: Nada de esta feature DEBE requerir editar archivos ni reiniciar Home Assistant, salvo el
  reinicio de instalar la actualización.
- **FR-022**: Si el control estándar no se puede cargar, el panel DEBE mostrar un mensaje comprensible.

### Relación con la feature 002

Esta feature reemplaza, solo en la pantalla de prueba:

- La tarjeta destacada de modo y temperatura, y los colores de modo propios (FR-012 y FR-013 de la 002).
- Las pastillas de modo, ventilador y oscilación, y los botones de encendido y temperatura.
- La fila "Prueba, sin nada enviado: Encender" de FR-005 de la 002.

El resto de la feature 002 sigue vigente, incluidos los demás estados de la acción principal, la respuesta
al enviar, el foco, los anuncios y el contraste de los elementos propios.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Una persona no distingue el control de la prueba del de un clima real con las mismas opciones.
- **SC-002**: El 100% de las acciones del control con el aire encendido envía el comando esperado del código
  en prueba.
- **SC-003**: En una muestra de al menos 10 códigos del catálogo, incluidos códigos con y sin oscilación, el
  control solo ofrece opciones que el código admite.
- **SC-004**: Después de probar 5 códigos y cancelar, hay 0 entidades, dispositivos y registros de historial
  nuevos.
- **SC-005**: Para esos mismos códigos, el 100% de las acciones produce los mismos comandos en la prueba y en
  el clima guardado.
- **SC-006**: Una persona completa un alta con el mismo número de pasos que en la versión 0.2.0.
- **SC-007**: Todos los escenarios de `specs/001-climas-ir-prueba-grafica/quickstart.md` dan el mismo
  resultado que antes.
- **SC-008**: El control responde a una acción en menos de 1 segundo, sin contar la espera del emisor.

## Supuestos

- **Control apagado**: se aplica el comportamiento de un clima real, que no envía nada al cambiar valores
  estando apagado. Esto matiza "cada acción envía el comando", para que la prueba sea igual al clima final.
- **Referencia visual**: "control estándar" es la tarjeta de termostato de Home Assistant, con su dial y sus
  selectores. La vista de la segunda captura, que se abre al tocar un clima, no se puede incluir en otra
  pantalla. Se ve casi igual.
- **Preset**: el selector aparece solo si el código tiene presets.
- **Opciones por modo**: como en el clima real, el control ofrece las opciones del código en conjunto. Una
  combinación que no existe para el modo actual da un error, en lugar de ocultarse.
- **Estado del aire**: el infrarrojo no informa el estado real, así que el control muestra el último estado
  enviado.
- **Pantallas fuera de alcance**: las demás pantallas del panel no cambian.
- **Dependencia**: usar el control sin una entidad depende de partes internas de la interfaz de Home
  Assistant. El plan lo confirmó en una instalación real, y lo registra como desviación justificada.
- **Unidades**: el control usa la unidad de temperatura de la instalación, igual que un clima real.
- **Validación**: el control solo existe dentro de Home Assistant, así que su aspecto se valida en una
  instancia real.
