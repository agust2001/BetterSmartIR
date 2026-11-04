# Guía de validación: Climas IR con prueba gráfica

Esta guía comprueba que la feature funciona de punta a punta. Ver [contrato](contracts/websocket-api.md) y
[modelo de datos](data-model.md).

## Requisitos

- Docker Desktop en marcha, para los tests de Python.
- Node 22 o superior, para los tests del panel.
- Para la validación manual: Home Assistant 2026.10 o superior, un Broadlink ya configurado en Home
  Assistant y un aire acondicionado.

## Tests automáticos

Tests de Python:

```bash
docker build -f Dockerfile.test -t better-smartir-test .
```

```bash
docker run --rm better-smartir-test
```

Tests del panel:

```bash
node --test "tests/frontend/*.test.js"
```

**Resultado esperado**: todos los tests pasan.

## Validar el catálogo

```bash
docker run --rm better-smartir-test pytest tests/test_catalog_data.py
```

**Resultado esperado**: el catálogo tiene 333 códigos, ninguno vacío, y coincide con el commit de
SmartIR fijado. Incluye su licencia MIT.

## Validación manual

Instalación, una sola vez:

1. Instalar la integración por HACS y reiniciar si HACS lo pide.
2. Ir a Dispositivos y servicios, y agregar BetterSmartIR.
3. **Esperado**: aparece BetterSmartIR en la barra lateral, sin otro reinicio.

A partir de aquí anotar la hora de inicio de Home Assistant: no debe cambiar en ningún escenario.

### Escenario 1: agregar un aire (Historia 1)

1. Abrir el panel y elegir agregar un clima.
2. Elegir el emisor y la marca del aire.
3. Enviar Encender. **Esperado**: la pantalla indica "enviado" y muestra "código 1 de N".
4. Indicar que no respondió y pasar al siguiente código hasta que el aire responda.
5. Probar modo, temperatura y ventilador, y marcar cada resultado.
6. Guardar con un nombre, dejando un comando sin probar.
7. **Esperado**: aparece un resumen antes de confirmar.
8. Confirmar. **Esperado**: la entidad está disponible en menos de 10 segundos y controla el aire.

### Escenario 2: envío que no puede salir

1. Apagar la entidad `remote` del Broadlink.
2. Enviar un comando desde la pantalla de prueba.
3. **Esperado**: la pantalla muestra un error, no "enviado", y conserva la posición en la lista.

### Escenario 3: prueba abandonada

1. Iniciar un alta y cerrar el panel sin guardar.
2. **Esperado**: no hay ninguna entidad nueva.

### Escenario 4: cambiar un clima (Historia 2)

1. Crear una automatización que use el clima.
2. En el panel, cambiar su nombre y su código.
3. Asociarle un sensor de temperatura.
4. **Esperado**: la automatización sigue funcionando y la entidad muestra la temperatura.
5. Volver a la pantalla de prueba y salir sin guardar.
6. **Esperado**: el clima conserva su código.

### Escenario 5: borrar un clima (Historia 3)

1. Borrar un clima cuando hay al menos otro configurado.
2. **Esperado**: su entidad desaparece y el otro clima sigue funcionando.

### Escenario 6: reinicio

1. Reiniciar Home Assistant.
2. **Esperado**: los climas siguen disponibles y conservan su último estado.

### Comprobación final

**Esperado**: la hora de inicio de Home Assistant no cambió entre los escenarios 1 y 5, y no se editó
ningún archivo.
