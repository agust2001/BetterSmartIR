# Constitución de BetterSmartIR

## Principios Fundamentales

### I. Integración custom instalable por HACS

BetterSmartIR es una integración custom de Home Assistant y DEBE poder instalarse y actualizarse
por HACS. Ningún cambio PUEDE romper los requisitos de HACS ni exigir pasos de instalación
manuales fuera de lo que HACS ya hace.

**Razón**: HACS es el canal de distribución que usa el público objetivo.

### II. Configuración exclusiva desde la UI

Toda la configuración DEBE hacerse desde la interfaz de Home Assistant. La integración NO DEBE
leer ni requerir ninguna configuración en `configuration.yaml`, ni pedir al usuario que edite
archivos.

**Razón**: el proyecto existe para eliminar la edición manual de YAML.

### III. Sin reinicios por cambios de configuración

Ningún cambio de configuración DEBE requerir reiniciar Home Assistant. Agregar, modificar o
borrar configuración DEBE tener efecto en el momento.

Instalar o actualizar la propia integración no es un cambio de configuración: el reinicio que
Home Assistant pueda pedir en ese caso queda fuera de este principio.

**Razón**: reiniciar en cada intento es exactamente el problema que el proyecto resuelve.

### IV. Código con tests

Todo cambio de comportamiento DEBE incluir tests automatizados que lo cubran, y todos los tests
DEBEN pasar antes de dar un cambio por terminado.

**Razón**: una integración que controla equipos físicos no puede validarse solo a mano, porque
cada prueba manual necesita el hardware.

### V. Conformidad con las guías de Home Assistant

El código DEBE seguir las guías oficiales de desarrollo de integraciones de Home Assistant. Si
una guía entra en conflicto con otro requisito, la desviación DEBE documentarse y justificarse
en el plan de la feature.

**Razón**: seguir las guías mantiene la integración compatible con las versiones futuras de
Home Assistant.

## Restricciones de la plataforma

- Las restricciones de los principios I, II y III aplican a toda feature, sin excepciones.
- Una feature que no pueda cumplirlas DEBE rediseñarse o quedar fuera de alcance; no se admiten
  alternativas por YAML ni pasos que requieran reinicio.

## Flujo de desarrollo

- El proyecto sigue Spec-Driven Development: especificación, aclaración, plan, tareas e
  implementación, en ese orden.
- No se avanza al plan, las tareas o el código hasta que el responsable del proyecto revise la
  especificación y lo pida.
- Los documentos del proyecto se escriben en español.
- Cada plan DEBE verificar su cumplimiento de esta constitución antes de pasar a tareas.

## Gobernanza

Esta constitución prevalece sobre cualquier otra práctica del proyecto.

- **Enmiendas**: toda enmienda DEBE documentarse en este archivo, con su motivo y la aprobación
  del responsable del proyecto.
- **Versionado**: sigue versionado semántico. MAJOR para eliminar o redefinir principios de forma
  incompatible; MINOR para añadir principios o ampliar guías de forma material; PATCH para
  aclaraciones y correcciones de redacción.
- **Cumplimiento**: cada plan y cada revisión de cambios DEBEN comprobar el cumplimiento de estos
  principios.

**Versión**: 1.0.0 | **Ratificada**: 2026-11-03 | **Última enmienda**: 2026-11-03
