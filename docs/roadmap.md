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

## ✅ Fase 3: Integración Frontend y Formularios Interactivos (COMPLETADO)
- [x] Configuración de `@tanstack/react-query` v5 para gestión de estado de servidor y caché en la SPA React.
- [x] Cliente HTTP Axios fuertemente tipado en `src/services/api.ts` para `/api/v1/auth/*` y `/api/v1/finanzas/*`.
- [x] Autenticación y cambio rápido de perfil por PIN de 4 dígitos integrado en `AuthContext.tsx`.
- [x] Dashboard de finanzas con visualización en tiempo real del balance continuo de pareja (`CoupleNetBalance`).
- [x] Modal interactivo `NewTransactionModal` para registrar gastos individuales y compartidos 50/50.
- [x] Modal interactivo `SettlementModal` para transferencia de liquidaciones de deuda.
- [x] Lista de compras interactiva en `ShoppingListPage.tsx` con descuentos jerárquicos, modales de ítems, sugerencia por stock bajo y checkout hacia transacción 50/50.

---

## ✅ Fase 4: Módulo de Inventario (`inventario`) (COMPLETADO)
- [x] Modelado del esquema PostgreSQL `inventario` (`locations`, `categories`, `items`, `stock_logs`).
- [x] Migración de Alembic `0002_inventario_schema.py` para la estructura de tablas del módulo.
- [x] Endpoints RESTful para control de stock, ubicaciones físicas y filtro de stock bajo (`/api/v1/inventario/*`).
- [x] Interfaz interactiva en `InventarioPage.tsx` con búsqueda, filtro por ubicación, insignias de estado y botones rápidos de ajuste `[+]` y `[-]`.
- [x] Vinculación interactiva con la lista de compras: botón *"Sugerir por Stock Bajo"* en `ShoppingListPage.tsx` importando productos desde la BD en tiempo real.
- [x] Suite de pruebas automatizadas con Pytest (`tests/test_inventario.py`) pasando al 100%.

---

## 🚀 Fase 5: Despliegue en Raspberry Pi 5 y Producción
- [ ] Configuración final en Raspberry Pi 5 con Nginx Proxy Manager y certificados SSL.
- [ ] Automatización de backup de base de datos PostgreSQL.
- [ ] Monitoreo de memoria RAM y rendimiento.
