# 0002. Diseño de Dominio y Lógica de Negocio para el Módulo de Finanzas

* **Estado**: Aceptado
* **Fecha**: 2026-08-31 (Actualizado: 2026-09-12)
* **Contexto**: `myp-apps` (Módulo `finanzas` & `core`)

## Contexto y Declaración del Problema

Se requiere modelar y especificar el dominio financiero para una pareja en convivencia (Pablo y Martu). La solución debe permitir trackear ingresos, gastos personales y compartidos (imputación 50/50), automapeo inteligente de palabras clave, listas de compras con descuentos de supermercado, balances de deudas estilo Splitwise, liquidaciones de reintegros, metas de ahorro con fondo de emergencia, flujo de caja mensual y gestión visual de categorías y avatares de usuario.

## Decisiones Principales

1. **Cuentas 100% Personales**: Cada usuario registra sus cuentas bancarias, billeteras virtuales, efectivo y brokers. No existen cuentas bancarias conjuntas.
2. **Gastos Compartidos y Balance en Tiempo Real**: Todo gasto compartido se divide 50/50 de forma fija. El sistema calcula en tiempo real el balance neto (`Quién le debe a quién`) y permite registrar transacciones de tipo `SETTLEMENT` (Liquidaciones parciales o totales) para amortizar deudas. En convivencias de 2 miembros, la modal de liquidación auto-selecciona al usuario logueado como Emisor y al otro como Destinatario.
3. **Imputación Proporcional 50/50 en Vista Individual**: La vista individual de un integrante imputa los gastos personales al 100% y los gastos compartidos exactamente al 50%, recalculando el Flujo Libre del Mes e incorporando la card inline de Reintegros / Devoluciones (`Pagado - Ingresado`).
4. **Categorización Ortogonal y Bloques de Color**: Clasificación por Tipo (`FIXED_HOUSEHOLD`, `VARIABLE_HOUSEHOLD`, `LEISURE_COUPLE`, `FIXED_PERSONAL`, `VARIABLE_PERSONAL`) marcada como `🔒 Reglas de Sistema Fijas`. Las categorías se identifican por bloques de color hex personalizados.
5. **Automapeo Inteligente por Palabras Clave (`CategoryMapping`)**: Gestor avanzado en `HogarPage.tsx` con operaciones CRUD completas (`GET`, `POST`, `PUT`, `DELETE /category-mappings/{id}`), buscador, filtro por categoría y tipo de gasto, y ordenamiento dinámico. Integra sugerencias en el formulario de nuevos movimientos.
6. **Configuración de Avatares de Usuario**: Habilitada la actualización del color de avatar de usuario (`PUT /api/v1/core/users/{id}`) en `HogarPage.tsx` para mostrar distintivos circulares con iniciales ("P", "M") configurables.
7. **Diseño Visual Ampliado (1920x1080)**: Ancho de contenedor extendido a `max-w-[1750px]` en toda la SPA React para aprovechar pantallas de alta resolución.
8. **Lista de Compras con Descuentos Jerárquicos**: Soporte para descuento general del carrito con sobreescritura por descuento específico de producto, convirtiendo automáticamente la compra finalizada en un Gasto Compartido 50/50.

## Consecuencias

- Cobertura completa y fluida de los casos de uso financieros cotidianos de la pareja.
- Aislamiento modular en el esquema PostgreSQL `finanzas` e `core` con 100% de pruebas unitarias pasando.
- Experiencia de usuario optimizada en pantallas de 1920x1080 con navegación rápida y personalización visual.
