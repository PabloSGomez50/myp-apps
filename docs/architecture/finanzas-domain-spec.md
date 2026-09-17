# 💰 Especificación de Dominio: Módulo de Finanzas (`finanzas`) & Core

Este documento detalla las reglas de negocio, modelos matemáticos y contratos de endpoints para el módulo de Finanzas e Identidad de **`myp-apps`**.

---

## 1. Reglas de Negocio Clave

### A. Cuentas 100% Personales
- Cada usuario registra sus propias cuentas bancarias, billeteras virtuales (MercadoPago, Ualá), efectivo o billeteras crypto.
- No existen cuentas conjuntas bancarias; la convivencia financiera se gestiona mediante la división de gastos y saldos compartidos.

### B. Gastos Compartidos (División 50/50), Imputación Proporcional y Balance Continuo
- Todo gasto marcado con `es_compartido = True` se divide automáticamente en una proporción del **50% (0.50)** para cada miembro del hogar.
- **Vista Hogar Completo (`ALL`)**: Muestra montos consolidados al 100% en un grid de 3 métricas.
- **Vista Individual (`Solo Integrante`)**:
  - Gastos Personales (`es_compartido = False`): Imputan al **100%** únicamente al integrante que pagó.
  - Gastos Compartidos (`es_compartido = True`): Imputan el **50%** de su monto al integrante.
  - Card de **Reintegros / Devoluciones (Mes)**: Muestra la métrica neta ($\text{Pagado} - \text{Ingresado}$).
- **Fórmula de Balance Neto (Splitwise)**:
  $$\text{Balance Neto}(A) = \sum (\text{Gastos 50/50 pagados por } A \times 0.5) - \sum (\text{Gastos 50/50 pagados por } B \times 0.5) - \sum \text{Liquidaciones recibidas por } A + \sum \text{Liquidaciones pagadas por } A$$
- **Liquidación (`SETTLEMENT`)**:
  - Amortización de deuda mediante transferencia directa. En convivencias de 2 miembros, la modal asigna automáticamente al usuario logueado como Emisor y al otro como Destinatario.

### C. Categorización Ortogonal y Reglas Fijas del Sistema
Clasificación estructurada en dos dimensiones (Ámbito x Naturaleza) identificadas como `🔒 Reglas de Sistema Fijas`:
1. **`FIXED_HOUSEHOLD`**: Gastos fijos compartidos (Alquiler, expensas, luz, gas, agua, internet). Divididos 50/50.
2. **`VARIABLE_HOUSEHOLD`**: Gastos variables compartidos (Supermercado, verdulería, limpieza, farmacia). Divididos 50/50.
3. **`LEISURE_COUPLE`**: Ocio y salidas compartidas de pareja (Cenas, cine, viajes juntos). Divididos 50/50.
4. **`FIXED_PERSONAL`**: Gastos fijos individuales (Gimnasio propio, celular personal). 100% individual.
5. **`VARIABLE_PERSONAL`**: Gastos variables individuales (Ropa propia, hobbies). 100% individual.

### D. Reglas de Automapeo Inteligente (`CategoryMapping`)
- Permite vincular palabras clave o patrones (ej. `coto`, `rapanui`, `edesur`) con categorías específicas.
- Gestor interactivo en `HogarPage.tsx` con buscador por texto, filtro por categoría/tipo de gasto, ordenamiento y operaciones CRUD completas (`GET`, `POST`, `PUT`, `DELETE`).
- Integrado con la modal de movimientos para mostrar sugerencias cliqueables y auto-seleccionar la categoría al escribir un concepto.

### E. Avatares de Usuario e Iniciales Configurables
- Cada usuario cuenta con un color avatar configurable (`color_avatar`) en `HogarPage.tsx` exibiendo su inicial ("P" para Pablo, "M" para Martu) para personalizar badges en toda la SPA.

---

## 2. Mapa de Endpoints RESTful (`/api/v1/finanzas` & `/api/v1/core`)

```text
/api/v1/core/
├── users/
│   └── PUT /{id}               # Actualizar perfil de usuario (nombre, color_avatar)
├── household/
│   ├── GET /                   # Obtener detalle del hogar y miembros
│   └── POST /members           # Agregar o pre-registrar miembro al hogar

/api/v1/finanzas/
├── accounts/
│   ├── GET /                   # Listar cuentas activas
│   ├── POST /                  # Crear cuenta personal
│   └── PUT /{id}               # Actualizar cuenta
├── categories/
│   ├── GET /                   # Listar categorías
│   ├── POST /                  # Crear categoría con color
│   ├── PUT /{id}               # Editar categoría
│   └── DELETE /{id}            # Deshabilitar categoría suavemente
├── category-mappings/
│   ├── GET /                   # Listar reglas de automapeo
│   ├── POST /                  # Crear regla de automapeo
│   ├── PUT /{id}               # Editar regla de automapeo
│   └── DELETE /{id}            # Eliminar regla de automapeo
├── transactions/
│   ├── POST /                  # Crear movimiento estándar
│   ├── POST /split             # Registrar gasto compartido 50/50
│   ├── POST /settlement        # Registrar liquidación parcial/total de saldo
│   └── POST /bulk-delete       # Borrado masivo por filtros aplicados
```
