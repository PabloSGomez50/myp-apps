# 0003. Diseño de Dominio y Lógica de Negocio para Inversiones y Ahorros

* **Estado**: Aceptado
* **Fecha**: 2026-09-17
* **Contexto**: `myp-apps` (Módulo `finanzas` & Pestaña `Inversiones y Ahorros`)

## Contexto y Declaración del Problema

Tras completar el core de Finanzas (movimientos 50/50, liquidaciones, CSV, categorización y resumen de balance) y el módulo de Inventario, la Fase 5 del proyecto requiere desarrollar el módulo de **Inversiones y Ahorros**. 

El objetivo es proveer a la pareja (Pablo y Martu) de un centro unificado para:
1. Definir y seguir el progreso de **Metas de Ahorro** (personales y compartidas), incluyendo la reserva del **Fondo de Emergencia**.
2. Administrar el **Portafolio de Inversiones** por entidad / Broker (FCI, Cedears, Crypto, Cuentas Remuneradas / Mercado Dinero).
3. Mantener un **Historial de Cotizaciones y Monedas** (USD Blue, MEP, Crypto) para valuar el patrimonio sin desfasajes de saldo.
4. Desacoplar la gestión directa de cuentas bancarias (`Account`) para evitar fricción por gastos no trackeados.

---

## Decisiones Principales de Dominio

### 1. Estructura de Interfaz Modular (`InversionesPage.tsx`)
La vista principal de la pestaña de Inversiones y Ahorro estará dividida en dos grandes bloques visuales:
- **Sección A: Metas de Ahorro y Fondo de Emergencia**:
  - Cards de progreso porcentual, monto acumulado vs objetivo, fecha límite y desglose de aportes por usuario.
  - Indicador destacado para la Meta especial **"Fondo de Emergencia"** con cálculo de meses de cobertura de gastos fijos.
- **Sección B: Portafolio de Inversiones & Brokers**:
  - Grid de entidades financieras/brokers (ej. Balanz, IOL, Lemon Cash, Mercado Pago).
  - Gráfico de distribución de activos por tipo y moneda (ARS / USD / Crypto) mediante `recharts`.
  - Historial de movimientos de broker (depósitos, rescates, suscripciones).

### 2. Desacoplamiento Temporal de Saldos Bancarios (`Account`)
- **Evitar Fricción por Desfasajes**: Se decide **no exigir ni actualizar automáticamente los saldos de cuentas bancarias/billeteras (`Account`)** al realizar aportes o depósitos. 
- **Razón**: Exigir el tracking de cuentas bancarias en esta etapa generaría grandes desfasajes de balance por consumos no contemplados en la app (ej. compras menores en efectivo o suscripciones aisladas).
- **Independencia Operativa**: Las Metas de Ahorro y tenencias en Brokers operan como registros contables independientes. Sin embargo, todo aporte registrado en el mes se descuenta del **Flujo Disponible del Mes** como dinero comprometido para reserva/inversión.

### 3. Modelo de Titularidad y Ámbito Híbrido
- **Metas de Ahorro**: Pueden clasificarse como **Personales** (de un integrante específico) o **Compartidas del Hogar** (con registro de aportes individuales de cada miembro).
- **Brokers e Inversiones**: Son **100% Personales** de cada usuario.
- **Soporte de Vista Dual**: Toda la interfaz respeta el selector de vista global del header (**Hogar Completo `ALL`** vs **Solo [Integrante]**).

### 4. Tabla de Registro Histórico de Monedas y Cotizaciones (`CurrencyQuote`)
- Se crea la nueva entidad `CurrencyQuote` (tabla `finanzas.currency_quotes`) para guardar el historial de cotizaciones de las divisas y criptoactivos a lo largo del tiempo.
- Permite seleccionar o ingresar valores referenciales (ej. `USD_MEP`, `USD_BLUE`, `USDT`, `BTC`) con fecha para calcular automáticamente la valorización consolidada del portafolio en ARS.

### 5. Conexión Dinámica con el Dashboard de Finanzas
- **Card de Fondo de Emergencia**: Se conecta directamente a la Meta etiquetada como Fondo de Emergencia (monto acumulado real), dividiéndola por el gasto promedio fijo mensual (`FIXED_HOUSEHOLD + FIXED_PERSONAL`) para exhibir el indicador real de meses de tranquilidad (ej. 3.2 meses).
- **Flujo Disponible del Mes**: Resta del sobrante mensual los aportes destinados a Metas o Brokers dentro del período.

---

## Tablas y Modelos PostgreSQL Consumidos (`schema: finanzas`)

La pestaña de Inversiones y Ahorros consumirá y actualizará los siguientes modelos relacionales en la base de datos:

```text
finanzas.savings_goals (Metas de Ahorro)
├── id, household_id, nombre, monto_objetivo, monto_acumulado, moneda, fecha_limite
└── goal_contributions (Aportes a Metas)
    └── id, goal_id, user_id, monto, fecha

finanzas.brokers (Entidades / Brokers)
├── id, user_id, household_id, nombre, saldo_total_ars, saldo_total_usd, saldo_total_crypto, is_active
└── broker_transactions (Movimientos de Broker)
    └── id, broker_id, tipo (DEPOSIT, WITHDRAW, BUY_SIMPLE, SELL_SIMPLE, FCI_SUBSCRIBE, FCI_REDEEM), monto, moneda, descripcion, fecha

finanzas.currency_quotes (Histórico de Cotizaciones)
└── id, household_id, moneda_origen (USD_BLUE, USD_MEP, USDT, BTC), moneda_destino (ARS), cotizacion, fecha

finanzas.investment_assets (Títulos, CEDEARs, Acciones y FCI)
└── id, household_id, broker_id, ticker, nombre, tipo, cantidad, precio_compra, precio_actual, rentabilidad_esperada_anual, moneda
```

---

## Plan de Implementación (Completado)

### Paso 1: Modelos y Endpoints Backend (`/api/v1/finanzas/`)
- [x] Crear modelo `CurrencyQuote` e `InvestmentAsset` en `backend/app/modules/finanzas/models.py`.
- [x] `GET /finanzas/savings-goals` y `POST /finanzas/savings-goals`: CRUD de metas de ahorro.
- [x] `POST /finanzas/savings-goals/{id}/contribute`: Registrar aporte a meta (con vinculación a `broker_id` opcional).
- [x] `GET /finanzas/brokers` y `POST /finanzas/brokers`: CRUD de entidades/brokers.
- [x] `POST /finanzas/brokers/{id}/transactions`: Registrar movimientos de broker (depósitos, rescates, cambios de saldo).
- [x] `GET`, `POST`, `DELETE /finanzas/currency-quotes`: Registrar y consultar historial de cotizaciones.
- [x] `GET`, `POST`, `DELETE /finanzas/investments/assets`: Registrar y gestionar títulos, acciones y FCI.

### Paso 2: Componentes Frontend SPA React (`InversionesPage.tsx`)
- [x] Crear la página `InversionesPage.tsx` en `src/modules/finanzas/pages/`.
- [x] Implementar la Sección A (Metas de Ahorro + Modal `NewSavingsGoalModal.tsx` + Modal `AddContributionModal.tsx`).
- [x] Implementar la Sección B (Portafolio por Broker + Modal `NewBrokerModal.tsx` + Gráfico `BrokerDistributionPieChart.tsx` en 1 col).
- [x] Gestor/Selector de Cotización Dólar/Crypto de Referencia.
- [x] Tabla de Títulos & Fondos FCI con modal `NewInvestmentAssetModal.tsx` e ingresos proyectados (`gananciaMensual`, `gananciaAnual`).
- [x] Agregar la ruta `/inversiones` en React Router y vincularla en la Sidebar y BottomNav.

### Paso 3: Integración con Dashboard de Finanzas
- [x] Actualizar la Card de **Fondo de Emergencia** en `FinanzasDashboard.tsx` para reflejar el monto acumulado real de la Meta.
- [x] Actualizar el cálculo del **Flujo Disponible del Mes** restando los aportes a ahorros e inversiones del mes.

---

## Consecuencias
- Operación fluida sin riesgo de desfasajes bancarios.
- Registro histórico de cotizaciones para analítica de patrimonio.
- Cierre integral de la **Fase 5 del Roadmap**.
