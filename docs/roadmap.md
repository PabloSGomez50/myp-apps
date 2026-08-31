# 🗺️ Roadmap del Proyecto `myp-apps`

Estado actual de avance y guía de tareas para las próximas sesiones de desarrollo con Antigravity.

---

## ✅ Fase 1: Arquitectura y Scaffolding Base (COMPLETADO)
- [x] Diagramación de Monolito Modular con FastAPI y React/Vite SPA.
- [x] Configuración de `docker-compose.yml` optimizado (< 280MB RAM) con PostgreSQL 16 y Redis 7 Alpine.
- [x] Configuración de `uv` en backend y `pnpm` con Node 22 Alpine en frontend.
- [x] Registro de Decisiones de Arquitectura ([ADR 0001](docs/adr/0001-modular-monolith-architecture.md) y [ADR 0002](docs/adr/0002-finanzas-domain-design.md)).
- [x] Estructura de navegación híbrida (Sidebar Desktop, BottomNav Mobile, Navbar con switcher rápido de perfil).

---

## ✅ Fase 2: Backend Core & Finanzas (COMPLETADO)
- [x] Modelos relacionales PostgreSQL en esquema `core` (`User`, `Household`, `HouseholdMember`).
- [x] Autenticación JWT con hashing `bcrypt` y conmutación ágil por PIN de 4 dígitos.
- [x] Modelos relacionales PostgreSQL en esquema `finanzas` (`Account`, `Category`, `Budget`, `Transaction`, `ShoppingList`, `ShoppingItem`, `SavingsGoal`, `GoalContribution`, `Broker`, `BrokerTransaction`).
- [x] Categorización ortogonal (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`).
- [x] Lógica de Balance Continuo Splitwise (50/50) y liquidaciones parciales/totales (`SETTLEMENT`).
- [x] Lista de compras con descuentos jerárquicos y checkout automático hacia transacción 50/50.
- [x] Calculadora de Fondo de Emergencia y estimación de gastos fijos.
- [x] Migración inicial de Alembic ([0001_initial_core_and_finanzas.py](backend/migrations/versions/0001_initial_core_and_finanzas.py)).
- [x] Suite de pruebas automatizadas con Pytest (100% pasando, 6 tests).

---

## 📌 Fase 3: Integración Frontend y Formularios Interactivos (PRÓXIMA SESIÓN)
- [ ] Conectar React Query / Axios en el frontend con los endpoints reales del backend:
  - [ ] Login y switch rápido por PIN interactivo conectado a `/api/v1/auth/*`.
  - [ ] Dashboard de finanzas con datos en tiempo real de `/api/v1/finanzas/balance/couple-net`.
  - [ ] Modal de registro de nuevo movimiento (Gasto individual vs Gasto 50/50).
  - [ ] Modal de liquidación de saldo (`SETTLEMENT`) con selector de cuenta origen y destino.
  - [ ] Lista de compras interactiva conectada a `/api/v1/finanzas/shopping/*` con checkout en vivo.
  - [ ] Panel de presupuestos mensuales con creación y barras de progreso activas.
  - [ ] Panel de metas de ahorro y calculadora de fondo de emergencia.

---

## 📦 Fase 4: Módulo de Inventario (`inventario`)
- [ ] Modelado de esquema PostgreSQL `inventario` (`items`, `categories`, `stock`, `locations`, `expiration_dates`).
- [ ] Endpoints RESTful para control de stock de despensa, limpieza y compras recurrentes.
- [ ] Vinculación con lista de compras (agregar automáticamente a la lista productos cuando el stock esté bajo).

---

## 🚀 Fase 5: Despliegue en Raspberry Pi 5 y Producción
- [ ] Configuración final en Raspberry Pi 5 con Nginx Proxy Manager y certificados SSL.
- [ ] Automatización de backup de base de datos PostgreSQL.
- [ ] Monitoreo de memoria RAM y rendimiento.
