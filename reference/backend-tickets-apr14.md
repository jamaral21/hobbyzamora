# Tickets Backend — HobbyZamora (14 Abril 2026)

**Stack:** Express + TypeScript + Prisma + SQLite/PostgreSQL  
**Estado:** El frontend ya está implementado y esperando estos endpoints  
**NO incluye:** Shipments ERP (ver `reference/shipments-backend-tickets.md`)

---

## A. Panel de Ventas — Poder filtrar por producto

**Contexto:** Hoy el admin ve las ventas totales en el dashboard, pero no puede filtrar por un producto específico. Si vendió 19 unidades de un Beyblade, tiene que revisar pedido por pedido para saber a quién le vendió cada una. Necesitamos que el dashboard se pueda filtrar por uno o varios productos (buscando por EAN o nombre), y que los KPIs, gráfico, y lista de ventas se recalculen mostrando solo esos productos.

---

### TICKET-001: Buscador de productos para el filtro del dashboard

**¿Qué hace?** Permite buscar productos por nombre, EAN o SKU desde el dashboard para seleccionarlos como filtro.

**¿Por qué?** El frontend tiene un combobox de búsqueda que necesita un endpoint para buscar productos mientras el admin escribe.

**Endpoint:** `GET /api/products/search?q=pokemon&limit=20`  
**Auth:** Solo ADMIN y STAFF  
**Retorna:** Lista de productos `[{ id, name, sku, ean }]`, máximo 20, solo productos activos.

---

### TICKET-002: Filtrar KPIs del dashboard por productos seleccionados

**¿Qué hace?** Cuando el admin selecciona productos en el filtro, los KPIs (Ventas, Costos, Margen) se recalculan mostrando solo datos de esos productos.

**¿Por qué?** Hoy los KPIs siempre muestran el total. Si quiero saber cuánto vendí de un producto específico, no puedo.

**Endpoint:** `GET /api/analytics/dashboard` (ya existe)  
**Cambio:** Agregar param opcional `productIds=uuid1,uuid2`. Cuando está presente, calcular totales solo desde los items de esos productos. Cuando no está, funciona igual que hoy.

---

### TICKET-003: Filtrar gráfico de ventas por productos seleccionados

**¿Qué hace?** El gráfico de ventas diarias se filtra para mostrar solo el revenue de los productos seleccionados.

**¿Por qué?** Si selecciono un producto, quiero ver su tendencia de ventas en el tiempo, no la de toda la tienda.

**Endpoint:** `GET /api/analytics/sales-chart` (ya existe)  
**Cambio:** Agregar param opcional `productIds=uuid1,uuid2`. Siempre retornar una entrada por día (incluso si hay 0 ventas ese día).

---

### TICKET-004: Filtrar lista de pedidos por productos seleccionados

**¿Qué hace?** La lista de pedidos del dashboard muestra solo los pedidos que contienen los productos seleccionados.

**¿Por qué?** Si quiero saber quién compró un Beyblade específico, necesito ver solo los pedidos que lo incluyen — no todos los pedidos de la tienda.

**Endpoint:** `GET /api/orders` (ya existe)  
**Cambio:** Agregar param opcional `productIds=uuid1,uuid2`. Retornar solo pedidos que tengan al menos un item de esos productos. Mostrar todos los items del pedido (no filtrar items individuales).

---

### TICKET-005: Ver discrepancias de inventario por producto

**¿Qué hace?** Cuando el admin selecciona productos en el filtro, aparece una tabla mostrando: cuántas unidades se recibieron, cuántas se vendieron, cuántas deberían quedar, y si hay diferencia con el stock real.

**¿Por qué?** Sabemos que vendimos 19 unidades de un producto pero el sistema dice que queda 1. ¿Vendimos una de más? ¿Se perdió? Este endpoint calcula la discrepancia automáticamente.

**Endpoint:** `GET /api/analytics/inventory-discrepancy?productIds=uuid1,uuid2`  
**Auth:** Solo ADMIN y STAFF  
**Retorna por cada producto:**
- `totalReceived` — cuántas unidades entraron (sum de lotes de inventario)
- `totalSold` — cuántas se vendieron (sum de items en pedidos no cancelados)
- `expectedRemaining` — cuántas deberían quedar (received - sold)
- `discrepancy` — diferencia entre lo esperado y lo real (si es > 0, falta stock)

---

## B. Preventas — Que se apaguen solas cuando vencen

**Contexto:** Las preventas tienen una fecha de caducidad. Hoy si la fecha pasa, la preventa sigue apareciendo como disponible. Necesitamos que se cierre automáticamente cuando vence o cuando se agotan las unidades.

---

### TICKET-006: Auto-cierre de preventas vencidas o agotadas

**¿Qué hace?** Cierra automáticamente las preventas cuando se cumple alguna de estas condiciones:
1. La fecha de caducidad (`presaleEndDate`) ya pasó
2. Las unidades disponibles (`presaleAvailQty`) llegaron a 0

**¿Por qué?** Si una preventa venció hace 3 días y nadie la cerró manualmente, sigue apareciendo en la tienda. Eso confunde a los clientes.

**Implementación sugerida:**
- Un cron job que corra cada hora buscando preventas activas vencidas o agotadas y las marque como cerradas
- Además, validar en el endpoint de crear pedido que la preventa siga activa antes de aceptar la reserva (no confiar solo en el frontend)

**Campo existente:** `presaleEndDate` ya está en el schema Prisma. El frontend ya envía este campo al crear/editar productos.

---

## C. Preventas — Cancelación por admin y bloqueo de usuarios morosos

**Contexto:** Cuando un usuario reserva una preventa y no paga, el admin necesita poder cancelar esa reserva, registrar el motivo, y bloquear al usuario de futuras preventas. El usuario NO puede cancelar por su cuenta — solo el admin.

---

### TICKET-007a: Endpoint para que el admin cancele una reserva de preventa

**¿Qué hace?** El admin cancela una reserva de preventa indicando el motivo (no pago, solicitud del cliente, error, etc.) y opcionalmente bloquea al usuario de futuras preventas.

**¿Por qué?** Si un cliente reserva 3 preventas y nunca paga, necesitamos cancelar sus reservas, devolver las unidades al inventario de preventa, y evitar que lo haga de nuevo.

**Endpoint:** `POST /api/orders/:id/cancel-presale`  
**Auth:** Solo ADMIN y STAFF  
**Body:** `{ reason, notes, banUser }`  
**Lógica:**
1. Cancelar la orden
2. Devolver las unidades reservadas al producto (`presaleAvailQty`)
3. Guardar el motivo en el log de auditoría
4. Si el motivo es "no pago" y `banUser = true`, marcar al usuario como bloqueado

---

### TICKET-007b: Agregar campo de bloqueo de preventas al usuario

**¿Qué hace?** Agrega un campo `presaleBanned` (boolean, default false) al modelo User en la base de datos.

**¿Por qué?** Necesitamos una forma de marcar usuarios que no pagaron sus preventas para que no puedan reservar más.

**Cambio:** Migration de Prisma para agregar `presaleBanned Boolean @default(false)` a la tabla `users`. El campo debe retornarse en `GET /api/auth/me` para que el frontend lo lea.

---

### TICKET-007c: Rechazar reservas de usuarios bloqueados

**¿Qué hace?** Al crear un pedido con productos de preventa, verificar que el usuario no esté bloqueado, que la preventa no haya expirado, y que haya unidades disponibles.

**¿Por qué?** Si un usuario fue bloqueado por no pagar, no debería poder reservar de nuevo. Y si la preventa venció, tampoco.

**Cambio en:** `POST /api/orders` (endpoint existente de crear orden)  
**Validaciones nuevas:**
1. Si `user.presaleBanned = true` → rechazar con 403
2. Si `product.presaleEndDate` ya pasó → rechazar con 400
3. Si `product.presaleAvailQty <= 0` → rechazar con 400

---

### TICKET-007d: Desbloquear usuario (opcional, baja prioridad)

**¿Qué hace?** Permite al admin restaurar el acceso a preventas de un usuario bloqueado.

**¿Por qué?** Por si el bloqueo fue un error o el usuario resolvió su situación.

**Endpoint:** `PATCH /api/customers/:id/presale-ban` con `{ banned: false }`  
**Auth:** Solo ADMIN

---

## Resumen

| # | Título | Área | Prioridad |
|---|--------|------|-----------|
| 1 | Buscador de productos para filtro del dashboard | Dashboard | Alta |
| 2 | Filtrar KPIs por productos seleccionados | Dashboard | Alta |
| 3 | Filtrar gráfico de ventas por productos | Dashboard | Alta |
| 4 | Filtrar lista de pedidos por productos | Dashboard | Alta |
| 5 | Ver discrepancias de inventario por producto | Dashboard | Alta |
| 6 | Auto-cierre de preventas vencidas o agotadas | Preventas | Alta |
| 7a | Cancelar reserva de preventa con motivo | Preventas | Alta |
| 7b | Campo de bloqueo de preventas en usuario | Preventas | Alta |
| 7c | Rechazar reservas de usuarios bloqueados | Preventas | Alta |
| 7d | Desbloquear usuario | Preventas | Baja |

**Total: 10 tickets (9 alta + 1 baja)**

---

## Nota para el dev backend

El frontend de todos estos tickets ya está implementado y desplegado en la branch `memo-sales-ean`. Los endpoints se llaman desde:
- `src/app/lib/api.ts` — funciones del API client
- `src/app/hooks/useData.ts` — hooks que consumen los endpoints

Si necesitas ver exactamente qué params envía el frontend y qué response espera, revisa esos dos archivos.
