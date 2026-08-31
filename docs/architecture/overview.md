# 🏛️ Visión General de Arquitectura: `myp-apps`

`myp-apps` es una suite de gestión interna orientada a la administración del hogar, finanzas en pareja e inventario. Está estructurada como un **Monolito Modular** diseñado para ejecutarse eficientemente en contenedores con bajo consumo de memoria (< 280MB de RAM en una Raspberry Pi 5).

---

## 🧭 Diagrama de Arquitectura

```mermaid
graph TD
    ClientMobile["📱 Mobile / PWA<br>(Acciones rápidas, compras, tickets)"] --> NPM["🌐 Nginx Proxy Manager"]
    ClientDesktop["💻 Desktop Web<br>(Analítica profunda, presupuestos, balances)"] --> NPM
    
    NPM --> Frontend["⚛️ Frontend (React 18 + Vite + Tailwind)<br>SPA Unificada / PWA"]
    NPM --> Backend["⚡ Backend (FastAPI + SQLAlchemy 2.0 + uv)<br>Monolito Modular"]
    
    Backend --> Postgres[("🐘 PostgreSQL 16 Alpine")]
    Backend --> Redis[("⚡ Redis 7 Alpine")]
    
    subgraph Postgres_Schemas["PostgreSQL Schemas"]
        direction TB
        SchemaCore["Schema: core<br>(users, households, household_members)"]
        SchemaFinanzas["Schema: finanzas<br>(accounts, categories, budgets, transactions, shopping_lists, savings_goals, brokers)"]
        SchemaInventario["Schema: inventario<br>(items, stock, ubicaciones)"]
        
        SchemaFinanzas -->|Foreign Keys| SchemaCore
        SchemaInventario -->|Foreign Keys| SchemaCore
    end
    
    Postgres --- Postgres_Schemas
```

---

## 📂 Estructura de Directorios

```text
myp-apps/
├── backend/
│   ├── app/
│   │   ├── core/                  # Configuración, DB async engine, seguridad y JWT
│   │   │   ├── config.py
│   │   │   ├── database.py        # Sesión async y auto-creación de esquemas
│   │   │   └── security.py        # Hashing bcrypt, PIN y JWT
│   │   ├── modules/
│   │   │   ├── core/              # Módulo de Identidad y Hogar
│   │   │   │   ├── models.py      # User, Household, HouseholdMember (schema: core)
│   │   │   │   ├── schemas.py     # Pydantic v2 schemas
│   │   │   │   ├── service.py     # Lógica de auth, switch de PIN y hogar
│   │   │   │   └── router.py      # /api/v1/auth & /api/v1/core
│   │   │   ├── finanzas/          # Módulo de Finanzas Personales y de Pareja
│   │   │   │   ├── models.py      # Accounts, Categories, Budgets, Transactions, etc. (schema: finanzas)
│   │   │   │   ├── schemas.py
│   │   │   │   ├── service.py     # Lógica Splitwise 50/50, descuentos de compras, fondo emergencia
│   │   │   │   └── router.py      # /api/v1/finanzas/*
│   │   │   └── inventario/        # Módulo de Inventario del Hogar
│   │   ├── shared/                # Modelos base declarativos, mixins y excepciones
│   │   │   ├── base_model.py
│   │   │   └── exceptions.py
│   │   └── main.py                # Entrada FastAPI, middlewares CORS y montaje de routers
│   ├── migrations/                # Migraciones Alembic multi-esquema
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/                     # Suite de pruebas Pytest (100% pasando)
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_finanzas_logic.py
│   │   ├── test_health.py
│   │   └── test_shopping_discounts.py
│   ├── pyproject.toml             # uv dependencies, ruff, pytest
│   ├── ruff.toml                  # Configuración de linter/formateador ultrarrápido
│   └── Dockerfile                 # Multi-stage Python 3.12 Slim
│
├── frontend/
│   ├── src/
│   │   ├── components/            # UI Kit y layouts (Navbar con switch rápido, Sidebar, BottomNav)
│   │   ├── context/               # AuthContext (login, JWT, switch de PIN)
│   │   ├── modules/
│   │   │   ├── core/pages/        # LoginPage, HogarPage
│   │   │   ├── finanzas/pages/    # FinanzasDashboard, ShoppingListPage
│   │   │   └── inventario/pages/  # InventarioPage
│   │   ├── services/api.ts        # Axios con interceptores de token y household
│   │   ├── types/index.ts         # Tipos TypeScript compartidos
│   │   ├── App.tsx                # Rutas protegidas y layout
│   │   └── main.tsx
│   ├── package.json               # pnpm dependencies
│   ├── vite.config.ts             # Vite 5 + Tailwind + VitePWA
│   ├── nginx.conf                 # SPA fallback y compresión Gzip
│   └── Dockerfile                 # Multi-stage Node 22 Alpine + Nginx Alpine
│
├── docs/                          # Documentación del sistema
│   ├── architecture/
│   └── adr/
├── docker-compose.yml             # Postgres + Redis + Backend + Frontend
├── .env.example
├── CONTEXT.md                     # Glosario de Lenguaje Ubicuo del Dominio
└── AGENTS.md                      # Contexto del Agente Antigravity
```

---

## 🗄️ Esquemas de Base de Datos (PostgreSQL)

1. **`core`**:
   - `users`: Identidad, email único, `hashed_password`, `pin_hash` (para switch ágil de perfil en dispositivos compartidos), nombre, color avatar, estado activo.
   - `households`: Espacio compartido del hogar ("Casa Pablo & Pareja"), moneda principal (`ARS`/`USD`).
   - `household_members`: Asociación de usuarios a hogares con roles `ADMIN` y `MEMBER`.

2. **`finanzas`**:
   - `accounts`: Cuentas y billeteras 100% personales (bancos, fintechs, efectivo, crypto).
   - `categories`: Clasificación ortogonal (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`), icono y token de paleta de colores.
   - `budgets`: Presupuestos mensuales por categoría (`month`, `year`, `monto_limite`).
   - `transactions`: Movimientos financieros con discriminación de gastos compartidos 50/50 y liquidaciones (`SETTLEMENT`).
   - `shopping_lists` & `shopping_items`: Listas de compras con descuento general de carrito y descuentos específicos por producto.
   - `savings_goals` & `goal_contributions`: Metas de ahorro y aportes registrados.
   - `brokers` & `broker_transactions`: Plataformas de inversión (saldos en ARS, USD y Crypto).

3. **`inventario`**:
   - Reservado para el control de stock, despensa y activos del hogar.
