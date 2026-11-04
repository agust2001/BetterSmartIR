# Guía de validación: Rediseño visual del panel

Esta guía comprueba que el panel se ve como especifica el [contrato](contracts/panel-ui.md) y que hace lo
mismo que antes.

## Requisitos

- Docker Desktop, para los tests de Python.
- Node 22 o superior, para los tests del panel.
- Python, para servir la página de prueba.
- Para la última parte: Home Assistant 2026.10 o superior, un Broadlink y un aire.

## Tests automáticos

```bash
node --test "tests/frontend/*.test.js"
```

```bash
docker run --rm better-smartir-test
```

**Resultado esperado**: todos los tests pasan, y los tests anteriores no cambiaron lo que comprueban.

## Página de prueba

Desde la raíz del repositorio:

```bash
python -m http.server 8765
```

Abrir `http://localhost:8765/tests/frontend/harness.html`. No envía nada a ningún aire.

### Escenario 1: acción principal

1. Recorrer todas las pantallas y estados de la tabla de FR-005.
2. **Esperado**: en cada uno hay exactamente una acción principal, y es la de la tabla.

### Escenario 2: envío

1. Enviar un comando que funcione y otro que falle.
2. **Esperado**: "enviando" aparece al instante, cada resultado tiene icono y texto, y los controles no
   se mueven.

### Escenario 3: temas y anchos

1. Repetir el recorrido en modo claro y oscuro, a 320, 375, 768 y 1920 píxeles de ancho.
2. **Esperado**: todo se lee bien y no hay desplazamiento horizontal.

### Escenario 4: teclado

1. Recorrer un alta completa usando solo el teclado.
2. **Esperado**: siempre se ve el foco, el orden es lógico y el foco no se pierde al enviar.

### Escenario 5: reducir animaciones

1. Activar la preferencia de reducir animaciones.
2. Enviar un comando.
3. **Esperado**: no hay movimiento y se ven los mismos estados.

### Escenario 6: nombres largos y sin internet

1. Usar en la página de prueba el clima con nombre y modelo largos.
2. Desconectar la red y recargar con la página ya servida en el equipo.
3. **Esperado**: las tarjetas no se rompen y todos los iconos se ven.

## Home Assistant real

1. Instalar la versión nueva y recargar el navegador.
2. Repetir los escenarios de
   [`quickstart.md` de la feature 001](../001-climas-ir-prueba-grafica/quickstart.md).
3. **Esperado**: los resultados son iguales a los de antes del rediseño.
4. Cambiar de tema en el perfil, entre claro, oscuro y uno personalizado si lo hay.
5. **Esperado**: el panel sigue al tema sin recargar.
