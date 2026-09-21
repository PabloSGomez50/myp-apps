# 🗺️ Roadmap del Proyecto `myp-apps`

Estado actual de avance y guía de tareas para las próximas sesiones de desarrollo con Antigravity.

> [!IMPORTANT]
> **Aviso de Estado de Validación de Usuario:**
> - **Fases 1, 2, 3, 4 y 5:** 🟢 **COMPLETADAS Y VALIDADAS POR EL USUARIO.** El backend, frontend, inventario/stock y el módulo de Inversiones/Ahorros están probados, aprobados y desplegados en Raspberry Pi 5.
> - **Fase 6 (Lista de Compras Inteligente y Registro de Precios):** 🟡 **EN PROCESO DE PLANIFICACIÓN Y DISEÑO.** Enfoque actual para definir el esquema y flujo operativo.

---

## ✅ Fase 1: Arquitectura y Scaffolding Base (COMPLETADO Y VALIDADO)
- [x] Diagramación de Monolito Modular con FastAPI y React/Vite SPA.
- [x] Configuración de `docker-compose.yml` optimizado (< 280MB RAM) con PostgreSQL 16 y Redis 7 Alpine.
- [x] Configuración de `uv` en backend y `pnpm` con Node 22 Alpine en frontend.
- [x] Registro de Decisiones de Arquitectura ([ADR 0001](docs/adr/0001-modular-monolith-architecture.md) y [ADR 0002](docs/adr/0002-finanzas-domain-design.md)).
- [x] Estructura de navegación híbrida (Sidebar Desktop, BottomNav Mobile, Navbar con switcher rápido de perfil).

---

## ✅ Fase 2: Backend Core & Finanzas (COMPLETADO Y VALIDADO)
- [x] Modelos relacionales PostgreSQL en esquema `core` (`User`, `Household`, `HouseholdMember`).
- [x] Autenticación JWT con hashing `bcrypt` y conmutación ágil por PIN de 4 dígitos.
- [x] Modelos relacionales PostgreSQL en esquema `finanzas` (`Account`, `Category`, `CategoryMapping`, `Budget`, `Transaction`, `ShoppingList`, `SavingsGoal`, `Broker`).
- [x] Categorización ortogonal (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`).
- [x] Lógica de Balance Continuo Splitwise (50/50) y liquidaciones parciales/totales (`SETTLEMENT`).
- [x] Endpoints CRUD para Reglas de Automapeo (`CategoryMapping`) con soporte `PUT` y `DELETE`.
- [x] Calculadora de Fondo de Emergencia y estimación de gastos fijos.
- [x] Suite de pruebas automatizadas con Pytest (100% pasando).

---

## ✅ Fase 3: Integración Frontend, Resumen & Balance (COMPLETADO Y VALIDADO)
- [x] Configuración de `@tanstack/react-query` v5 para gestión de estado de servidor y caché en la SPA React.
- [x] Dashboard de Finanzas con selector de vista **Hogar Completo** (3 cols) vs **Vista Individual** (4 cols con 50/50 shared imputation e inline Reintegros `Pagado - Ingresado`).
- [x] Gráfico de evolución mensual por categoría con ordenamiento por volumen y toggle en tiempo real entre **Barras Apiladas (Stacked)** y **Barras Agrupadas (Grouped)**.
- [x] Modal `NewIncomeModal.tsx` para registrar sueldos e ingresos por integrante.
- [x] Modal `NewTransactionModal.tsx` mejorado con categorías en la primera posición, chips de sugerencias de automapeo y selector de usuarios por avatar.
- [x] Modal `SettlementModal.tsx` optimizado con auto-selección de emisor/destinatario en convivencias de 2 miembros.
- [x] Centro de Movimientos con paginación, filtros avanzados y borrado masivo (`POST /transactions/bulk-delete`).

---

## ✅ Fase 4: Módulo de Inventario & Gestión del Hogar (COMPLETADO Y VALIDADO)
- [x] Modelado del esquema PostgreSQL `inventario` (`locations`, `categories`, `items`, `stock_logs`).
- [x] Interfaz interactiva en `InventarioPage.tsx` con búsqueda, filtros y ajuste rápido de stock (+1/-1).
- [x] **Modo de Visualización Dual**: Toggle entre vista en Cuadrícula (Cards) y Tabla Condensada con preferencia guardada en `localStorage`.
- [x] **Historial de Movimientos de Stock (`StockLog`)**: Modal con badges de avatar/usuario, fecha, tipo de movimiento y notas.
- [x] **Envío Inteligente de Faltantes a Lista de Compras**: Modal con checkboxes, edición de cantidades a comprar y selección/creación de lista de compras.
- [x] **CRUD Completo**: Ubicaciones físicas (con contador de ítems), Categorías de inventario y Productos (con stock mínimo y vencimientos).
- [x] **Gestión del Hogar (`HogarPage.tsx`)**:
  - Configurador de color de avatar por usuario con iniciales ("P", "M").
  - CRUD completo de Categorías con bloques de color identificadores.
  - Sección interactiva de Tipos de Gastos con distintivo `🔒 Reglas de Sistema Fijas`.
  - Gestor avanzado de Reglas de Automapeo con buscador por palabra clave, filtros por categoría/tipo y ordenamiento.
  - Ancho de contenedor extendido (`max-w-[1750px]`) optimizado para monitores 1920x1080.

---

## ✅ Fase 5: Inversiones, Ahorros, Títulos & Cotizaciones (COMPLETADO Y VALIDADO EN RPI 5)
- [x] Registro de Decisión de Arquitectura y Diseño de Dominio ([ADR 0003](docs/adr/0003-inversiones-y-ahorro-domain-design.md)).
- [x] Migraciones Alembic Multi-esquema Idempotentes:
  - Migración `0004_quotes_and_broker_goals` (estándar Alembic-only, `revision_id <= 32` caracteres).
  - Migración `0005_nullable_goal_contrib_acc` (hace opcional la columna `account_id` para permitir aportes a metas desacoplados de cuentas bancarias).
- [x] Modelo y Endpoints Backend para Histórico de Cotizaciones (`CurrencyQuote` en `/api/v1/finanzas/currency-quotes`).
- [x] Modelo y Endpoints Backend para Títulos, CEDEARs, Acciones y FCI con CRUD completo (`InvestmentAsset` en `/api/v1/finanzas/investments/assets`).
- [x] Endpoints Backend para Metas de Ahorro y Brokers con CRUD completo (`/api/v1/finanzas/savings/goals`, `/api/v1/finanzas/investments/brokers`).
- [x] Interfaz SPA React en `InversionesPage.tsx`:
  - Componente de gráfico de dona/torta reutilizable `BrokerDistributionPieChart.tsx` (1 columna).
  - Tabla de Títulos & Fondos FCI con modal de creación/edición (`NewInvestmentAssetModal.tsx`) y cálculo de ingresos proyectados.
  - Metas de ahorro desacopladas con modal de edición (`NewSavingsGoalModal.tsx`) y botón de eliminación.
  - Modal de operaciones en Broker (`BrokerTxModal.tsx`) con enums corregidos (`DEPOSIT`, `WITHDRAW`, `BUY_SIMPLE`, `SELL_SIMPLE`, `FCI_SUBSCRIBE`, `FCI_REDEEM`).
  - CRUD e historial de cotizaciones de divisas y crypto (`USD_MEP`, `USD_BLUE`, `USDT`, `BTC`).
- [ ] Configuración final en Raspberry Pi 5 con Nginx Proxy Manager y certificados SSL.
- [ ] Monitoreo de memoria RAM y backup automático de base de datos.

