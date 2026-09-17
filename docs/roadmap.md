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
- [x] Modelos relacionales PostgreSQL en esquema `finanzas` (`Account`, `Category`, `CategoryMapping`, `Budget`, `Transaction`, `ShoppingList`, `SavingsGoal`, `Broker`).
- [x] Categorización ortogonal (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`).
- [x] Lógica de Balance Continuo Splitwise (50/50) y liquidaciones parciales/totales (`SETTLEMENT`).
- [x] Endpoints CRUD para Reglas de Automapeo (`CategoryMapping`) con soporte `PUT` y `DELETE`.
- [x] Calculadora de Fondo de Emergencia y estimación de gastos fijos.
- [x] Suite de pruebas automatizadas con Pytest (100% pasando, 10 tests).

---

## ✅ Fase 3: Integración Frontend, Resumen & Balance (COMPLETADO)
- [x] Configuración de `@tanstack/react-query` v5 para gestión de estado de servidor y caché en la SPA React.
- [x] Dashboard de Finanzas con selector de vista **Hogar Completo** (3 cols) vs **Vista Individual** (4 cols con 50/50 shared imputation e inline Reintegros `Pagado - Ingresado`).
- [x] Gráfico de evolución mensual por categoría con ordenamiento por volumen y toggle en tiempo real entre **Barras Apiladas (Stacked)** y **Barras Agrupadas (Grouped)**.
- [x] Modal `NewIncomeModal.tsx` para registrar sueldos e ingresos por integrante.
- [x] Modal `NewTransactionModal.tsx` mejorado con categorías en la primera posición, chips de sugerencias de automapeo y selector de usuarios por avatar.
- [x] Modal `SettlementModal.tsx` optimizado con auto-selección de emisor/destinatario en convivencias de 2 miembros.
- [x] Centro de Movimientos con paginación, filtros avanzados y borrado masivo (`POST /transactions/bulk-delete`).

---

## ✅ Fase 4: Módulo de Inventario & Gestión del Hogar (COMPLETADO)
- [x] Modelado del esquema PostgreSQL `inventario` (`locations`, `categories`, `items`, `stock_logs`).
- [x] Interfaz interactiva en `InventarioPage.tsx` con búsqueda, filtros y ajuste rápido de stock.
- [x] Vinculación con lista de compras mediante *"Sugerir por Stock Bajo"*.
- [x] **Gestión del Hogar (`HogarPage.tsx`)**:
  - Configurador de color de avatar por usuario con iniciales ("P", "M").
  - CRUD completo de Categorías con bloques de color identificadores (removiendo emojis).
  - Sección interactiva de Tipos de Gastos con distintivo `🔒 Reglas de Sistema Fijas`.
  - Gestor avanzado de Reglas de Automapeo con buscador por palabra clave, filtros por categoría/tipo y ordenamiento.
  - Ancho de contenedor extendido (`max-w-[1750px]`) optimizado para monitores 1920x1080.

---

## 🔮 Fase 5: Inversiones, Ahorros & Despliegue en Raspberry Pi 5
- [ ] Vista enriquecida de Inversiones y Ahorros (Metas de ahorro, FCI, Cedears, Crypto).
- [ ] Configuración final en Raspberry Pi 5 con Nginx Proxy Manager y certificados SSL.
- [ ] Monitoreo de memoria RAM y backup automático de base de datos.
