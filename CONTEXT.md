# 📖 Glosario de Dominio & Lenguaje Ubicuo (`myp-apps`)

Este glosario establece las definiciones formales del vocabulario utilizado en el diseño, código, base de datos e interfaces de **`myp-apps`**.

---

### 🏠 Núcleo y Convivencia (`core`)

- **Hogar (`Household`)**: Espacio o entidad compartida que agrupa a los convivientes (Pablo y Martu). Define la moneda principal base (ej. `ARS`, `USD`) y la configuración general.
- **Miembro (`HouseholdMember`)**: Vínculo entre un usuario y un hogar, con un rol asignado (`ADMIN` o `MEMBER`).
- **Avatar de Usuario (`User Avatar & Initial Badge`)**: Representación visual de cada integrante con su inicial en mayúscula ("P" para Pablo, "M" para Martu) y un color identificador configurable desde `HogarPage.tsx` (`color_avatar`).
- **Conmutación por PIN (`PIN Profile Switch`)**: Mecanismo ágil de autenticación que permite cambiar el perfil activo en un dispositivo compartido (móvil en el súper, tablet en la cocina) validando un PIN de 4 dígitos sin requerir reingresar credenciales completas.

---

### 💰 Finanzas y Cuentas (`finanzas`)

- **Cuenta Personal (`Account`)**: Billetera, cuenta bancaria, fintech (MercadoPago, Ualá), efectivo o wallet crypto perteneciente al **100% a un único usuario**. No existen cuentas bancarias conjuntas.
- **Gasto Individual (`Personal Expense`)**: Transacción asumida en su totalidad por el usuario que la realiza (`es_compartido = False`).
- **Gasto Compartido (`Shared Expense 50/50`)**: Transacción asumida en partes iguales por ambos miembros del hogar (`es_compartido = True`, `split_ratio = 0.50`). Quien lo paga genera un crédito del 50% a su favor adeudado por el otro miembro.
- **Vista de Alcance / Scope (`Hogar Completo vs Solo [Integrante]`)**: Toggle de visualización en el Dashboard de Finanzas:
  - `Hogar Completo`: Consolida el 100% de ingresos y gastos del hogar en un grid de 3 métricas.
  - `Solo [Integrante]`: Imputa los gastos personales al 100% y los gastos compartidos al 50% en un grid de 4 métricas, incluyendo la card de Reintegros / Devoluciones (`Pagado - Ingresado`).
- **Balance Continuo (`Couple Net Balance`)**: Estado de cuenta neto en tiempo real (estilo Splitwise) que calcula la diferencia entre lo que cada miembro pagó en gastos compartidos.
- **Liquidación (`Settlement`)**: Transferencia de dinero (total o parcial) de un miembro hacia el otro para amortizar o dejar en cero la deuda del balance continuo. En convivencias de 2 miembros, la modal auto-selecciona al usuario activo como Emisor y al otro integrante como Destinatario.

---

### 🏷️ Clasificación, Automapeo y Presupuestos

- **Categoría (`Category`)**: Agrupación de gastos con un nombre, tipo de gasto ortogonal y un distintivo bloque de color identificador (ej. verde para supermercado, morado para ocio).
- **Tipos de Gastos Ortogonales (`ExpenseType`)**: Matriz de 5 tipos de gastos fija en el sistema (`🔒 Reglas de Sistema Fijas`) que cruza Ámbito (Hogar vs Personal) con Naturaleza (Fijo vs Variable):
  - `FIXED_HOUSEHOLD`: Gastos fijos compartidos del hogar (Alquiler, expensas, luz, gas, agua, internet). Divididos 50/50.
  - `VARIABLE_HOUSEHOLD`: Gastos variables compartidos del hogar (Supermercado, verdulería, limpieza, farmacia). Divididos 50/50.
  - `LEISURE_COUPLE`: Ocio y salidas compartidas de pareja (Cenas, cine, viajes juntos). Divididos 50/50.
  - `FIXED_PERSONAL`: Gastos fijos individuales (Gimnasio propio, celular personal). 100% individual.
  - `VARIABLE_PERSONAL`: Gastos variables individuales (Ropa propia, hobbies). 100% individual.
- **Regla de Automapeo (`CategoryMapping`)**: Patrón de palabras clave que asigna automáticamente una categoría al importar CSVs o ingresar conceptos en el formulario de movimientos. Cuenta con gestor interactivo (CRUD), buscador, filtro por categoría/tipo y ordenamiento.
- **Presupuesto Mensual (`Budget`)**: Límite de gasto mensual asignado a una categoría con seguimiento de porcentaje consumido.

---

### 🛒 Compras, Analítica y Ahorros

- **Descuento Jerárquico (`Hierarchical Discount`)**: Regla de cálculo de promociones de compra en la que un ítem aplica su descuento específico individual si existe; de lo contrario, hereda el descuento base general del carrito.
- **Flujo Libre del Mes (`Monthly Free Cashflow`)**: Margen financiero sobrante o déficit real calculado en tiempo real ($\text{Total Ingresos} - \text{Total Gastos Imputables}$).
- **Evolución Mensual de Gastos (`Category Bar Chart`)**: Gráfico comparativo por categoría ordenado de mayor a menor volumen de gasto con toggle en tiempo real entre **Barras Apiladas (Stacked)** y **Barras Agrupadas (Grouped)**.
- **Fondo de Emergencia (`Emergency Fund`)**: Meta de ahorro calculada en base al promedio de gastos fijos del hogar (`FIXED_HOUSEHOLD` + `FIXED_PERSONAL`).

---

### 📈 Inversiones y Ahorros (`Fase 5 - ADR 0003`)

- **Meta de Ahorro (`SavingsGoal`)**: Objetivo financiero con monto objetivo, monto acumulado, fecha límite y ámbito (Personal o Compartido del Hogar).
- **Aporte a Meta (`GoalContribution`)**: Depósito realizado hacia una meta de ahorro que se deduce del Flujo Disponible del Mes como dinero comprometido para reserva.
- **Broker / Entidad de Inversión (`Broker`)**: Entidad financiera personal (Balanz, IOL, Lemon, Mercado Pago, etc.) que administra tenencias en ARS, USD y Crypto de forma independiente a las cuentas bancarias para evitar desfasajes.
- **Movimiento de Broker (`BrokerTransaction`)**: Registro de depósito, rescate, compra/venta de activo o suscripción/rescate de Fondo Común de Inversión (FCI).
- **Histórico de Cotizaciones (`CurrencyQuote`)**: Registro temporal de la cotizaciones de divisas y crypto (ej. `USD_MEP`, `USD_BLUE`, `USDT`, `BTC`) para calcular la valorización consolidada del portafolio.
