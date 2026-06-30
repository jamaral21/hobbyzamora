import { describe, expect, it } from 'vitest';
import { normalizeProductImportRow } from './productImport.js';

describe('normalizeProductImportRow', () => {
  it('normalizes alternate CSV headers and inventory fields', () => {
    const row = {
      SKU: 'HBZ-001',
      EAN: '7891234567890',
      'Product Name': 'Producto Demo',
      Categoria: 'Juegos',
      Description: 'Una descripción',
      Price: '19.90',
      Costo: '10.50',
      Inventory: '25',
      'Initial Stock': '10',
      Status: 'ACTIVE',
      Images: 'https://img1.jpg|https://img2.jpg',
    };

    const normalized = normalizeProductImportRow(row);

    expect(normalized.sku).toBe('HBZ-001');
    expect(normalized.ean).toBe('7891234567890');
    expect(normalized.name).toBe('Producto Demo');
    expect(normalized.category).toBe('Juegos');
    expect(normalized.description).toBe('Una descripción');
    expect(normalized.price).toBe(19.9);
    expect(normalized.cost).toBe(10.5);
    expect(normalized.stock).toBe(25);
    expect(normalized.initialStock).toBe(10);
    expect(normalized.status).toBe('ACTIVE');
    expect(normalized.images).toEqual([]);
  });

  it('uses the inventory stock when stock is missing', () => {
    const normalized = normalizeProductImportRow({
      stock: '',
      inventory: '7',
      initial_stock: '3',
    });

    expect(normalized.stock).toBe(7);
    expect(normalized.initialStock).toBe(3);
  });
});
