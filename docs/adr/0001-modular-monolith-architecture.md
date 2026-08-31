# 0001. Arquitectura de Monolito Modular y Contexto de Hogar

* **Estado**: Aceptado
* **Fecha**: 2026-08-31
* **Contexto**: `myp-apps` (Suite de gestión interna para finanzas e inventario)

## Contexto y Declaración del Problema

Se requiere construir una suite de aplicaciones modulares (`finanzas`, `inventario`, etc.) para gestionar la convivencia y finanzas de una pareja que vive junta desde hace un mes. El sistema debe desplegarse eficientemente en una Raspberry Pi 5 mediante Docker y Nginx Proxy Manager, con una huella de memoria RAM reducida (< 300 MB), manteniendo código limpio, alta modularidad, desacoplamiento y soporte para interfaces móviles (PWA para carga rápida) y de escritorio (análisis profundo).

## Opciones Evaluadas

1. **Microservicios independientes en contenedores separados**: Alto overhead de memoria RAM y CPU en la Raspberry Pi 5.
2. **Monolito Modular con FastAPI y Schemas de PostgreSQL** *(Elegido)*: Un único proceso de backend eficiente, con dominios separados en código (`app/modules/*`) y en base de datos (`core`, `finanzas`, `inventario`), compartiendo el pool de DB.
3. **Monolito tradicional plano sin separación de dominios**: Alto acoplamiento a medida que crecen las funcionalidades.

## Decisión

Hemos decidido adoptar la **Opción 2: Monolito Modular con FastAPI, Frontend SPA unificado en React + Vite, y Schemas PostgreSQL**:

1. **Backend**: Aplicación única FastAPI en Python 3.12 con gestión de dependencias `uv`, `ruff` para linting y `pytest`. Los submódulos (`core`, `finanzas`, `inventario`) se estructuran con su propio `models.py`, `schemas.py`, `service.py` y `router.py`.
2. **Frontend**: Single Page Application (SPA) unificada con React + Vite + TailwindCSS, soporte PWA para móviles y diseño híbrido (acciones rápidas en móvil, analítica densa en escritorio).
3. **Persistencia**: Base de datos PostgreSQL única con schemas lógicos (`core`, `finanzas`, `inventario`) y migraciones Alembic.
4. **Dominio Core / Identidad**: Multi-usuario con concepto de `Household` (Hogar compartido). Soporte de login JWT con PIN de 4 dígitos para cambio ágil de perfiles (Pablo <-> Pareja) en dispositivos compartidos.
5. **Comunicación entre módulos**: Servicios directos en código (capa de servicios Python) con Foreign Keys hacia `core` para integridad referencial.
6. **Despliegue**: `docker-compose.yml` unificado con imágenes multi-stage ligeras (Alpine/Slim).

## Consecuencias

### Positivas
- Mínimo consumo de recursos en la Raspberry Pi 5 (< 280MB de RAM total para todo el stack).
- Integridad de datos garantizada a nivel de base de datos.
- Facilidad de desarrollo y depuración sin latencia de red inter-servicios.
- Experiencia de usuario fluida tanto en la calle (móvil) como en casa (desktop).

### Negativas / Mitigaciones
- Requiere disciplina para no crear dependencias circulares entre módulos; mitigado mediante la regla de que los submódulos solo dependen de `core` o se comunican mediante servicios bien definidos.
