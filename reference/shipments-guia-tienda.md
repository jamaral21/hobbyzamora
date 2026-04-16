# Guía de Tienda — Shipments ERP

Esta guía cubre los módulos de operación en Chile: Bodega Chile, Ventas, Compras Locales y Gastos Fijos Chile.

---

## Bodega Chile

Muestra el inventario disponible para venta con costo unitario y margen.

### Columnas de la tabla
- **SKU** — Identificador del producto (JP-XXXX)
- **Nombre** — Nombre del producto
- **EAN** — Código de barras
- **Caja** — Caja de origen
- **Cantidad** — Unidades disponibles
- **Costo Unitario** — Costo en CLP calculado por costeo
- **Precio Venta** — Precio editable en CLP
- **Margen %** — Calculado automáticamente

### Editar precio de venta

1. Hacer clic en el campo "Precio Venta" del producto deseado.
2. Ingresar el nuevo precio en CLP.
3. El margen se recalcula automáticamente al cambiar el precio.

### Indicadores de margen

El margen se muestra con colores según rentabilidad:
- **Verde** (> 30%) — Margen saludable
- **Naranja** (15% – 30%) — Margen aceptable
- **Rojo** (< 15%) — Margen bajo, revisar precio

### KPIs
- Unidades totales en bodega
- Valor total del inventario (a costo)
- Productos sin precio de venta asignado

---

## Ventas

Registro de ventas por canal con descuento automático de stock.

### Registrar una venta

1. Hacer clic en **"Nueva Venta"**.
2. Seleccionar el producto desde el dropdown (muestra solo productos con stock > 0).
3. Ingresar la cantidad (no puede superar el stock disponible).
4. Ingresar el precio de venta en CLP.
5. Seleccionar el canal de venta:
   - Instagram
   - TikTok
   - Mercado Libre
   - Web
   - Local
6. Confirmar la venta.

Al confirmar, el sistema:
- Crea el registro de venta con el costo unitario del stock
- Descuenta la cantidad vendida del inventario en Bodega Chile
- Calcula el total como `precio × cantidad`

### Columnas de la tabla
- ID, Fecha, Producto, Cantidad, Precio Venta, Costo, Total, Canal

---

## Compras Locales

Registro de compras y gastos operacionales realizados en Chile.

### Registrar una compra local

1. Hacer clic en **"Nueva Compra"**.
2. Seleccionar el tipo:
   - **Producto** — Compra de mercadería para venta
   - **Gasto** — Gasto operacional (envíos, publicidad, etc.)
3. Seleccionar tipo de documento:
   - **Factura** — Muestra campo de IVA, se marca como crédito fiscal
   - **Boleta** — Sin IVA separado
4. Completar: proveedor, descripción, monto CLP.
5. Seleccionar estado: pagado o pendiente.
6. Confirmar.

### IVA Crédito Fiscal
Cuando el documento es factura, el IVA se registra por separado y aparece como IVA Crédito en el Estado de Resultados.

---

## Gastos Fijos Chile (GAV Chile)

Gastos recurrentes mensuales con comprobante obligatorio.

### Conceptos típicos
- Arriendo bodega Chile
- Contador
- Cuenta corriente
- POS
- Comisión web

### Confirmar un gasto

1. Verificar que el gasto tiene comprobante adjunto (indicador en la columna "Comprobante").
2. Si no tiene comprobante, marcar el adjunto primero.
3. Hacer clic en **"Confirmar"**.
4. El estado cambia a "pagado" con la fecha actual.

**Importante:** No se puede confirmar un gasto sin comprobante. El sistema muestra un error y resalta el campo en rojo si se intenta confirmar sin adjunto.

### Impacto en finanzas
Solo los gastos con estado "pagado" se incluyen en el Estado de Resultados. Los gastos pendientes no afectan los cálculos financieros.
