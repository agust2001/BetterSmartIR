# Plan de implementación: Rediseño visual del panel

**Rama**: Sin rama propia todavía | **Fecha**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Entrada**: Especificación de la feature en `specs/002-rediseno-panel/spec.md`

## Resumen

Rediseñar el panel sin cambiar su comportamiento. El trabajo está casi todo en la presentación:
estilos propios sobre las variables del tema de Home Assistant, iconos incluidos en la integración y una
pantalla de prueba reorganizada alrededor del modo y la temperatura.

La única lógica nueva es decidir cuál es la acción principal de la pantalla de prueba, que se resuelve
con una función pura y con tests. La API WebSocket, los datos guardados y el backend de Python no
cambian.

## Contexto técnico

**Lenguaje/Versión**: JavaScript en módulos ES, sin compilación, igual que el panel actual.

**Dependencias principales**: Ninguna en ejecución. Los trazados de los iconos se copian de
[Material Design Icons](https://pictogrammers.com/library/mdi/) (`@mdi/js` 7.4.47, Apache-2.0).

**Almacenamiento**: No aplica. No cambia ningún dato guardado.

**Testing**: `node --test` para la lógica y el contraste. Los tests de Python existentes no cambian. La
parte visual se comprueba con una página de prueba y con Home Assistant real.

**Plataforma**: Navegadores que admite Home Assistant 2026.10, en celular y computadora.

**Tipo de proyecto**: Panel de una integración de Home Assistant.

**Objetivos de rendimiento**: "Enviando" en menos de 100 ms y animaciones de 400 ms como máximo.

**Restricciones**: Funcionar sin internet, sin librerías externas, y con el tema de la persona.

**Escala/Alcance**: 7 vistas y 3 archivos existentes del panel, más 2 archivos nuevos.

## Verificación de la constitución

*Puerta: revisada antes de la investigación y de nuevo tras el diseño.*

| Principio | Cómo se cumple | Antes | Tras el diseño |
|---|---|---|---|
| I. Instalable por HACS | Todos los archivos nuevos están dentro de la integración, y no hay pasos de compilación | Cumple | Cumple |
| II. Configuración desde la UI | No cambia ninguna forma de configurar | Cumple | Cumple |
| III. Sin reinicios | No cambia el flujo. Actualizar la integración no es un cambio de configuración | Cumple | Cumple |
| IV. Código con tests | La lógica nueva y el contraste tienen tests, y los tests existentes no cambian lo que comprueban | Cumple | Cumple |
| V. Guías de Home Assistant | Usa las variables de tema, sin depender de elementos internos del frontend | Cumple | Cumple |

**Revisión tras implementar (T028)**: los cinco principios se siguen cumpliendo. Todo quedó dentro de la
integración, sin pasos de compilación, y los tests anteriores no cambiaron.

**Resultado**: la puerta se supera, sin desviaciones.

## Hallazgos incorporados a la spec

- **Después de un "no funcionó"**: la tabla de FR-005 no cubría ese estado. La acción principal pasa a
  ser el siguiente código.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/002-rediseno-panel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── panel-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Código fuente (raíz del repositorio)

```text
custom_components/better_smartir/
├── manifest.json                    # Sube a la versión 0.2.0
└── frontend/
    ├── better-smartir-panel.js      # Vistas y foco
    ├── styles.js                    # Nuevo: estilos y proporciones de color
    ├── icons.js                     # Nuevo: iconos y su asociación con los modos
    ├── session.js                   # Agrega primaryAction
    └── i18n.js                      # Textos de los botones de resultado

tests/frontend/
├── session.test.js                  # Tests de primaryAction
├── contrast.test.js                 # Nuevo: contraste con los temas predeterminados
└── harness.html                     # Nuevo: panel con Home Assistant simulado

README.md                            # Atribución de los iconos
```

**Decisión de estructura**: se separan los estilos y los iconos porque el rediseño los hace crecer mucho,
y `better-smartir-panel.js` sigue siendo el único archivo que conoce el DOM.

## Orden de construcción

1. Lógica de acción principal y test de contraste, con sus tests primero.
2. Estilos, iconos y página de prueba.
3. Pantalla de prueba y respuesta al enviar.
4. Foco y teclado.
5. Resto de las pantallas.
6. Validación con `quickstart.md`, en la página de prueba y en Home Assistant real.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un cambio visual rompe una acción sin que fallen los tests | Mantener los `data-action` actuales y repetir los escenarios de la feature 001 (SC-009) |
| Volver a dibujar la pantalla reinicia animaciones o pierde el foco | Animar solo lo que cambia y recordar el foco entre dibujos (R5, R6) |
| Un tema personalizado da poco contraste | El texto usa los colores del tema; el color del modo solo acompaña (R3) |
| Home Assistant cambia sus variables de tema | Todas las variables llevan un valor de respaldo |
| El navegador conserva archivos anteriores | Subir la versión de `manifest.json`, que forma parte de la URL del panel |
| La pantalla de prueba queda demasiado larga en celular | El modo y la temperatura van primero y las opciones se acomodan en varias líneas |

## Seguimiento de complejidad

Sin desviaciones que justificar.
