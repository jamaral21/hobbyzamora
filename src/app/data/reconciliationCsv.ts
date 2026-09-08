export interface ReconciliationCsvRow {
  productId?: string;
  ean?: string;
  nombre: string;
  type: string;
  quantity: number;
  occurredAt: string;
  reason?: string;
}

export function parseReconciliationCsv(value: string): ReconciliationCsvRow[] {
  const [header, ...lines] = value.trim().split(/\r?\n/);
  if (!header || lines.length === 0) throw new Error('El CSV debe incluir encabezado y al menos una fila');
  const fields = header.split(',').map((item) => item.trim());
  const required = ['nombre', 'type', 'quantity', 'occurredAt'];
  if (!required.every((field) => fields.includes(field))) throw new Error('Faltan columnas requeridas en el CSV');

  return lines.filter(Boolean).map((line, index) => {
    const cells = line.split(',').map((value) => value.trim());
    if (cells.length !== fields.length) throw new Error(`Fila ${index + 2} tiene columnas inválidas`);
    const raw = Object.fromEntries(cells.map((value, cellIndex) => [fields[cellIndex], value]));
    const quantity = Number(raw.quantity);
    if (!raw.nombre || !raw.type || !Number.isInteger(quantity) || quantity === 0 || !raw.occurredAt) {
      throw new Error(`Fila ${index + 2} es inválida`);
    }
    return { ...raw, quantity } as ReconciliationCsvRow;
  });
}