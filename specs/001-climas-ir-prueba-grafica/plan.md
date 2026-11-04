# Plan de implementación: Climas IR con prueba gráfica

**Rama**: No aplica (el proyecto todavía no es un repositorio git) | **Fecha**: 2026-11-03 |
**Spec**: [spec.md](spec.md)

**Entrada**: Especificación de la feature en `specs/001-climas-ir-prueba-grafica/spec.md`

## Resumen

BetterSmartIR es una integración custom de Home Assistant para agregar aires acondicionados por
infrarrojo desde un panel propio, probando sus códigos de forma gráfica y sin reiniciar.

El enfoque técnico es este:

- **Catálogo**: los códigos Broadlink de SmartIR, comprimidos e incluidos en la integración.
- **Climas**: una entrada de configuración única, con una subentrada por clima. Al cambiar una
  subentrada, la entrada se recarga y las entidades se actualizan sin reiniciar.
- **Panel**: un Web Component sin compilación que habla con la integración por WebSocket.
- **Prueba**: la sesión vive en el navegador. Cada botón envía la combinación completa de modo,
  ventilador, oscilación y temperatura, exactamente como lo hará la entidad.
- **Envío**: `remote.send_command` con el paquete Base64 de SmartIR sin alterar.

## Contexto técnico

**Lenguaje/Versión**: Python 3.14 para la integración; JavaScript (ES modules) para el panel

**Dependencias principales**: Home Assistant 2026.10 o superior, con sus integraciones `http`,
`frontend`, `panel_custom`, `websocket_api`, `remote` y `broadlink`. Sin paquetes externos en tiempo de
ejecución

**Almacenamiento**: subentradas de configuración de Home Assistant para los climas, `RestoreEntity`
para el último estado, y archivos de solo lectura para el catálogo

**Pruebas**: `pytest` con `pytest-homeassistant-custom-component`, dentro de Docker; `node --test` para
la lógica del panel; `hassfest` y la validación de HACS en GitHub Actions

**Plataforma objetivo**: Home Assistant en cualquier instalación compatible con HACS

**Tipo de proyecto**: integración custom de Home Assistant con panel web

**Objetivos de rendimiento**: entidad disponible en menos de 10 s tras guardar (SC-002); cambios y
borrados con efecto en menos de 10 s (SC-005)

**Restricciones**: funciona sin internet; sin YAML; sin reinicios por configuración; comandos IR sin
alterar; nada de lectura de archivos en el bucle de eventos

**Escala/Alcance**: 333 códigos, 125 marcas, unos 5,2 MB de catálogo y pocos climas por instalación

## Verificación de la constitución

*Puerta: revisada antes de la investigación y de nuevo tras el diseño.*

| Principio | Cómo se cumple | Antes | Tras el diseño |
|---|---|---|---|
| I. Instalable por HACS | Una integración en `custom_components/`, con `hacs.json`, marca y `manifest.json` completo (R12) | Cumple | Cumple |
| II. Configuración desde la UI | Panel y flujo de alta; `CONFIG_SCHEMA` de solo entradas de configuración | Cumple | Cumple |
| III. Sin reinicios | Recarga de la entrada al cambiar subentradas (R4) | Cumple | Cumple |
| IV. Código con tests | Tests de Python, del panel y del catálogo (R11) | Cumple | Cumple |
| V. Guías de Home Assistant | Flujo de configuración, `probatio`, lectura de archivos en hilo aparte, traducciones | Cumple | Cumple, con una desviación justificada abajo |

**Revisión tras implementar (T051)**: los cinco principios se siguen cumpliendo. La marca quedó en
`custom_components/better_smartir/brand/`. No se usa `runtime_data` porque la entrada no guarda estado
propio: cada entidad toma lo que necesita de su subentrada.

**Resultado**: la puerta se supera. Instalar la integración y agregarla una vez desde Dispositivos y
servicios no es un cambio de configuración de climas, conforme al principio III.

## Hallazgos incorporados a la spec

La investigación encontró cuatro puntos que la spec no mencionaba, y ya están incorporados en ella:

1. **Oscilación** (FR-005, FR-014): 37 códigos necesitan un valor de oscilación para formar el comando.
2. **Modos no reconocidos** (FR-014): 34 códigos tienen modos que Home Assistant no reconoce, como `ai`
   o `fan`. Se ignoran, igual que en SmartIR.
3. **Paso único de activación** (FR-028): hay que agregar la integración una vez para que aparezca el
   panel.
4. **Emisor apagado** (FR-027): si la entidad `remote` del Broadlink está apagada, el envío se rechaza
   con un error propio, porque Broadlink lo cancelaría sin avisar.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/001-climas-ir-prueba-grafica/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas y sus fuentes
├── data-model.md        # Datos persistentes, catálogo y sesión de prueba
├── quickstart.md        # Guía de validación
├── contracts/
│   └── websocket-api.md # Contrato entre el panel y la integración
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks; todavía no existe
```

### Código fuente (raíz del repositorio)

```text
custom_components/better_smartir/
├── __init__.py            # Configuración, recarga y registro del panel
├── manifest.json
├── config_flow.py         # Alta única del contenedor
├── const.py
├── catalog.py             # Lectura del índice y de los códigos
├── commands.py            # De combinación a secuencia de comandos IR
├── emitter.py             # Lista de emisores y envío; único módulo que conoce Broadlink
├── climate.py             # Entidad climate
├── websocket_api.py       # Comandos del contrato
├── strings.json
├── translations/
│   ├── en.json
│   └── es.json
├── catalog_data/
│   ├── index.json
│   ├── SOURCE.json        # Commit de SmartIR de origen
│   ├── LICENSE.SmartIR
│   └── codes/             # <code>.json.gz
└── frontend/
    ├── better-smartir-panel.js  # Web Component y vistas
    ├── session.js               # Lógica de la sesión de prueba, sin DOM
    └── i18n.js                  # Textos en español e inglés

brand/                     # Recursos de marca para HACS
scripts/
└── build_catalog.py       # Genera catalog_data desde SmartIR

tests/
├── conftest.py
├── test_catalog.py
├── test_catalog_data.py
├── test_climate.py
├── test_commands.py
├── test_config_flow.py
├── test_emitter.py
├── test_init.py
├── test_websocket_api.py
└── frontend/
    └── session.test.js

.github/workflows/validate.yml  # Tests, hassfest y HACS
Dockerfile.test
requirements_test.txt
hacs.json
README.md
LICENSE
```

**Decisión de estructura**: se usa la estructura que exige HACS, con una sola integración dentro de
`custom_components/`. Todo lo que debe llegar a la instalación, panel y catálogo incluidos, vive dentro
de `custom_components/better_smartir/`.

## Orden de construcción

1. **Base del proyecto**: estructura, `manifest.json`, entorno de tests en Docker y CI.
2. **Catálogo**: script generador, datos y módulo de lectura.
3. **Núcleo**: resolución de comandos y envío por el emisor.
4. **Entidad y ciclo de vida**: contenedor, subentradas, entidad `climate` y recarga.
5. **API**: comandos WebSocket.
6. **Panel, Historia 1**: alta y prueba gráfica. Aquí ya se cumple el criterio de éxito principal.
7. **Panel, Historias 2 y 3**: cambio y borrado de climas.
8. **Publicación**: README, marca, atribución de SmartIR y validación con hardware real.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Docker no arranca en este equipo | GitHub Actions ejecuta los mismos tests |
| Las subentradas sin tipo declarado se muestran raro en Dispositivos y servicios | Revisarlo en una instancia real durante el paso 4; si hace falta, declarar el tipo |
| La recarga interrumpe automatizaciones que actúan en ese instante | Medir su duración durante el paso 4. Si resulta molesta, pasar a actualizaciones por entidad |
| El panel depende de APIs internas del frontend de Home Assistant | Usar solo la propiedad `hass` del panel y elementos HTML propios |
| La validación real exige hardware | Los tests simulan el emisor; el escenario manual de `quickstart.md` queda como paso final |

## Seguimiento de complejidad

| Desviación | Por qué hace falta | Alternativa más simple descartada porque |
|---|---|---|
| Las subentradas se crean desde comandos WebSocket, no con un `ConfigSubentryFlow` | La pantalla de prueba necesita botones que envíen al instante, y un flujo solo ofrece formularios paso a paso | Un flujo de subentrada no puede mostrar el panel ni dar la experiencia elegida en clarify |
