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
  const logoUrl = `${BASE_URL}/logo.png`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0; padding: 0;
      background: #0a0a0f;
      font-family: 'Outfit', Arial, sans-serif;
      color: #e8e6f0;
      -webkit-font-smoothing: antialiased;
    }
    .outer { padding: 32px 16px; background: #0a0a0f; }
    .wrap {
      max-width: 580px; margin: 0 auto;
      background: #12121a;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255,214,10,0.15);
      box-shadow: 0 0 40px rgba(255,214,10,0.06);
    }
    /* Header */
    .header {
      background: #0a0a0f;
      border-bottom: 1px solid rgba(255,214,10,0.15);
      padding: 28px 36px;
      text-align: center;
    }
    .header img { height: 52px; width: auto; display: block; margin: 0 auto 12px; }
    .header-brand {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(255,214,10,0.5);
      font-weight: 600;
    }
    /* Body */
    .body { padding: 36px; }
    .body h2 {
      color: #e8e6f0;
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 16px;
      line-height: 1.4;
    }
    .body p { color: #a8a6b8; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .body strong { color: #e8e6f0; }
    /* CTA Button */
    .btn {
      display: inline-block;
      background: #ffd60a;
      color: #0a0a0f !important;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      margin: 20px 0;
      font-size: 15px;
      letter-spacing: 0.3px;
    }
    /* Divider */
    .divider { border: none; border-top: 1px solid rgba(255,214,10,0.1); margin: 28px 0; }
    /* Order items table */
    table.items { width: 100%; border-collapse: collapse; font-size: 14px; }
    table.items th {
      background: #1a1a2e;
      color: #8b8a9e;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.items td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,214,10,0.07);
      color: #e8e6f0;
    }
    table.items td small { color: #8b8a9e; font-size: 12px; display: block; margin-top: 2px; }
    table.items tr:last-child td { border-bottom: none; }
    /* Totals */
    .totals { width: 100%; font-size: 14px; }
    .totals td { padding: 6px 0; color: #a8a6b8; }
    .totals td:last-child { text-align: right; }
    .totals .total-row td { color: #ffd60a; font-size: 17px; font-weight: 700; padding-top: 12px; }
    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    /* Info box */
    .info-box {
      background: #1a1a2e;
      border: 1px solid rgba(255,214,10,0.1);
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      color: #a8a6b8;
      margin: 16px 0;
    }
    /* Footer */
    .footer {
      background: #0a0a0f;
      border-top: 1px solid rgba(255,214,10,0.1);
      text-align: center;
      padding: 24px 36px;
      font-size: 12px;
      color: #4a4858;
      line-height: 1.8;
    }
    .footer a { color: #ffd60a; text-decoration: none; }
    .social-links { margin: 12px 0 0; }
    .social-links a { color: #6b6980; margin: 0 6px; text-decoration: none; font-size: 12px; }
  </style>
</head>
<body>
<div class="outer">
  <div class="wrap">
    <!-- Header -->
    <div class="header">
      <img src="${logoUrl}" alt="HobbyZamora" onerror="this.style.display='none'">
      <div class="header-brand">HobbyZamora</div>
    </div>

    <!-- Body -->
    <div class="body">${body}</div>

    <!-- Footer -->
    <div class="footer">
      © ${year} HobbyZamora. Todos los derechos reservados.<br>
      ¿Dudas? <a href="mailto:hola@hobbyzamora.cl">hola@hobbyzamora.cl</a> · 
      <a href="${BASE_URL}">hobbyzamora.cl</a>
      <div class="social-links">
        <a href="#">Instagram</a> · <a href="#">Facebook</a>
      </div>
      <div style="margin-top:12px;color:#2a2838;font-size:11px">
        Si no reconoces esta actividad, ignora este correo.
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
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
    `<tr>
      <td>${i.name}${i.variantName ? `<small>${i.variantName}</small>` : ''}</td>
      <td style="text-align:center;color:#8b8a9e">${i.quantity}</td>
      <td style="text-align:right;color:#ffd60a;font-weight:600">${formatPrice(i.price * i.quantity)}</td>
    </tr>`
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

    <table class="totals">
      <tr><td>Subtotal</td><td>${formatPrice(order.subtotal)}</td></tr>
      ${order.shipping ? `<tr><td>Envío</td><td>${formatPrice(order.shipping)}</td></tr>` : ''}
      ${order.discount ? `<tr><td>Descuento</td><td style="color:#00e676">-${formatPrice(order.discount)}</td></tr>` : ''}
      <tr class="total-row"><td><strong>Total</strong></td><td>${formatPrice(order.total)}</td></tr>
    </table>

    ${address ? `
    <hr class="divider">
    <div class="info-box">
      <strong style="color:#e8e6f0">📦 Dirección de envío</strong><br>
      <span style="margin-top:6px;display:block">${address}</span>
    </div>` : ''}

    <div style="text-align:center">
      <a class="btn" href="${BASE_URL}/store/account">Ver mis pedidos</a>
    </div>
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
