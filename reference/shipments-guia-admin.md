# Guía de Administración — Shipments ERP

Esta guía cubre los módulos de Japón, envíos, finanzas, Dashboard y Configuración.

---

## Módulos Japón

### Registro de Compras

Libro maestro de todas las compras realizadas en Japón.

#### Registrar una compra

1. Hacer clic en **"Nueva Compra"**.
2. Completar los campos:
   - **Fecha** — Fecha de compra
   - **Tipo** — Producto, Arriendo/App, etc.
   - **Nombre** — Nombre del producto
   - **EAN** — Código de barras (opcional)
   - **Tarjeta** — Método de pago utilizado
   - **Precio Unitario** — Precio en ¥
   - **Cantidad** — Unidades compradas
   - **Tipo de Cambio** — TC ¥→CLP del momento
3. Confirmar. El sistema asigna automáticamente el siguiente SKU correlativo (JP-0001, JP-0002, etc.).

#### Filtros disponibles
- Por estado de pago: Por pagar, Esperando pago, Pagado
- Por ubicación: Japón, Tránsito, Chile

### Boletas

Generación de boletas agrupando productos para cobro.

#### Generar una boleta

1. Hacer clic en **"Generar Boleta"**.
2. Seleccionar productos con los checkboxes. Ajustar cantidad si es necesario.
3. Configurar la comisión (default 13%).
4. Ingresar el tipo de cambio actual.
5. Revisar los totales calculados:
   - Subtotal ¥ = suma de (precio × cantidad)
   - Total ¥ = subtotal × (1 + comisión/100)
   - Total CLP = total ¥ / TC
6. Confirmar. La boleta se crea con estado "sin pagar".

#### Ver detalle
Hacer clic en cualquier fila de la tabla para ver los line items de la boleta.

### Confirmar Pagos

Registro de transferencias bancarias contra boletas pendientes.

#### Confirmar un pago

1. Seleccionar la boleta pendiente de la lista.
2. Completar:
   - **Cuenta bancaria** — Seleccionar del dropdown
   - **Fecha de transferencia**
   - **Monto CLP** — Monto transferido
3. Confirmar. El sistema actualiza:
   - Boleta → estado "pagado"
   - Compras relacionadas → estado "pagado"

### Gastos Fijos Japón

Gastos recurrentes mensuales: arriendo bodega (¥25.000) y App Beyblade (¥550).

#### Generar boleta mensual

1. Verificar que no exista boleta GAV del mes actual.
2. Hacer clic en **"Generar Boleta"**.
3. El sistema crea una boleta con ID formato `BOL-YYYY-GAV-NNN`.

**Alerta:** Si es día 3 o posterior del mes y no se ha generado la boleta, aparece una alerta amarilla tanto aquí como en el Dashboard.

---

## Módulos de Envíos

### Cajas / Envíos

Creación y seguimiento de cajas de envío de Japón a Chile.

#### Crear una caja

1. Hacer clic en **"Nueva Caja"**.
2. Ingresar nombre único (ej: "Caja_1_Abr26").
3. Configurar costos:
   - **Flete UPS** — Costo en ¥
   - **Horas MO** — Horas de mano de obra
   - **Tarifa MO** — CLP por hora
   - **Materiales** — Costo en ¥
   - **Tipo de Cambio**
4. Seleccionar productos desde Bodega Japón:
   - Solo aparecen productos con unidades disponibles
   - Ajustar cantidad (máximo = disponible)
5. Confirmar. La caja se crea en estado "en tránsito".

#### Estados de una caja
| Estado | Significado | Acciones |
|--------|-------------|----------|
| ✈️ En tránsito | Viajando a Chile | Ver, Editar, Eliminar |
| 📦 Llegada | Llegó a Chile | Ver, Hacer Costeo, Eliminar |
| ✅ Costeada | Costeo completado | Ver |

### Internación

Registro de costos aduaneros al llegar la caja a Chile.

#### Registrar internación

1. Seleccionar la caja de la lista.
2. Ingresar:
   - **Arancel CIF** — Monto en CLP
   - **IVA pagado en aduana** — Monto en CLP (se registra como IVA Crédito Fiscal)
3. Guardar.

### Costeo de Cajas

Distribución de costos entre los productos de una caja para calcular el costo unitario.

#### Realizar costeo

1. Seleccionar una caja en estado "llegada".
2. Para cada producto, asignar el **% de costos** que le corresponde.
3. Verificar que la suma de porcentajes sea exactamente 100%.
   - Si no suma 100%, el botón de confirmar está deshabilitado y la suma se muestra en rojo.
4. Revisar el costo unitario calculado para cada producto.
5. Confirmar costeo.

Al confirmar:
- Se crean entradas en Bodega Chile con el costo unitario calculado
- La caja pasa a estado "costeada"
- Los productos sin unidades restantes en Japón actualizan su ubicación a "chile"

#### Fórmula de costo unitario
```
costoUnit = (subtotalCLP × %/100 + fleteCLP × %/100 + moCLP × %/100
             + matCLP × %/100 + internCLP × %/100) / cantidad
```

---

## Módulos Financieros

### Estado de Resultados

Muestra la rentabilidad del negocio de importación.

#### Estructura
```
  Ingresos (ventas por canal)
− Costo de Venta
= Margen Bruto
− GAV Japón (solo pagado)
− GAV Chile (solo pagado)
= EBIT (Resultado Operacional)
+ IVA Crédito Fiscal
= Resultado Neto
```

**Importante:** Solo se incluyen gastos con estado "pagado". Los gastos pendientes no afectan el cálculo.

Los ingresos se desglosan por canal de venta: Instagram, TikTok, Mercado Libre, Web y Local.

### Balance General

Muestra la posición financiera del negocio.

#### Estructura
- **Activos:**
  - Caja estimada (ingresos − egresos pagados)
  - Inventario Chile (cantidad × costo unitario)
  - Inventario Japón (precio ¥ × cantidad / TC)
  - IVA Crédito Fiscal (internaciones + facturas locales)
- **Pasivos:**
  - Boletas sin pagar (total CLP)
- **Patrimonio:** Activos − Pasivos

### Flujo de Caja

Muestra el movimiento de efectivo.

#### Estructura
- **Ingresos:** Total de ventas
- **Egresos Japón:** Boletas pagadas (CLP)
- **Egresos Chile:** GAV Chile pagado + Compras locales pagadas
- **Flujo Neto:** Ingresos − Egresos Japón − Egresos Chile

El flujo neto se destaca en verde si es positivo, rojo si es negativo.

---

## Dashboard

Panel principal con visión general del negocio.

### KPIs mostrados
1. **Productos en Japón** — SKUs con unidades disponibles
2. **Cajas en Tránsito** — Cajas en estado "transito"
3. **Cajas Llegadas** — Cajas en estado "llegada"
4. **Unidades en Chile** — Total de unidades en Bodega Chile
5. **Boletas Pendientes** — Boletas con estado "sin pagar"
6. **Ventas del Mes** — Total CLP de ventas del mes actual
7. **Margen Promedio** — Promedio de margen % de todas las ventas

### Timeline visual
Muestra el flujo de inventario en 3 etapas con conteo de unidades:
- Japón → Tránsito → Chile

### Alerta GAV
Si es día 3 o posterior del mes y no se ha generado la boleta de gastos fijos Japón, aparece una alerta amarilla.

---

## Configuración

Parámetros del sistema accesibles solo para el rol Admin.

### Métodos de Pago
10 slots editables. El slot 0 ("Efectivo") es fijo. Los demás se pueden personalizar (JCB Bandai, Rakuten, PayPay, View Card, etc.).

### Cuentas Bancarias
3 cuentas con los campos:
- Titular
- RUT
- Banco
- Tipo de cuenta
- Número de cuenta

### Parámetros
- **Arriendo Bodega JP** — Monto mensual en ¥
- **App Beyblade** — Monto mensual en ¥
- **Comisión %** — Porcentaje de comisión para boletas

Hacer clic en **"Guardar"** para aplicar los cambios. Los cambios se reflejan inmediatamente en todos los módulos que usan estos parámetros.
