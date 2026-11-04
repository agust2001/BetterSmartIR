# Investigación: Climas IR con prueba gráfica

**Fecha**: 2026-11-03

Los datos de esta investigación se verificaron contra estas fuentes:

- Home Assistant Core, etiqueta `2026.10.4` (última versión estable), y rama `dev` (`2026.12.0.dev0`).
- SmartIR, commit `e4df2957ad915536f41ffb39daa96886d7cfe040` (2025-07-21).
- Documentación de publicación de HACS, rama `main`.

## R1. Versión objetivo y lenguaje

- **Decisión**: Python 3.14 y Home Assistant 2026.10.0 como versión mínima.
- **Razón**: Home Assistant 2026.10.4 declara `requires-python >= 3.14.2`. Apuntar a la versión estable
  actual evita mantener compatibilidad con versiones que no se van a probar.
- **Alternativas**: admitir versiones anteriores. Se descartó porque obliga a probar contra varias
  versiones sin que la feature lo necesite.
- **Nota**: Home Assistant 2026.10 usa `probatio` en lugar de `voluptuous`. El proyecto DEBE validar
  esquemas con `probatio`.

## R2. Cómo se envían los comandos IR

- **Decisión**: usar el servicio `remote.send_command` de la entidad `remote` de Broadlink, con el
  prefijo `b64:`, igual que SmartIR.
- **Razón**: SmartIR guarda paquetes Broadlink en Base64, y este servicio los envía tal cual. Así se
  cumple FR-026 (comandos sin alterar).
- **Alternativas**: la plataforma `infrared` de Home Assistant, que Broadlink implementa. Recibe
  tiempos de pulso, no paquetes, así que habría que decodificar y volver a codificar cada comando.
  Se descartó para esta versión. Es la vía natural para admitir otros emisores más adelante
  (ESPHome, MQTT y ZHA también la implementan), por lo que el envío queda aislado en un solo módulo.

**Riesgo detectado**: si la entidad `remote` está apagada, Broadlink cancela el envío y solo escribe
una advertencia en el log, sin devolver error. El sistema DEBE comprobar que el estado sea `on` antes
de enviar. De lo contrario la pantalla mostraría "enviado" sin que se haya emitido nada, y la persona
descartaría un código bueno.

## R3. Cómo se guardan los climas

- **Decisión**: una entrada de configuración única (`single_config_entry`) que actúa de contenedor, y
  una subentrada (`ConfigSubentry`) por clima.
- **Razón**: Home Assistant guarda y restaura las subentradas sin código propio, y los climas aparecen
  en Dispositivos y servicios. El identificador de la subentrada es estable, y sirve como `unique_id`
  de la entidad, lo que cumple FR-019.
- **Alternativas**:
  - Una entrada por clima: el panel no existiría hasta crear el primer clima, porque sin YAML no se
    ejecuta ningún código de la integración antes de la primera entrada.
  - Almacenamiento propio (`Store`): obliga a reimplementar persistencia y ciclo de vida.
- **Consecuencia**: la persona debe agregar la integración una vez desde Dispositivos y servicios
  para que aparezca el panel. Es un paso único, desde la interfaz y sin reinicio.

## R4. Cómo se aplican los cambios sin reiniciar

- **Decisión**: un `update_listener` recarga la entrada cuando cambian sus subentradas.
- **Razón**: `async_add_subentry`, `async_update_subentry` y `async_remove_subentry` disparan los
  listeners. Recargar es la solución más simple y cumple FR-013, FR-018 y FR-021.
- **Alternativas**: agregar y quitar entidades una a una. Evita la recarga, pero añade estado y casos
  de error sin una necesidad medible.
- **Consecuencia**: todos los climas quedan no disponibles durante la recarga, que debería ser breve.
  Su estado se recupera con `RestoreEntity`.
- **Detalle obligatorio**: el panel se registra una sola vez y solo se quita en `async_remove_entry`.
  Si se quitara al descargar la entrada, cada recarga expulsaría a la persona del panel.

## R5. Panel de la barra lateral

- **Decisión**: panel registrado con `panel_custom.async_register_panel`, con `require_admin`, y
  archivos servidos con `StaticPathConfig`. Se implementa como Web Component en JavaScript, sin paso de
  compilación ni dependencias externas.
- **Razón**: el catálogo funciona sin internet y el panel también debe hacerlo. Sin compilación, lo
  que está en el repositorio es exactamente lo que instala HACS.
- **Alternativas**: Lit con TypeScript. Da plantillas más cómodas, pero exige compilar y publicar el
  resultado, y el panel solo tiene tres vistas. Cargar librerías desde un CDN queda descartado porque
  rompe el funcionamiento sin internet.
- **Pruebas**: la lógica de la sesión de prueba va en un módulo sin dependencias del navegador, que se
  prueba con `node --test`, incluido en Node.

## R6. Comunicación del panel con la integración

- **Decisión**: comandos WebSocket propios, registrados con `websocket_api.async_register_command` en
  `async_setup` y restringidos a administradores.
- **Razón**: es el mecanismo estándar de los paneles de Home Assistant y ya incluye autenticación.
- **Alternativas**: vistas HTTP. Necesitan más código para el mismo resultado.

## R7. La sesión de prueba vive en el navegador

- **Decisión**: el servidor no guarda ninguna sesión de prueba. Cada envío incluye el emisor, el código
  y la combinación completa.
- **Razón**: abandonar la prueba no deja residuos por diseño, lo que cumple FR-011 y FR-020 sin lógica
  de limpieza. Tampoco se ve afectada por las recargas de R4.
- **Alternativas**: sesión en el servidor. Permitiría reanudar en otro dispositivo, pero nadie lo pidió.

## R8. Los comandos de SmartIR contienen el estado completo

- **Hallazgo**: un comando de SmartIR no es "subir temperatura", sino el estado entero:
  `commands[modo][ventilador][temperatura]`, o `commands[modo][ventilador][oscilación][temperatura]`
  si el código tiene oscilación.
- **Decisión**: la pantalla de prueba mantiene una combinación actual de modo, ventilador, oscilación
  y temperatura. Cada botón modifica un valor y envía la combinación completa, igual que la entidad.
- **Razón**: es la única forma de enviar esos comandos, y hace que la prueba sea fiel a lo que hará la
  entidad después.
- **Encendido**: si el código tiene comando `on` (12 códigos), se envía primero, se esperan 0,5
  segundos y luego se envía la combinación. Es el comportamiento y la demora por defecto de SmartIR.

## R9. Calidad de los datos de SmartIR

Resultado de analizar los 333 códigos Broadlink:

| Hallazgo | Códigos | Tratamiento |
|---|---|---|
| Todos usan Base64 | 333 | No hace falta convertir formatos |
| JSON inválido por una coma sobrante (`2680`, marca Apton) | 1 | El generador lo repara sin tocar los comandos |
| Declaran oscilación | 37 | La oscilación es parte de la combinación (R8) |
| Modos que Home Assistant no reconoce, como `ai`, `ifeel` o `fan` | 34 | Se ignoran esos modos, igual que SmartIR |
| Sin ningún modo reconocido | 0 | Ningún código queda inutilizable por esto |
| Combinaciones faltantes | 51 | Se calculan las disponibles y solo esas se ofrecen |
| Más de la mitad de combinaciones faltantes | 4 | Igual que el caso anterior |
| Comandos vacíos | 13 | Se tratan como combinaciones faltantes |

Reparar el `2680` solo requiere quitar un carácter. Salvo el total de 333, las cifras de la tabla salen
de 332 archivos, porque ese código no se pudo leer sin repararlo. El generador debe validarlas al
procesar los 333.

Sin distinguir mayúsculas ni espacios sobrantes, los 333 códigos corresponden a 125 marcas. El nombre
de la marca DEBE normalizarse así para que no aparezca duplicada en la lista.

## R10. Tamaño y formato del catálogo

- **Decisión**: un archivo `.json.gz` por código y un `index.json` con marcas, modelos y números. Solo
  se incluyen los códigos Broadlink.
- **Razón**: los códigos Broadlink ocupan 45 MB como JSON compacto, y unos 5,2 MB comprimidos uno a uno.
  Separarlos permite cargar solo el que se usa; el más grande pesa 2,2 MB sin comprimir.
- **Alternativas**: un único archivo comprimido, que obligaría a descomprimir todo para leer un código.
  Incluir los 357 códigos sin comprimir, que supondría unos 51 MB en cada instalación.
- **Lectura**: DEBE hacerse en un hilo aparte (`async_add_executor_job`), porque leer archivos dentro
  del bucle de eventos está prohibido por las guías de Home Assistant.
- **Generación**: un script fija el commit de SmartIR, genera el catálogo de forma reproducible e
  incluye la licencia MIT y un archivo con el origen.

## R11. Entorno de pruebas

- **Decisión**: ejecutar los tests de Python en un contenedor Docker con Python 3.14, usando
  `pytest-homeassistant-custom-component`, y repetirlos en GitHub Actions.
- **Razón**: este equipo tiene Python 3.10 y el plugin exige 3.14 o superior. Además, Home Assistant no
  apunta a Windows como entorno de ejecución. Docker Desktop ya está instalado, aunque el servicio no
  estaba en marcha al revisarlo.
- **Tests del panel**: `node --test` con el Node 22 ya instalado, sin paquetes adicionales.
- **Validación adicional**: `hassfest` y la acción de validación de HACS en GitHub Actions.

## R12. Requisitos de HACS

- **Decisión**: una sola integración en `custom_components/better_smartir/`, con `hacs.json` y
  `README.md` en la raíz, y una carpeta `brand/` con los recursos de marca.
- **Razón**: HACS exige una integración por repositorio, todos sus archivos dentro de su carpeta, y
  las claves `domain`, `documentation`, `issue_tracker`, `codeowners`, `name` y `version` en
  `manifest.json`. También exige recursos de marca.
- **Consecuencia**: `documentation` e `issue_tracker` necesitan un repositorio público en GitHub, que
  todavía no existe.
