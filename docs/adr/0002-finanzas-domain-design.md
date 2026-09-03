# 0002. Diseño de Dominio y Lógica de Negocio para el Módulo de Finanzas

* **Estado**: Aceptado
* **Fecha**: 2026-08-31
* **Contexto**: `myp-apps` (Módulo `finanzas`)

## Contexto y Declaración del Problema

Se requiere modelar y especificar el dominio financiero para una pareja en convivencia reciente (Pablo y Martu). La solución debe permitir trackear ingresos, gastos personales y compartidos, listas de compras con descuentos de supermercado, balances de deudas estilo Splitwise (50/50), metas de ahorro con fondo de emergencia, flujo de caja mensual y un MVP de inversiones en brokers.

## Decisiones Principales

1. **Cuentas 100% Personales**: Cada usuario registra sus cuentas bancarias, billeteras virtuales, efectivo y brokers. No existen cuentas bancarias conjuntas.
2. **Gastos Compartidos y Balance en Tiempo Real**: Todo gasto compartido se divide 50/50 de forma fija. El sistema calcula en tiempo real el balance neto (`Quién le debe a quién`) y permite registrar transacciones de tipo `SETTLEMENT` (Liquidaciones parciales o totales) para amortizar o saldar deudas, formateando la interfaz con 1-2 decimales limpios.
3. **Multi-moneda**: Soporte nativo de `ARS`, `USD` y `Crypto` con cotizaciones de referencia actualizables para consolidar en la moneda base del hogar.
4. **Categorización Jerárquica y Presupuestos**: Clasificación por Tipo (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `PERSONAL`) con paleta de colores predefinida y campos `month`/`year` para presupuestos mensuales y alertas de desvío.
5. **Lista de Compras con Descuentos Jerárquicos**: Soporte para descuento general del carrito (ej. 20% bancario del día) con sobreescritura por descuento específico de producto (ej. 15%), convirtiendo automáticamente la compra finalizada en un Gasto Compartido 50/50.
6. **Ahorros y Fondo de Emergencia**: Metas de ahorro con aportes individuales/conjuntos y calculadora automática de fondo de emergencia basada en el promedio de gastos fijos del hogar.
7. **Inversiones en Brokers (MVP)**: Registro simple de saldos y movimientos por Broker/Plataforma (depósitos, retiros, compras/ventas simples, FCI), preparado para extender a un portafolio detallado por activo en el futuro.
8. **Planificador de Flujo de Caja**: Cálculo mensual de Dinero Libre Disponible deduciendo gastos fijos, presupuestos y metas de ahorro de los ingresos proyectados.
9. **Estándar de Endpoints RESTful**: Separación estricta de métodos HTTP (`POST` para creación, `PUT`/`PATCH` para edición, `DELETE` para eliminación).

## Consecuencias

- Cobertura completa de los casos de uso financieros cotidianos de la pareja.
- Aislamiento en el esquema PostgreSQL `finanzas` con integridad referencial hacia `core`.
- Compatibilidad directa con interfaces móviles (PWA rápida) y de escritorio.
