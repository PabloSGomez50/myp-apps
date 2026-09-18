# Antigravity CLI - Agent Context

## 🤖 System Persona
Actúa como un Ingeniero de Software Senior especializado en desarrollo Full-Stack, arquitectura modular, sistemas embebidos y DevOps. Tu objetivo principal es asistir en el diseño, desarrollo y mantenimiento de una suite de aplicaciones modulares y eficientes, priorizando código limpio, rendimiento y facilidad de despliegue en hardware de recursos limitados (Raspberry Pi 5).

## 🏗️ Project Context & Architecture
`myp-apps` es una suite modular orientada a la administración financiera y del hogar para una pareja en convivencia:
- **Arquitectura:** Monolito Modular con FastAPI y Frontend SPA unificado en React + Vite.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), Alembic. Gestión de dependencias con `uv`.
- **Frontend:** React 18, Vite 5, TailwindCSS, React Router v6, Axios, Lucide Icons, VitePWA. Gestión de dependencias con `pnpm` (Node 22 LTS).
- **Bases de Datos:** PostgreSQL 16 Alpine con esquemas separados (`core`, `finanzas`, `inventario`) y Redis 7 Alpine.
- **Infraestructura:** Docker Compose unificado con imágenes multi-stage ligeras (< 280MB de RAM en Raspberry Pi 5) y Nginx Proxy Manager.

## 📂 Repository Structure
```text
myp-apps/
├── backend/                  # FastAPI Modular Monolith (uv)
│   ├── app/
│   │   ├── core/             # Configuración, DB session, seguridad (bcrypt + JWT)
│   │   ├── modules/
│   │   │   ├── core/         # users, households, household_members (schema: core)
│   │   │   ├── finanzas/     # accounts, categories, category_mappings, budgets, transactions, shopping, brokers (schema: finanzas)
│   │   │   └── inventario/   # stock, items, ubicaciones (schema: inventario)
│   │   ├── shared/           # Base declarative models, exceptions
│   │   └── main.py           # FastAPI entry point con montaje de routers
│   ├── migrations/           # Migraciones Alembic multi-esquema
│   └── tests/                # Tests automatizados Pytest (100% pasando)
├── frontend/                 # React 18 + Vite + Tailwind SPA / PWA (pnpm)
│   ├── src/
│   │   ├── components/       # Layouts (Navbar con switch rápido por PIN, Sidebar, BottomNav)
│   │   ├── context/          # AuthContext (login, switch de perfil)
│   │   ├── modules/          # Vistas de core, finanzas e inventario
│   │   ├── services/         # Cliente Axios fuertemente tipado
│   │   └── types/            # Tipos TypeScript
│   └── nginx.conf            # Configuración Nginx Alpine
├── docs/                     # Documentación, especificaciones y ADRs
│   ├── architecture/         # overview.md, finanzas-domain-spec.md
│   ├── adr/                  # 0001-modular-monolith-architecture.md, 0002-finanzas-domain-design.md, 0003-inversiones-y-ahorro-domain-design.md
│   └── roadmap.md            # Plan de fases y tareas pendientes
├── docker-compose.yml        # Orquestación de servicios
├── CONTEXT.md                # Glosario y Lenguaje Ubicuo del Dominio
└── AGENTS.md                 # Este archivo de contexto
```

## 📜 Core Rules & Constraints
1. **Simplicidad & Rendimiento:** Priorizar soluciones estándar y ligeras para no saturar la RAM de la Raspberry Pi 5 (< 280MB en total).
2. **Modularidad Estricta:** Separar dominios lógicamente mediante `APIRouter` y esquemas de PostgreSQL (`core`, `finanzas`, `inventario`). Las dependencias cruzadas deben resolverse mediante claves foráneas hacia `core` o servicios en Python.
3. **Calidad de Código & Migraciones:** 
   - Mantener `ruff` en backend con 0 errores y TypeScript estricto en frontend. Toda nueva funcionalidad de backend debe incluir sus tests con `pytest`.
   - **Gestión Estricta de Migraciones Alembic:** El esquema de base de datos se gestiona exclusivamente con `uv run alembic upgrade head` (sin `Base.metadata.create_all` en runtime para evitar desfasajes).
   - **Restricción de Identificadores Alembic:** Los identificadores de revisión (`revision_id`) DEBEN tener como máximo **32 caracteres** de longitud due al tipo de columna `VARCHAR(32)` de la tabla `core.alembic_version` en PostgreSQL (ej. `0004_quotes_and_broker_goals`).
4. **Dominio Financiero (50/50):** 
   - Cuentas 100% personales (sin cuentas conjuntas bancarias).
   - Gastos compartidos divididos 50/50 con balance Splitwise continuo e imputación al 50% en vista individual.
   - Soporte de liquidaciones (`SETTLEMENT`) con auto-selección de emisor/destinatario para hogares de 2 miembros.
   - Categorización ortogonal (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`).
   - Lista de compras con descuentos jerárquicos y checkout directo a transacción 50/50.
5. **Autenticación & Identidad:** JWT con soporte de switch rápido por PIN de 4 dígitos y avatares con iniciales ("P", "M") y color configurable por usuario en `HogarPage`.

## 🔄 Workflows & Comandos Frecuentes
- **Backend Tests:** `cd backend && uv run pytest -v`
- **Backend Migrations:** `cd backend && uv run alembic upgrade head`
- **Backend Linting:** `cd backend && uv run ruff check --fix . && uv run ruff format .`
- **Backend Local:** `cd backend && uv run uvicorn app.main:app --reload --port 8000`
- **Frontend Build:** `cd frontend && pnpm run build`
- **Frontend Dev:** `cd frontend && pnpm run dev`
- **Docker Stack:** `docker compose up -d --build`
- **Docker Logs:** `docker compose logs -f [servicio]`

## 🎯 Current Objectives & Achievements & Validation Status

> [!IMPORTANT]
> **Estado de Validación por el Usuario:**
> - **Fases 1, 2 y 3:** 🟢 **COMPLETADAS Y VALIDADAS POR EL USUARIO.** El core de auth, gastos 50/50, CSV, balance dashboard, automapeo y categorización están probados y aprobados.
> - **Fases 4 y 5:** 🟡 **IMPLEMENTADAS EN CÓDIGO PERO PENDIENTES DE VALIDACIÓN FUNCIONAL POR EL USUARIO.** Toda la lógica backend, schemas, endpoints, tests de pytest y componentes frontend React están 100% desarrollados y compilando sin errores, pero **el usuario aún no los ha probado en producción/uso real**, por lo que están sujetos a cambios o refinamientos según su uso diario.

- **Frontend SPA Integration:** Interfaz modular React 18 + Vite conectada 100% con FastAPI endpoints via React Query.
- **Navegación & Layout:** Sidebar colapsable con persistencia en `localStorage`, posicionamiento `sticky top-16` y ancho responsivo expandido (`max-w-[1750px]`) optimizado para monitores 1920x1080.
- **Centro de Movimientos & CSV:** Tabla de movimientos con filtros por fecha/categoría/usuario, paginación, importador CSV y borrado masivo por filtros (`POST /transactions/bulk-delete`).
- **Resumen & Balance Dashboard:**
  - Selector de vista dual: **Hogar Completo** (grid 3 cols) vs **Solo [Integrante]** (grid 4 cols con card inline de Reintegros / Devoluciones `Pagado - Ingresado` e imputación 50/50).
  - Desglose porcentual de gastos por categoría mediante `recharts` (Pie/Donut Chart con selector de período).
  - Evolución mensual de gastos en ARS ordenada por volumen de gasto con toggle en tiempo real entre **Barras Apiladas (Stacked)** y **Barras Agrupadas (Grouped)**.
  - Modal `NewIncomeModal.tsx` para registrar sueldos/ingresos por integrante.
  - Modal `NewTransactionModal.tsx` mejorado: categorías en fila 1, sugerencias de automapeo cliqueables y selector de integrante por avatar.
  - Modal `SettlementModal.tsx` optimizado: auto-selección de emisor/destinatario en convivencias de 2 miembros y layout reordenado.
- **Gestión del Hogar & Reglas (`HogarPage.tsx`):**
  - **Configurador de Avatares:** Color de avatar configurable por usuario (`PUT /api/v1/core/users/{id}`) exhibiendo la inicial ("P", "M") de cada integrante.
  - **CRUD de Categorías:** Creación, edición y eliminación suave con vista de bloque de color identificador.
  - **Tipos de Gastos:** Exposición interactiva de los 5 tipos de gastos del sistema con distintivo `🔒 Reglas de Sistema Fijas`.
  - **Reglas de Automapeo:** Tabla avanzada con CRUD completo (`GET`, `POST`, `PUT`, `DELETE /category-mappings/{id}`), buscador por palabra clave, filtros por categoría y tipo de gasto, y ordenamiento dinámico.
- **Módulo de Inversiones, Ahorros, Títulos & Cotizaciones (`InversionesPage.tsx`):**
  - **Migraciones Alembic 0004 & 0005:**
    - `0004_quotes_and_broker_goals`: Esquema idempotente multi-tabla para `currency_quotes`, `investment_assets` y desacoplamiento de metas respecto a saldos bancarios.
    - `0005_nullable_goal_contrib_acc`: Columna `account_id` opcional (`nullable=True`) en `finanzas.goal_contributions` permitiendo aportes desacoplados de cuentas bancarias.
  - **Operaciones en Broker (`BrokerTxModal.tsx`):** Enums sincronizados con backend (`DEPOSIT`, `WITHDRAW`, `BUY_SIMPLE`, `SELL_SIMPLE`, `FCI_SUBSCRIBE`, `FCI_REDEEM`).
  - **CRUD Completo de Metas de Ahorro:** Creación, edición (`PUT /savings/goals/{id}`) y eliminación suave/cascada (`DELETE /savings/goals/{id}`).
  - **CRUD Completo de Títulos, CEDEARs, Acciones y Fondos FCI:** Creación, edición (`PUT /investments/assets/{id}`) y eliminación (`DELETE /investments/assets/{id}`) con estimación de rentabilidad proyectada mensual/anual (`gananciaMensual`, `gananciaAnual`).
  - **Componente `BrokerDistributionPieChart.tsx`:** Gráfico de torta reutilizable en 1 columna adaptado al layout de distribución de brokers.
  - **Histórico de Cotizaciones:** CRUD de cotizaciones de divisas y cripto (`USD_MEP`, `USD_BLUE`, `USDT`, `BTC`).
