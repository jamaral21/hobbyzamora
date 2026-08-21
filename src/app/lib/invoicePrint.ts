import type { Invoice, InvoiceItem } from '../data/shipmentsMockData';
import { formatChileDate } from './chileDate';

interface OpenInvoicePrintPreviewParams {
  invoice: Invoice;
  items: InvoiceItem[];
  title?: string;
  companyName?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value: number, currency: 'JPY' | 'CLP'): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  const prefix = currency === 'JPY' ? '¥' : '$';
  return `${prefix}${rounded.toLocaleString('es-CL')}`;
}

export function openInvoicePrintPreview({
  invoice,
  items,
  title = 'Boleta',
  companyName = 'Hobby Zamora',
}: OpenInvoicePrintPreviewParams): void {
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) {
    window.alert('No se pudo abrir la vista previa de impresión. Revisa el bloqueador de ventanas emergentes.');
    return;
  }

  const rowsHtml = items
    .map((item) => {
      const subtotal = item.precioU * item.cant;
      return `
        <tr>
          <td>${escapeHtml(item.nombre || 'Sin nombre')}</td>
          <td>${escapeHtml(item.tipo || '-')}</td>
          <td class="right">${item.ean ? escapeHtml(item.ean) : '-'}</td>
          <td class="right">${formatCurrency(item.precioU, 'JPY')}</td>
          <td class="right">${item.cant}</td>
          <td class="right">${formatCurrency(subtotal, 'JPY')}</td>
        </tr>
      `;
    })
    .join('');

  const formattedDate = formatChileDate(invoice.fecha);

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - ${escapeHtml(invoice.id)}</title>
  <style>
    :root {
      --fg: #111827;
      --muted: #6b7280;
      --border: #d1d5db;
      --brand: #111827;
      --bg: #ffffff;
      --soft: #f9fafb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: var(--fg);
      background: var(--bg);
      padding: 28px;
    }
    .actions {
      position: sticky;
      top: 0;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-bottom: 16px;
      background: linear-gradient(180deg, #fff 75%, rgba(255,255,255,0));
    }
    .btn {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--fg);
      padding: 8px 12px;
      font-size: 14px;
      cursor: pointer;
    }
    .btn.primary {
      background: var(--brand);
      border-color: var(--brand);
      color: #fff;
    }
    .sheet {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }
    .head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
      border-bottom: 1px solid var(--border);
      background: var(--soft);
    }
    .title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }
    .muted {
      color: var(--muted);
      font-size: 13px;
      margin-top: 6px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .kpi {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
    }
    .kpi-label {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 14px;
      font-weight: 700;
    }
    .table-wrap {
      padding: 0 20px 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      padding: 9px 8px;
      text-align: left;
      vertical-align: middle;
    }
    th {
      color: var(--muted);
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.02em;
    }
    .right {
      text-align: right;
    }
    .footer {
      padding: 14px 20px 20px;
      color: var(--muted);
      font-size: 12px;
    }
    @media print {
      body {
        padding: 0;
      }
      .actions {
        display: none;
      }
      .sheet {
        border: none;
        border-radius: 0;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
    }
    @media (max-width: 860px) {
      .kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn" onclick="window.close()">Cerrar</button>
    <button class="btn primary" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>

  <article class="sheet">
    <header class="head">
      <div>
        <h1 class="title">${escapeHtml(title)}</h1>
        <div class="muted">${escapeHtml(companyName)}</div>
      </div>
      <div>
        <div><strong>ID:</strong> ${escapeHtml(invoice.id)}</div>
        <div class="muted">Fecha: ${escapeHtml(formattedDate)}</div>
      </div>
    </header>

    <section class="kpis">
      <div class="kpi">
        <div class="kpi-label">Subtotal JPY</div>
        <div class="kpi-value">${formatCurrency(invoice.subtotalJPY, 'JPY')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Comisión</div>
        <div class="kpi-value">${invoice.comision}%</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Total JPY</div>
        <div class="kpi-value">${formatCurrency(invoice.totalJPY, 'JPY')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Total CLP</div>
        <div class="kpi-value">${formatCurrency(invoice.totalCLP, 'CLP')}</div>
      </div>
    </section>

    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th class="right">EAN</th>
            <th class="right">Precio JPY</th>
            <th class="right">Cant</th>
            <th class="right">Subtotal JPY</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </section>

    <footer class="footer">
      Tipo de cambio aplicado: ${invoice.tc}
    </footer>
  </article>
</body>
</html>`;

  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    printWindow.location.href = blobUrl;
    // Liberar memoria luego de que la nueva pestaña cargue el documento
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  } catch {
    // Fallback para navegadores/restricciones donde Blob URL no esté disponible
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
