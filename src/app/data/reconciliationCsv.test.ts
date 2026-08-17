import { describe, expect, it } from 'vitest';
import { parseReconciliationCsv } from './reconciliationCsv.js';

describe('parseReconciliationCsv', () => {
  it('parses a valid historical adjustment without creating inventory semantics', () => {
    expect(parseReconciliationCsv('nombre,type,quantity,occurredAt,ean,reason\nProducto,VENDIDO_HISTORICO,-2,2024-02-01,4904810234567,Venta previa')).toEqual([
      { nombre: 'Producto', type: 'VENDIDO_HISTORICO', quantity: -2, occurredAt: '2024-02-01', ean: '4904810234567', reason: 'Venta previa' },
    ]);
  });

  it('rejects missing required columns and zero quantities', () => {
    expect(() => parseReconciliationCsv('nombre,quantity\nProducto,1')).toThrow('Faltan columnas requeridas');
    expect(() => parseReconciliationCsv('nombre,type,quantity,occurredAt\nProducto,AJUSTE,0,2024-02-01')).toThrow('Fila 2 es inválida');
  });
});