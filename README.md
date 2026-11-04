# BetterSmartIR

Integración de Home Assistant para controlar aires acondicionados por infrarrojo. Los agregas desde un
panel, pruebas los códigos con botones hasta dar con el de tu aire y obtienes una entidad `climate`, sin
editar YAML ni reiniciar Home Assistant.

## Requisitos

- Home Assistant 2026.10 o superior.
- Un emisor Broadlink ya configurado en Home Assistant.
- Permisos de administración para usar el panel.

## Instalación

1. En HACS, abre el menú de los tres puntos y elige **Repositorios personalizados**.
2. Agrega `https://github.com/agust2001/BetterSmartIR` con el tipo **Integración**.
3. Descarga **BetterSmartIR** y reinicia Home Assistant. Este reinicio solo hace falta al instalar.
4. Ve a **Ajustes > Dispositivos y servicios > Agregar integración** y elige **BetterSmartIR**.

Aparecerá **BetterSmartIR** en la barra lateral. A partir de aquí, nada requiere reiniciar.

## Uso

### Agregar un aire

1. En el panel, elige **Agregar clima**.
2. Selecciona el emisor y la marca, y pulsa **Empezar a probar**.
3. Usa el control de clima de Home Assistant. Elige un modo para encender: cada cambio envía el comando real
   al aire. Con el control apagado, los cambios no envían nada, igual que en un clima real.
4. Si el aire no responde, pasa al **Siguiente código**.
5. Cuando encuentres el código correcto, pulsa **Guardar este código** y ponle un nombre.

La entidad `climate` queda disponible al momento. Antes de guardar verás qué comandos fallaron o quedaron
sin probar.

### Cambiar un clima

Con **Cambiar** puedes modificar el nombre, el emisor, el código y los sensores. La entidad conserva su
identificador, así que tus automatizaciones y paneles siguen funcionando. Si sales de la pantalla de
prueba sin guardar, el clima no cambia.

Los sensores son opcionales y solo informan: la entidad muestra su temperatura y su humedad, y sigue
funcionando si dejan de estar disponibles.

### Borrar un clima

Con **Borrar** se eliminan el clima, su entidad y su dispositivo, después de pedir confirmación.

## Limitaciones

- Solo admite emisores Broadlink.
- Solo controla aires acondicionados, no televisores ni ventiladores.
- No aprende códigos desde un control remoto. Si tu marca no está en el catálogo, no se puede crear el
  clima.
- El infrarrojo no informa si el aire recibió el comando. La entidad muestra el último estado enviado, que
  puede diferir del real si usas el control remoto original.
- Si la entidad `remote` del Broadlink está apagada, los comandos fallan con un aviso. Enciéndela para
  enviar.
- La pantalla de prueba usa la tarjeta de termostato de Home Assistant sin crear ninguna entidad, y para eso
  depende de partes internas de su interfaz. Si una actualización las cambia, verás un aviso en esa pantalla
  hasta que se publique una versión compatible. Los climas ya guardados no se ven afectados.
- La lista de sensores solo incluye los que tienen la clase `temperature` o `humidity`.

## Códigos

El catálogo incluye 333 códigos Broadlink de 125 marcas. Proviene de
[SmartIR](https://github.com/smartHomeHub/SmartIR), de sus autores y colaboradores, bajo licencia MIT. La
licencia original está en
[`LICENSE.SmartIR`](custom_components/better_smartir/catalog_data/LICENSE.SmartIR), y el commit de origen
en [`SOURCE.json`](custom_components/better_smartir/catalog_data/SOURCE.json). BetterSmartIR es un
proyecto independiente de SmartIR.

## Iconos

Los iconos del panel son de [Material Design Icons](https://pictogrammers.com/library/mdi/), bajo licencia
Apache-2.0.

## Desarrollo

Tests de Python, que necesitan Docker:

```bash
docker build -f Dockerfile.test -t better-smartir-test .
```

```bash
docker run --rm better-smartir-test
```

Tests del panel, que necesitan Node 22 o superior:

```bash
node --test "tests/frontend/*.test.js"
```

Para ver el panel sin Home Assistant, ejecuta `python -m http.server 8765` en la raíz del repositorio y
abre `http://localhost:8765/tests/frontend/harness.html`.

La especificación y las decisiones de diseño están en [`specs`](specs).

## Licencia

[MIT](LICENSE)
