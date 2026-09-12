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
│   │   │   ├── finanzas/     # accounts, categories, budgets, transactions, shopping, brokers (schema: finanzas)
│   │   │   └── inventario/   # stock, items, ubicaciones (schema: inventario)
│   │   ├── shared/           # Base declarative models, exceptions
│   │   └── main.py           # FastAPI entry point con montaje de routers
│   ├── migrations/           # Migraciones Alembic multi-esquema
│   └── tests/                # Tests automatizados Pytest
├── frontend/                 # React 18 + Vite + Tailwind SPA / PWA (pnpm)
│   ├── src/
│   │   ├── components/       # Layouts (Navbar con switch rápido por PIN, Sidebar, BottomNav)
│   │   ├── context/          # AuthContext (login, switch de perfil)
│   │   ├── modules/          # Vistas de core, finanzas e inventario
│   │   ├── services/         # Cliente Axios
│   │   └── types/            # Tipos TypeScript
│   └── nginx.conf            # Configuración Nginx Alpine
├── docs/                     # Documentación, especificaciones y ADRs
│   ├── architecture/         # overview.md, finanzas-domain-spec.md
│   ├── adr/                  # 0001-modular-monolith-architecture.md, 0002-finanzas-domain-design.md
│   └── roadmap.md            # Plan de fases y tareas pendientes
├── docker-compose.yml        # Orquestación de servicios
├── CONTEXT.md                # Glosario y Lenguaje Ubicuo del Dominio
└── AGENTS.md                 # Este archivo de contexto
```

## 📜 Core Rules & Constraints
1. **Simplicidad & Rendimiento:** Priorizar soluciones estándar y ligeras para no saturar la RAM de la Raspberry Pi 5 (< 280MB en total).
2. **Modularidad Estricta:** Separar dominios lógicamente mediante `APIRouter` y esquemas de PostgreSQL (`core`, `finanzas`, `inventario`). Las dependencias cruzadas deben resolverse mediante claves foráneas hacia `core` o servicios en Python.
3. **Calidad de Código:** Mantener `ruff` en backend con 0 errores y TypeScript estricto en frontend. Toda nueva funcionalidad de backend debe incluir sus tests con `pytest`.
4. **Dominio Financiero (50/50):** 
   - Cuentas 100% personales (sin cuentas conjuntas bancarias).
   - Gastos compartidos divididos 50/50 con balance Splitwise continuo y soporte de liquidaciones (`SETTLEMENT`).
   - Categorización ortogonal (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`).
   - Lista de compras con descuentos jerárquicos y checkout directo a transacción 50/50.
5. **Autenticación:** JWT con soporte de switch rápido por PIN de 4 dígitos para compartir dispositivos en casa.

## 🔄 Workflows & Comandos Frecuentes
- **Backend Tests:** `cd backend && uv run pytest -v`
- **Backend Linting:** `cd backend && uv run ruff check --fix . && uv run ruff format .`
- **Backend Local:** `cd backend && uv run uvicorn app.main:app --reload --port 8000`
- **Frontend Build:** `cd frontend && pnpm run build`
- **Frontend Dev:** `cd frontend && pnpm run dev`
- **Docker Stack:** `docker compose up -d --build`
- **Docker Logs:** `docker compose logs -f [servicio]`

## 🎯 Current Objectives & Achievements (Fase 3 & 4)
- **Frontend SPA Integration:** Interfaz modular React 18 + Vite conectada 100% con FastAPI endpoints via React Query.
- **Navegación & Layout:** Sidebar colapsable con persistencia en `localStorage` y posicionamiento `sticky top-16` para scroll fluido.
- **Centro de Movimientos & CSV:** Tabla de movimientos con filtros por fecha/categoría/usuario, paginación, importador CSV y borrado masivo por filtros (`POST /transactions/bulk-delete`).
- **Resumen & Balance Dashboard:**
  - Desglose porcentual de gastos por categoría mediante `recharts` (Pie/Donut Chart con selector de período).
  - Evolución histórica mensual apilada (Stacked Bar Chart con selector de 3, 6 o 12 meses).
  - Modal `NewIncomeModal.tsx` para registrar sueldos/ingresos por integrante.
  - Métricas dinámicas en tiempo real: *Flujo Libre del Mes* (`Total Ingresos - Total Gastos`) y *Gastos Compartidos*.
