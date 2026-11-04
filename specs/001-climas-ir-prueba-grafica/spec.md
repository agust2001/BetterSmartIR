# Especificación de la feature: Climas IR con prueba gráfica

**Rama de la feature**: No aplica (el proyecto todavía no es un repositorio git)

**Creada**: 2026-11-03

**Estado**: Borrador

**Entrada**: Descripción del usuario:

> BetterSmartIR es una integración para controlar aires acondicionados por infrarrojo, similar a
> SmartIR, pero que permite probarlos de forma gráfica.
>
> Problema: hoy, para probar un clima con SmartIR tengo que editar configuration.yaml, reiniciar
> Home Assistant y ver si el aire responde. Si el código no sirve, repito todo. Encontrar el
> correcto puede tomar muchos reinicios.
>
> Usuario: alguien con Home Assistant y un emisor IR que quiere agregar su aire sin tocar YAML.
>
> Qué debe poder hacer:
> - Agregar un clima desde la interfaz, eligiendo el emisor IR y la marca.
> - Probar códigos desde una pantalla gráfica, enviando comandos como encender, apagar, cambiar
>   modo, temperatura y ventilador.
> - Indicar si el aire respondió a cada comando y pasar al siguiente código si no.
> - Guardar el código que funcionó y crear la entidad climate sin reiniciar.
> - Cambiar o borrar un clima existente, también sin reiniciar.
>
> Fuera de alcance por ahora: aprender códigos nuevos desde un control remoto y controlar
> televisores o ventiladores.
>
> Éxito: puedo agregar y dejar funcionando un aire sin editar archivos ni reiniciar Home Assistant.

## Aclaraciones

### Sesión 2026-11-03

- P: ¿De dónde salen las marcas y los códigos que la persona va a probar? → R: El catálogo viene
  incluido en la integración, funciona sin internet y se amplía al publicar versiones nuevas.
- P: ¿Qué tipos de emisor IR debe admitir la primera versión? → R: Solo Broadlink.
- P: ¿Cuándo se puede guardar un código, si solo algunos de sus comandos funcionaron? → R: La persona
  decide cuándo guardar; si hay comandos sin probar o marcados como fallidos, ve un resumen y confirma.
- P: ¿Dónde vive la pantalla gráfica de prueba dentro de Home Assistant? → R: En un panel propio de la
  integración en la barra lateral, con la lista de climas y una pantalla tipo control remoto.
- P: ¿La entidad climate debe poder usar sensores externos en esta primera versión? → R: Sí, sensores
  opcionales de temperatura y humedad; el sensor de encendido queda fuera.
- P: ¿Qué base de datos usa el catálogo incluido? → R: La misma de códigos de clima de SmartIR, con sus
  mismos números de código.
- P: ¿Qué hallazgos del plan se suman a la spec? → R: La oscilación cuando el código la tiene, ignorar
  los modos que Home Assistant no reconoce, el paso único de agregar la integración y el error al
  enviar con el emisor apagado.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Agregar un aire y dejarlo funcionando (Prioridad: P1)

Una persona con Home Assistant y un emisor IR agrega su aire desde la interfaz: elige el emisor y
la marca, y prueba los códigos de esa marca desde una pantalla gráfica. Con cada código envía
comandos al aire e indica si respondió. Si no respondió, pasa al siguiente código. Cuando encuentra
uno que funciona, lo guarda y obtiene una entidad climate lista para usar, sin editar archivos ni
reiniciar Home Assistant.

**Por qué esta prioridad**: es la razón de ser del proyecto. Por sí sola reemplaza el ciclo de
editar YAML y reiniciar por cada intento, y ya entrega el resultado de éxito definido.

**Prueba independiente**: con un emisor IR y un aire de una marca disponible, completar el flujo
desde cero y controlar el aire con la entidad creada, comprobando que no se editó ningún archivo y
que Home Assistant no se reinició.

**Escenarios de aceptación**:

1. **Dado** que hay al menos un emisor Broadlink disponible, **cuando** la persona inicia el alta de
   un clima desde el panel, **entonces** puede elegir el emisor y la marca.
2. **Dado** que eligió emisor y marca, **cuando** llega a la pantalla de prueba, **entonces** ve el
   código actual, su posición entre los códigos de la marca y los comandos que puede enviar.
3. **Dado** que está probando un código, **cuando** pulsa un comando, **entonces** ese comando se
   envía al aire por el emisor elegido y la pantalla confirma si se pudo enviar.
4. **Dado** que envió un comando, **cuando** indica que el aire no respondió, **entonces** puede
   pasar al siguiente código sin salir de la pantalla de prueba.
5. **Dado** que el aire respondió, **cuando** guarda el código, **entonces** la entidad climate
   aparece y se puede usar sin reiniciar Home Assistant.
6. **Dado** que hay comandos sin probar o marcados como fallidos, **cuando** intenta guardar el
   código, **entonces** ve un resumen de esos comandos y puede confirmar o seguir probando.
7. **Dado** que la entidad fue creada, **cuando** la persona la usa para encender el aire o cambiar
   modo, temperatura o ventilador, **entonces** el aire recibe el comando correspondiente.
8. **Dado** que un clima fue guardado, **cuando** Home Assistant se reinicia por cualquier motivo,
   **entonces** el clima sigue disponible y funcionando.

---

### Historia de usuario 2 - Cambiar un clima existente (Prioridad: P2)

La persona ajusta un clima ya configurado: por ejemplo le cambia el nombre, lo pasa a otro emisor
IR, o vuelve a la pantalla de prueba para elegir otro código porque el guardado no funciona del todo
bien. Los cambios se aplican sin reiniciar y la entidad conserva su identidad.

**Por qué esta prioridad**: sin esta historia, corregir un clima obligaría a borrarlo y rehacerlo,
perdiendo las automatizaciones y paneles que lo usan.

**Prueba independiente**: partiendo de un clima existente usado en una automatización, cambiarle el
emisor y el código, y comprobar que la automatización sigue funcionando sin reiniciar.

**Escenarios de aceptación**:

1. **Dado** un clima existente, **cuando** la persona cambia su nombre o su emisor IR, **entonces**
   el cambio tiene efecto de inmediato, sin reiniciar.
2. **Dado** un clima existente, **cuando** vuelve a la pantalla de prueba y guarda otro código,
   **entonces** la entidad pasa a usar el código nuevo sin reiniciar.
3. **Dado** que entró a la pantalla de prueba de un clima existente, **cuando** sale sin guardar,
   **entonces** el clima conserva su código anterior.
4. **Dado** un clima usado en automatizaciones, **cuando** se cambia su emisor o su código,
   **entonces** esas automatizaciones siguen apuntando a la misma entidad.
5. **Dado** un clima existente, **cuando** la persona le asocia un sensor de temperatura o de humedad,
   **entonces** la entidad muestra ese valor sin reiniciar.

---

### Historia de usuario 3 - Borrar un clima (Prioridad: P3)

La persona elimina un clima que ya no necesita. La entidad desaparece de Home Assistant sin
reiniciar.

**Por qué esta prioridad**: completa el ciclo de vida, pero es la operación menos frecuente y existe
la alternativa temporal de ignorar el clima.

**Prueba independiente**: borrar un clima existente y comprobar que su entidad ya no existe y que
los demás climas siguen funcionando, sin reiniciar.

**Escenarios de aceptación**:

1. **Dado** un clima existente, **cuando** la persona lo borra, **entonces** su entidad desaparece
   sin reiniciar Home Assistant.
2. **Dado** varios climas configurados, **cuando** se borra uno, **entonces** los demás siguen
   funcionando sin cambios.

---

### Casos límite

- **Sin emisores**: si no hay ningún emisor Broadlink disponible, el alta explica qué falta y no
  continúa.
- **Marca no disponible**: si la marca del aire no está en la lista, se informa a la persona y no se
  crea ningún clima.
- **Ningún código funciona**: si la persona agota los códigos de la marca, se le informa, puede
  volver a recorrerlos o cancelar, y no se crea ninguna entidad.
- **Emisor con fallo durante la prueba**: si un comando no se puede enviar, la pantalla lo indica con
  claridad y la persona no pierde su posición en la lista de códigos.
- **Emisor apagado**: si la entidad del emisor está apagada, el comando no se emite. La pantalla lo
  informa como error, para que la persona no descarte un código bueno.
- **Enviado no significa recibido**: el emisor no sabe si el aire recibió el comando, así que la
  pantalla distingue "enviado" de "el aire respondió", y solo la persona confirma lo segundo.
- **Prueba abandonada**: si la persona cierra la pantalla sin guardar, no queda ninguna entidad ni
  configuración a medias.
- **Emisor eliminado después**: si el emisor de un clima guardado deja de existir, la entidad se
  muestra como no disponible y la persona puede asignarle otro emisor.
- **Comandos no soportados**: la pantalla de prueba y la entidad solo ofrecen los modos, temperaturas,
  velocidades y oscilaciones que el código admite. Algunos códigos de SmartIR tienen combinaciones
  faltantes, que no se ofrecen.
- **Cambio de estado por control remoto físico**: si alguien usa el control remoto del aire, el
  estado de la entidad queda desactualizado, porque el infrarrojo no informa de vuelta.
- **Sensor no disponible**: si un sensor asociado deja de informar, la entidad sigue funcionando y
  solo deja de mostrar ese valor.
- **Nombre repetido**: dos climas pueden compartir emisor, pero la interfaz los mantiene
  distinguibles aunque se les dé el mismo nombre.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Alta y selección**

- **FR-001**: El sistema DEBE permitir agregar un clima completamente desde un panel propio de la
  integración, accesible desde la barra lateral de Home Assistant, sin editar archivos.
- **FR-002**: El sistema DEBE permitir elegir el emisor IR entre los emisores Broadlink disponibles
  en Home Assistant.
- **FR-003**: El sistema DEBE permitir elegir la marca del aire de una lista.
- **FR-004**: El sistema DEBE ofrecer los códigos de la marca elegida como candidatos a probar,
  tomados de un catálogo incluido en la integración, sin necesitar conexión a internet.
- **FR-026**: El catálogo DEBE ser la base de datos de códigos de clima de SmartIR, sin alterar sus
  comandos y conservando sus números de código. De ella se ofrecen los códigos compatibles con
  emisores Broadlink.

**Prueba gráfica**

- **FR-005**: El panel DEBE ofrecer una pantalla gráfica tipo control remoto para probar un código,
  con botones que envían al instante los comandos de encender, apagar, cambiar modo, cambiar
  temperatura y cambiar ventilador, además de cambiar oscilación si el código la tiene.
- **FR-006**: La pantalla de prueba DEBE mostrar el código actual y su posición entre los candidatos.
- **FR-007**: La pantalla de prueba DEBE confirmar si cada comando se pudo enviar y mostrar un error
  comprensible si no.
- **FR-008**: La persona DEBE poder indicar, para cada comando enviado, si el aire respondió.
- **FR-009**: La persona DEBE poder pasar al siguiente código, y volver a uno anterior, sin salir de
  la pantalla de prueba.
- **FR-010**: La pantalla de prueba DEBE ofrecer solo los comandos que el código actual admite.
- **FR-011**: Probar códigos NO DEBE crear entidades ni dejar configuración guardada hasta que la
  persona guarde un código.

**Guardado y entidad**

- **FR-012**: La persona DEBE poder guardar el código en cualquier momento de la prueba y darle un
  nombre al clima. Si hay comandos sin probar o marcados como fallidos, el sistema DEBE mostrarle un
  resumen y pedir su confirmación antes de guardar.
- **FR-013**: Al guardar, el sistema DEBE crear una entidad climate lista para usar sin reiniciar Home
  Assistant.
- **FR-014**: La entidad DEBE ofrecer los modos, temperaturas y velocidades de ventilador del código
  guardado, y su oscilación si la tiene. Los modos que Home Assistant no reconoce se ignoran, tanto en
  la entidad como en la pantalla de prueba.
- **FR-015**: La entidad DEBE recordar el último estado enviado, también tras reiniciar Home
  Assistant.
- **FR-016**: Los climas guardados DEBEN conservarse tras reiniciar Home Assistant.
- **FR-017**: El sistema DEBE permitir varios climas, incluso con el mismo emisor IR.
- **FR-025**: La persona DEBE poder asociar a un clima, de forma opcional, un sensor de temperatura y
  uno de humedad, y la entidad DEBE mostrar sus valores actuales.

**Cambio y borrado**

- **FR-018**: La persona DEBE poder cambiar el nombre, el emisor IR, el código y los sensores de un
  clima existente sin reiniciar Home Assistant.
- **FR-019**: Cambiar un clima DEBE conservar la identidad de su entidad, de modo que automatizaciones
  y paneles sigan funcionando.
- **FR-020**: Salir de la pantalla de prueba sin guardar NO DEBE alterar el clima existente.
- **FR-021**: La persona DEBE poder borrar un clima, y su entidad DEBE desaparecer sin reiniciar Home
  Assistant.

**Reglas generales**

- **FR-022**: Ninguna operación de esta feature DEBE requerir editar archivos ni reiniciar Home
  Assistant.
- **FR-023**: El sistema NO DEBE incluir aprendizaje de códigos desde un control remoto ni el control
  de televisores o ventiladores.
- **FR-024**: El panel DEBE listar los climas configurados y dar acceso a agregarlos, probarlos,
  cambiarlos y borrarlos.
- **FR-027**: Si la entidad del emisor está apagada, el sistema NO DEBE dar el comando por enviado y
  DEBE mostrar un error que indique cómo resolverlo.
- **FR-028**: La persona DEBE poder activar el panel agregando la integración una sola vez desde
  Dispositivos y servicios, sin reiniciar Home Assistant.

### Entidades clave

- **Clima**: un aire acondicionado configurado por la persona. Tiene un nombre, un emisor IR, una
  marca, un código guardado y, de forma opcional, sensores de temperatura y humedad. Le corresponde
  una entidad climate.
- **Emisor IR**: el dispositivo de Home Assistant que transmite infrarrojo. Un emisor puede servir a
  varios climas.
- **Marca**: fabricante del aire. Agrupa los códigos candidatos.
- **Código**: conjunto de comandos IR para un modelo o familia de aires de una marca, identificado
  por su número de código en SmartIR. Define qué modos, temperaturas y velocidades de ventilador
  están disponibles.
- **Comando**: orden individual dentro de un código: encender, apagar o enviar una combinación
  completa de modo, ventilador, temperatura y, si el código la tiene, oscilación.
- **Sesión de prueba**: recorrido temporal por los códigos de una marca. Conoce el código actual y
  las respuestas indicadas por la persona, y no se conserva salvo que se guarde un código.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Una persona agrega un aire y lo deja funcionando con 0 archivos editados y 0 reinicios
  de Home Assistant.
- **SC-002**: La entidad climate está disponible en menos de 10 segundos después de guardar el código.
- **SC-003**: Descartar un código y enviar un comando con el siguiente toma como máximo 2 acciones de
  la persona.
- **SC-004**: Una persona completa el alta de un aire, cuya marca tiene 10 códigos candidatos, en
  menos de 10 minutos.
- **SC-005**: Cambiar o borrar un clima requiere 0 reinicios de Home Assistant y tiene efecto en menos
  de 10 segundos.
- **SC-006**: El 100 % de los climas guardados sigue funcionando después de un reinicio de Home
  Assistant.
- **SC-007**: El 100 % de las automatizaciones que usan un clima sigue funcionando después de cambiarle
  el emisor o el código.

## Supuestos

- **Usuarios**: quienes configuran climas tienen permisos de administración en Home Assistant y ya
  tienen su emisor IR funcionando allí.
- **Catálogo de códigos**: la base de datos de SmartIR tiene licencia MIT, que permite incluirla si se
  conserva el aviso de copyright y de licencia. Se actualiza al publicar una versión nueva de la
  integración.
- **Emisores admitidos**: esta versión solo admite emisores Broadlink. Los códigos de SmartIR para
  otros emisores no se ofrecen y quedan para versiones futuras.
- **Panel**: solo lo ven quienes tienen permisos de administración, y los climas también aparecen en
  Home Assistant como cualquier otra integración.
- **Sensores**: los sensores de temperatura y humedad son opcionales y solo informan; no cambian el
  envío de comandos. El sensor de encendido queda fuera de esta versión.
- **Sin retorno**: el infrarrojo es unidireccional, de modo que el estado de la entidad refleja el
  último comando enviado, no el estado real del aire.
- **Instalación**: instalar o actualizar la integración por HACS puede pedir un reinicio de Home
  Assistant. Después hay que agregarla una vez desde Dispositivos y servicios para activar el panel. El
  criterio de 0 reinicios se aplica a la configuración de climas, no a esa instalación.
- **Idiomas**: la interfaz estará disponible al menos en español e inglés.
- **Fuera de alcance**: aprender códigos desde un control remoto, controlar televisores o ventiladores,
  y migrar configuraciones existentes de SmartIR.
