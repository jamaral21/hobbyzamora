import sgMail from '@sendgrid/mail';

let initialized = false;

function init() {
  if (!initialized && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    initialized = true;
  }
}

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@hobbyzamora.cl',
  name: process.env.SENDGRID_FROM_NAME || 'HobbyZamora',
};

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Templates ────────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .header{background:#111;padding:24px 32px;text-align:center}
  .header img{height:40px}
  .header h1{color:#FFD60A;margin:8px 0 0;font-size:22px;letter-spacing:1px}
  .body{padding:32px}
  .btn{display:inline-block;background:#FFD60A;color:#111;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;margin:24px 0;font-size:15px}
  .footer{background:#f0f0f0;text-align:center;padding:16px 32px;font-size:12px;color:#888}
  .divider{border:none;border-top:1px solid #eee;margin:24px 0}
  table.items{width:100%;border-collapse:collapse;font-size:14px}
  table.items th{background:#f5f5f5;padding:8px 12px;text-align:left;font-weight:600}
  table.items td{padding:8px 12px;border-bottom:1px solid #eee}
  .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>🎨 HobbyZamora</h1>
  </div>
  <div class="body">${body}</div>
  <div class="footer">© ${new Date().getFullYear()} HobbyZamora. Todos los derechos reservados.<br>
  Si tienes dudas, responde este correo o escríbenos en Instagram.</div>
</div></body></html>`;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);
}

function statusLabel(status: string): string {
  const map: Record<string, [string, string]> = {
    PENDING:    ['#f59e0b', 'Pendiente'],
    CONFIRMED:  ['#3b82f6', 'Confirmado'],
    PROCESSING: ['#8b5cf6', 'En proceso'],
    SHIPPED:    ['#06b6d4', 'Enviado'],
    DELIVERED:  ['#10b981', 'Entregado'],
    CANCELLED:  ['#ef4444', 'Cancelado'],
  };
  const [color, label] = map[status] || ['#888', status];
  return `<span class="status-badge" style="background:${color}20;color:${color}">${label}</span>`;
}

function itemsTable(items: OrderItem[]): string {
  const rows = items.map(i =>
    `<tr><td>${i.name}${i.variantName ? `<br><small>${i.variantName}</small>` : ''}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${formatPrice(i.price * i.quantity)}</td></tr>`
  ).join('');
  return `<table class="items"><thead><tr>
    <th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Total</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  name: string;
  variantName?: string | null;
  quantity: number;
  price: number;
}

interface OrderSummary {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
}

// ─── Send helper ──────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  init();
  if (!initialized) {
    console.warn('[email] SENDGRID_API_KEY no configurada, email omitido:', subject);
    return;
  }
  try {
    await sgMail.send({ to, from: FROM, subject, html });
    console.log(`[email] Enviado a ${to}: ${subject}`);
  } catch (err: any) {
    console.error('[email] Error al enviar:', err?.response?.body ?? err);
  }
}

// ─── Email functions ──────────────────────────────────────────────────────────

/** Bienvenida tras registro */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const html = layout('¡Bienvenido a HobbyZamora!', `
    <h2>¡Hola, ${name}! 👋</h2>
    <p>Tu cuenta en <strong>HobbyZamora</strong> ha sido creada exitosamente.</p>
    <p>Ya puedes explorar nuestra tienda de productos de manualidades, papelería y arte.</p>
    <a class="btn" href="${BASE_URL}/store">Explorar la tienda</a>
    <hr class="divider">
    <p style="font-size:13px;color:#666">Si no creaste esta cuenta, puedes ignorar este correo.</p>
  `);
  await send(email, '¡Bienvenido a HobbyZamora! 🎨', html);
}

/** Solicitud de reset de contraseña */
export async function sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
  const link = `${BASE_URL}/reset-password?token=${resetToken}`;
  const html = layout('Restablecer contraseña', `
    <h2>Hola, ${name}</h2>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <a class="btn" href="${link}">Restablecer mi contraseña</a>
    <p style="font-size:13px;color:#666">Este enlace expira en <strong>1 hora</strong>.<br>
    Si no solicitaste esto, puedes ignorar este correo.</p>
  `);
  await send(email, 'Restablecer tu contraseña – HobbyZamora', html);
}

/** Confirmación de cambio de contraseña */
export async function sendPasswordChangedEmail(email: string, name: string): Promise<void> {
  const html = layout('Contraseña actualizada', `
    <h2>Hola, ${name}</h2>
    <p>Tu contraseña ha sido actualizada exitosamente.</p>
    <p>Si no realizaste este cambio, contáctanos de inmediato respondiendo este correo.</p>
    <a class="btn" href="${BASE_URL}/store">Ir a la tienda</a>
  `);
  await send(email, 'Tu contraseña fue actualizada – HobbyZamora', html);
}

/** Confirmación de orden creada */
export async function sendOrderConfirmationEmail(order: OrderSummary): Promise<void> {
  const address = [order.shippingStreet, order.shippingCity, order.shippingState]
    .filter(Boolean).join(', ');

  const html = layout(`Pedido confirmado #${order.orderNumber}`, `
    <h2>¡Gracias por tu compra, ${order.customerName}! 🎉</h2>
    <p>Tu pedido <strong>#${order.orderNumber}</strong> fue recibido y está siendo procesado.</p>
    ${itemsTable(order.items)}
    <hr class="divider">
    <table style="width:100%;font-size:14px">
      <tr><td>Subtotal</td><td style="text-align:right">${formatPrice(order.subtotal)}</td></tr>
      ${order.shipping ? `<tr><td>Envío</td><td style="text-align:right">${formatPrice(order.shipping)}</td></tr>` : ''}
      ${order.discount ? `<tr><td>Descuento</td><td style="text-align:right;color:#10b981">-${formatPrice(order.discount)}</td></tr>` : ''}
      <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${formatPrice(order.total)}</strong></td></tr>
    </table>
    ${address ? `<hr class="divider"><p><strong>Dirección de envío:</strong><br>${address}</p>` : ''}
    <a class="btn" href="${BASE_URL}/store/account">Ver mis pedidos</a>
  `);
  await send(order.customerEmail, `Pedido confirmado #${order.orderNumber} – HobbyZamora`, html);
}

/** Actualización de estado de orden */
export async function sendOrderStatusEmail(order: OrderSummary): Promise<void> {
  const messages: Record<string, string> = {
    CONFIRMED:  'Tu pedido ha sido confirmado y pronto comenzaremos a prepararlo.',
    PROCESSING: 'Estamos preparando tu pedido con todo el cuidado.',
    SHIPPED:    '¡Tu pedido está en camino! Pronto lo recibirás en la dirección registrada.',
    DELIVERED:  '¡Tu pedido fue entregado! Esperamos que lo disfrutes. 🎨',
    CANCELLED:  'Tu pedido ha sido cancelado. Si tienes preguntas, contáctanos.',
  };

  const msg = messages[order.status] || `El estado de tu pedido cambió a: ${order.status}`;

  const html = layout(`Actualización de tu pedido #${order.orderNumber}`, `
    <h2>Hola, ${order.customerName}</h2>
    <p>Te informamos que tu pedido <strong>#${order.orderNumber}</strong> ha sido actualizado:</p>
    <p style="font-size:18px">Estado: ${statusLabel(order.status)}</p>
    <p>${msg}</p>
    ${itemsTable(order.items)}
    <hr class="divider">
    <p><strong>Total:</strong> ${formatPrice(order.total)}</p>
    <a class="btn" href="${BASE_URL}/store/account">Ver mis pedidos</a>
  `);
  await send(order.customerEmail, `Actualización de tu pedido #${order.orderNumber} – HobbyZamora`, html);
}

/** Notificación interna para admin: nueva orden */
export async function sendNewOrderAdminEmail(order: OrderSummary): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const html = layout(`Nueva orden #${order.orderNumber}`, `
    <h2>Nueva orden recibida</h2>
    <p><strong>Cliente:</strong> ${order.customerName} (${order.customerEmail})</p>
    <p><strong>Orden:</strong> #${order.orderNumber}</p>
    ${itemsTable(order.items)}
    <hr class="divider">
    <p><strong>Total:</strong> ${formatPrice(order.total)}</p>
    <a class="btn" href="${BASE_URL}/admin/orders">Ver en el admin</a>
  `);
  await send(adminEmail, `Nueva orden #${order.orderNumber} – HobbyZamora`, html);
}
