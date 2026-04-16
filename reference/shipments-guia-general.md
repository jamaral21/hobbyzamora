# Guía General — Shipments ERP

## Resumen

El módulo Shipments ERP de HobbyZamora gestiona el ciclo completo de importación de productos desde Japón a Chile. Cubre desde el registro de compras hasta la venta final, incluyendo logística, internación aduanera, costeo y estados financieros.

---

## Flujo de importación

```
Compra Japón → Boleta + Pago → Crear Caja → Tránsito ✈️
  → Internación 🛃 → Costeo ⚖️ → Bodega Chile 🏪 → Venta 💰
```

### Etapas detalladas

1. **Compra en Japón** — Se registra cada producto con precio en ¥, cantidad y método de pago. El sistema asigna un SKU único automáticamente.
2. **Boleta y Pago** — Se genera una boleta agrupando productos. La boleta incluye comisión (default 13%) y conversión a CLP. El pago se confirma por separado.
3. **Crear Caja** — Se seleccionan productos disponibles en Japón y se agrupan en una caja con costos de flete, mano de obra y materiales.
4. **Tránsito** — La caja viaja de Japón a Chile. Los productos quedan en estado "en tránsito".
5. **Internación** — Al llegar a Chile, se registran los costos de aduana: arancel CIF e IVA (crédito fiscal).
6. **Costeo** — Se distribuyen todos los costos (producto, flete, MO, materiales, internación) entre los productos de la caja para obtener el costo unitario en CLP.
7. **Bodega Chile** — Los productos costeados quedan disponibles para venta con su costo unitario calculado.
8. **Venta** — Se registra la venta indicando canal, cantidad y precio. El stock se descuenta automáticamente.

### Reglas fundamentales

- El pago es independiente del envío. Un producto puede enviarse antes de ser pagado.
- La cantidad original de compra (`cant`) nunca se modifica por movimientos de caja.
- El SKU es el identificador único que acompaña al producto en todo el ciclo.

---

## Sistema de SKU

Cada producto recibe un SKU único al registrarse: `JP-0001`, `JP-0002`, etc.

| Etapa | Dónde aparece |
|-------|---------------|
| Registro de compra | `compras.sku` |
| Crear caja | `caja.productos._sku` |
| Costeo | Datos de costeo |
| Bodega Chile | `stockChile._sku` |

El SKU permite rastrear un producto desde su compra en Japón hasta su venta en Chile, sin depender del nombre ni del código EAN.

### Disponibilidad

La función `calcDisponibleBySku(sku)` calcula cuántas unidades están disponibles en Japón:

```
disponible = cantidad comprada − unidades en cajas activas − unidades en Chile
```

---

## Roles y permisos

El sistema tiene 4 roles con acceso diferenciado:

### Admin
Acceso completo a los 19 módulos. Puede configurar el sistema, ver estados financieros y operar todos los módulos.

### Japón
Acceso a los módulos de operación en Japón:
- Registro de Compras
- Boletas
- GAV Japón
- Cajas / Envíos

### Chile
Acceso a los módulos de operación en Chile y logística:
- Dashboard, Bodega Japón, Bodega Tránsito
- Bodega Chile, Ventas, Compras Locales
- Cajas, Compras Web, Internación, Costeo

### Contador
Acceso a módulos financieros y de control:
- Dashboard
- Estado de Resultados, Balance, Flujo de Caja
- GAV Chile, GAV Japón

---

## Módulos por sección (19 total)

### Sección Japón (5 módulos)
| Módulo | Descripción |
|--------|-------------|
| Registro de Compras | Libro de compras con SKU auto-asignado |
| Bodega Japón | Inventario disponible en Japón |
| Boletas | Generación de boletas con comisión |
| Confirmar Pagos | Registro de transferencias por boleta |
| Gastos Fijos Japón | Arriendo bodega + App Beyblade (¥/mes) |

### Sección Envíos (5 módulos)
| Módulo | Descripción |
|--------|-------------|
| Cajas / Envíos | Creación y seguimiento de cajas |
| Bodega Tránsito | Productos entre Japón y Chile |
| Compras Web | Pedidos de Amazon JP, Rakuten, etc. |
| Internación | Arancel + IVA Crédito Fiscal en aduana |
| Costeo de Cajas | Distribución de costos por producto |

### Sección Chile (4 módulos)
| Módulo | Descripción |
|--------|-------------|
| Bodega Chile | Inventario disponible para venta |
| Ventas | Registro de ventas con descuento de stock |
| Compras Locales | Gastos operacionales en Chile |
| Gastos Fijos Chile | GAV Chile con comprobante obligatorio |

### Sección Finanzas (3 módulos)
| Módulo | Descripción |
|--------|-------------|
| Estado de Resultados | Ingresos − Costos − GAV + IVA Crédito |
| Balance General | Activos, Pasivos y Patrimonio |
| Flujo de Caja | Ingresos y egresos operacionales |

### Sección Principal (2 módulos)
| Módulo | Descripción |
|--------|-------------|
| Dashboard | KPIs, alertas y timeline visual |
| Configuración | Métodos de pago, cuentas, parámetros |
