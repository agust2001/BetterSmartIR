# Guía de validación: Control de clima estándar en la prueba

Esta guía comprueba el [contrato](contracts/panel-control.md) y que el flujo sigue igual.

## Requisitos

- Docker Desktop y Node 22 o superior.
- Home Assistant 2026.10 o superior, un Broadlink y un aire.

## Tests automáticos

```bash
node --test "tests/frontend/*.test.js"
```

```bash
docker run --rm better-smartir-test
```

**Resultado esperado**: todos los tests pasan, incluidos los escenarios comunes de `climate_parity.json`.

## Home Assistant real

El aspecto del control solo se puede validar aquí. Estos escenarios envían comandos reales al aire.

### Escenario 1: control real

1. Abrir la pantalla de prueba con un código.
2. **Esperado**: se ve el control de Home Assistant, sin botones propios de encendido, modo, temperatura ni
   ventilador, y sigue el tema y el idioma.

### Escenario 2: comandos

1. Elegir un modo. **Esperado**: el aire enciende y aparece "enviado".
2. Cambiar temperatura y ventilador. **Esperado**: el aire responde a cada cambio.
3. Elegir apagado. **Esperado**: el aire apaga.
4. Con el control apagado, cambiar la temperatura. **Esperado**: no se envía nada.

### Escenario 3: opciones

1. Recorrer 10 códigos, con y sin oscilación.
2. **Esperado**: solo aparecen las opciones de cada código, y no hay selector de oscilación si no la tiene.

### Escenario 4: errores

1. Apagar el emisor y elegir un modo.
2. **Esperado**: aparece el error y el control vuelve a apagado.
3. Elegir una combinación que el código no tenga.
4. **Esperado**: aparece el error y el control conserva el estado anterior.

### Escenario 5: sin rastro

1. Probar 5 códigos y cancelar.
2. **Esperado**: en Entidades, Historial, Registro de actividad y el selector de entidades de un dashboard no
   hay nada de la prueba.
3. Empezar otra prueba y cerrar el navegador.
4. **Esperado**: tampoco queda nada.

### Escenario 6: coherencia

1. Guardar un código y abrir su clima.
2. **Esperado**: ofrece las mismas opciones que la prueba y responde igual.

### Escenario 7: flujo

1. Repetir [`quickstart.md` de la feature 001](../001-climas-ir-prueba-grafica/quickstart.md).
2. **Esperado**: los resultados son iguales, salvo que no hay botón Encender.

### Escenario 8: control no disponible

1. Simular en el navegador que falta `loadCardHelpers` y abrir la prueba.
2. **Esperado**: aparece un mensaje comprensible, y se puede pasar de código o cancelar.
