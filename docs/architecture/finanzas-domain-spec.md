# 💰 Especificación de Dominio: Módulo de Finanzas (`finanzas`)

Este documento detalla las reglas de negocio, modelos matemáticos y contratos de endpoints para el módulo de Finanzas de **`myp-apps`**.

---

## 1. Reglas de Negocio Clave

### A. Cuentas 100% Personales
- Cada usuario registra sus propias cuentas bancarias, billeteras virtuales (MercadoPago, Ualá), efectivo o billeteras crypto.
- No existen cuentas conjuntas bancarias; la convivencia financiera se gestiona mediante la división de gastos y saldos compartidos.

### B. Gastos Compartidos (División 50/50) y Balance Continuo (Estilo Splitwise)
- Todo gasto marcado con `es_compartido = True` se divide automáticamente en una proporción del **50% (0.50)** para cada miembro del hogar.
- **Fórmula de Balance Neto**:
  $$\text{Balance Neto}(A) = \sum (\text{Gastos 50/50 pagados por } A \times 0.5) - \sum (\text{Gastos 50/50 pagados por } B \times 0.5) - \sum \text{Liquidaciones recibidas por } A + \sum \text{Liquidaciones pagadas por } A$$
  - Si $\text{Balance Neto}(A) > 0 \implies B \text{ le adeuda a } A$.
  - Si $\text{Balance Neto}(A) < 0 \implies A \text{ le adeuda a } B$.
- **Liquidación (`SETTLEMENT`)**:
  - Amortización parcial o total de la deuda acumulada mediante transferencia directa entre cuentas.
  - Actualiza automáticamente el saldo de las cuentas personales involucradas y reduce la deuda neta.
  - Formato visual limpio con 1 o 2 decimales.

### C. Categorización Ortogonal y Presupuestos Mensuales
Clasificación de gastos estructurada en dos dimensiones (Ámbito x Naturaleza):
1. **`FIXED_HOUSEHOLD`**: Gastos fijos compartidos (Alquiler, expensas, luz, gas, agua, internet, streaming del hogar).
2. **`VARIABLE_HOUSEHOLD`**: Gastos variables compartidos (Supermercado, verdulería, limpieza, farmacia, mantenimiento).
3. **`LEISURE_COUPLE`**: Ocio y salidas compartidas de pareja (Cenas, cine, teatro, escapadas).
4. **`FIXED_PERSONAL`**: Gastos fijos individuales (Gimnasio propio, cuota de celular personal, seguro de auto personal).
5. **`VARIABLE_PERSONAL`**: Gastos variables individuales (Ropa propia, almuerzos en el trabajo, hobbies personales).

### D. Lista de Compras y Descuentos Jerárquicos
- Soporte para **descuento base general del carrito** (ej. 20% bancario del día).
- Soporte para **descuento específico por producto** (ej. 15% en un queso en particular).
- **Fórmula de Precio Final**:
  $$\text{Descuento Aplicado} = \begin{cases} \text{item.descuento\_especifico} & \text{si está definido} \\ \text{lista.descuento\_general} & \text{en caso contrario} \end{cases}$$
  $$\text{Precio Final Item} = \text{precio\_unitario} \times \text{cantidad} \times \left(1 - \frac{\text{Descuento Aplicado}}{100}\right)$$
- **Checkout**: Al presionar *"Finalizar Compra"*, se genera automáticamente una transacción compartida 50/50 por el total neto pagado y se descuenta de la cuenta de pago elegida.

### E. Ingresos del Hogar y Flujo Libre Mensual
- **Registro de Sueldos e Ingresos**: Todo sueldo o ingreso percibido por un integrante del hogar se registra como una transacción con `tipo = INCOME`, asociada a su `user_id`, fecha y descripción.
- **Fórmula de Flujo Libre del Mes**:
  $$\text{Flujo Libre del Mes} = \sum \text{Ingresos del Mes} - \sum \text{Gastos del Mes (Personales + Compartidos)}$$
- Proporciona una métrica en tiempo real del dinero neto excedente o déficit del hogar tras afrontar todos los compromisos del período.

### F. Analítica Visual y Comparativa Histórica
- **Desglose Porcentual por Categoría (Pie/Donut Chart)**: Gráfico interactivo que calcula el porcentaje y monto acumulado por categoría en el período (Mes Actual, Mes Anterior, Todo el Historial).
- **Evolución Mensual Apilada (Stacked Bar Chart)**: Comparativa de barras apiladas de los gastos en ARS clasificados por categoría mes a mes (con rangos de 3, 6 y 12 meses).

### G. Calculadora de Fondo de Emergencia
- Calcula el promedio mensual de gastos fijos del hogar (`FIXED_HOUSEHOLD` + `FIXED_PERSONAL`) y calcula la meta y porcentaje de cobertura para 3 o 6 meses de protección. Plan de aportes dedicados desde la vista de ahorros.

---

## 2. Mapa de Endpoints RESTful (`/api/v1/finanzas`)

```text
/api/v1/finanzas/
├── accounts/
│   ├── GET /                   # Listar cuentas activas
│   ├── POST /                  # Crear cuenta personal
│   └── PUT /{id}               # Actualizar cuenta
├── categories/
│   ├── GET /                   # Listar categorías
│   ├── POST /                  # Crear categoría
│   └── PUT /{id}               # Editar categoría
├── budgets/
│   ├── GET /                   # Listar presupuestos con progreso mensual
│   └── POST /                  # Crear presupuesto mensual
├── transactions/
│   ├── POST /                  # Crear movimiento estándar
│   ├── POST /split             # Registrar gasto compartido 50/50
│   └── POST /settlement        # Registrar liquidación parcial/total de saldo
├── balance/
│   └── GET /couple-net         # Balance neto continuo de pareja
├── shopping/
│   ├── POST /lists             # Crear lista de compras
│   ├── GET /lists/{id}         # Detalle de lista con totales y descuentos calculados
│   ├── POST /lists/{id}/items  # Agregar ítem a la lista
│   └── POST /lists/{id}/checkout # Finalizar compra -> Genera Gasto 50/50
├── savings/
│   ├── GET /goals              # Listar metas de ahorro
│   ├── POST /goals             # Crear meta de ahorro
│   ├── POST /goals/{id}/contribute # Aportar dinero a una meta
│   └── GET /emergency-fund-calculator # Calcular fondo de emergencia sugerido
└── investments/
    ├── GET /brokers            # Listar plataformas/brokers
    ├── POST /brokers           # Registrar broker
    └── POST /brokers/{id}/transactions # Registrar movimiento en broker
```
