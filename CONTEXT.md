# 📖 Glosario de Dominio & Lenguaje Ubicuo (`myp-apps`)

Este glosario establece las definiciones formales del vocabulario utilizado en el diseño, código, base de datos e interfaces de **`myp-apps`**.

---

### 🏠 Núcleo y Convivencia (`core`)

- **Hogar (`Household`)**: Espacio o entidad compartida que agrupa a los convivientes (Pablo y Martu). Define la moneda principal base (ej. `ARS`, `USD`) y la configuración general.
- **Miembro (`HouseholdMember`)**: Vínculo entre un usuario y un hogar, con un rol asignado (`ADMIN` o `MEMBER`).
- **Conmutación por PIN (`PIN Profile Switch`)**: Mecanismo ágil de autenticación que permite cambiar el perfil activo en un dispositivo compartido (móvil en el súper, tablet en la cocina) validando un PIN de 4 dígitos sin requerir reingresar credenciales completas.

---

### 💰 Finanzas y Cuentas (`finanzas`)

- **Cuenta Personal (`Account`)**: Billetera, cuenta bancaria, fintech (MercadoPago, Ualá), efectivo o wallet crypto perteneciente al **100% a un único usuario**. No existen cuentas bancarias conjuntas.
- **Gasto Individual (`Personal Expense`)**: Transacción asumida en su totalidad por el usuario que la realiza (`es_compartido = False`).
- **Gasto Compartido (`Shared Expense 50/50`)**: Transacción asumida en partes iguales por ambos miembros del hogar (`es_compartido = True`, `split_ratio = 0.50`). Quien lo paga genera un crédito del 50% a su favor adeudado por el otro miembro.
- **Balance Continuo (`Couple Net Balance`)**: Estado de cuenta neto en tiempo real (estilo Splitwise) que calcula la diferencia entre lo que cada miembro pagó en gastos compartidos.
- **Liquidación (`Settlement`)**: Transferencia de dinero (total o parcial) de un miembro hacia el otro para amortizar o dejar en cero la deuda del balance continuo, descontando y sumando de sus respectivas cuentas personales.

---

### 🏷️ Clasificación y Presupuestos

- **Categorización Ortogonal (`ExpenseType`)**: Matriz de clasificación de gastos que cruza Ámbito (Hogar vs Personal) con Naturaleza (Fijo vs Variable):
  - `FIXED_HOUSEHOLD`: Gastos fijos compartidos del hogar (Alquiler, expensas, luz, gas, agua, internet, streaming familiar).
  - `VARIABLE_HOUSEHOLD`: Gastos variables compartidos del hogar (Supermercado, verdulería, limpieza, farmacia, mantenimiento).
  - `LEISURE_COUPLE`: Ocio y salidas compartidas de pareja (Cenas, cine, viajes juntos).
  - `FIXED_PERSONAL`: Gastos fijos individuales (Gimnasio propio, cuota de celular personal, seguro personal).
  - `VARIABLE_PERSONAL`: Gastos variables individuales (Ropa propia, almuerzos en el trabajo, salidas con amigos, hobbies).
- **Presupuesto Mensual (`Budget`)**: Límite de gasto mensual asignado a una categoría con seguimiento de porcentaje consumido.

---

### 🛒 Compras y Ahorros

- **Descuento Jerárquico (`Hierarchical Discount`)**: Regla de cálculo de promociones de compra en la que un ítem aplica su descuento específico individual si existe; de lo contrario, hereda el descuento base general del carrito (ej. 20% bancario del día).
- **Fondo de Emergencia (`Emergency Fund`)**: Meta de ahorro calculada en base al promedio de gastos fijos del hogar (`FIXED_HOUSEHOLD` + `FIXED_PERSONAL`) para cubrir entre 3 y 6 meses de contingencias.
- **Ingreso / Sueldo (`Income / Salary`)**: Transacción con `tipo = INCOME` abonada a la cuenta o billetera de un integrante específico del hogar para alimentar el flujo financiero disponible del período.
- **Flujo Libre del Mes (`Monthly Free Cashflow`)**: Margen financiero sobrante o déficit real calculado automáticamente en tiempo real ($\text{Total Ingresos del Mes} - \text{Total Gastos del Mes}$).
- **Analítica Visual de Gastos (`Category Expense Analytics`)**: Conjunto de widgets de visualización con `recharts` que incluyen desgloses porcentuales por categoría (Pie Chart) y evoluciones mensuales apiladas (Stacked Bar Chart).
- **Broker (`Investment Broker`)**: Registro simplificado de saldos y movimientos en plataformas de inversión (ej. IOL, Balanz, Binance) en ARS, USD y Crypto.
