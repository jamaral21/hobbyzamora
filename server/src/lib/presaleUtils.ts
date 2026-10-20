import type { Prisma } from '@prisma/client';

type PresaleCandidate = {
  isPresale?: boolean | null;
  status?: string | null;
  presaleEndDate?: Date | string | null;
  presaleAvailQty?: number | null;
};

const DEFAULT_PRESALE_EXPIRATION_SECONDS = 86400;

export function getRequestedPresaleQuantity(
  items: Array<{ productId: string; quantity: number }>,
  productId: string,
) {
  return items.reduce(
    (total, item) => item.productId === productId ? total + item.quantity : total,
    0,
  );
}

export function sumPresaleReservationQuantities(
  rows: Array<{ productId: string; quantity: number | null }>,
): Record<string, number> {
  return rows.reduce<Record<string, number>>((totals, row) => {
    totals[row.productId] = (totals[row.productId] || 0) + (row.quantity || 0);
    return totals;
  }, {});
}

export const PRESALE_EXPIRATION_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.PRESALE_EXPIRATION_SECONDS ?? `${DEFAULT_PRESALE_EXPIRATION_SECONDS}`, 10)
    || DEFAULT_PRESALE_EXPIRATION_SECONDS,
);

export function getPresalePaymentExpiry(from = new Date()) {
  return new Date(from.getTime() + PRESALE_EXPIRATION_SECONDS * 1000);
}

export function getPresaleUnavailableReason(
  product: PresaleCandidate,
  now = new Date(),
  activeReservedCount = 0,
): string | null {
  if (!product.isPresale) {
    return 'Este producto no es una preventa';
  }

  if (product.status && product.status !== 'ACTIVE') {
    return 'Esta preventa no está activa';
  }

  if (product.presaleEndDate && new Date(product.presaleEndDate) <= now) {
    return 'Esta preventa ya venció';
  }

  if (product.presaleAvailQty !== null && product.presaleAvailQty !== undefined) {
    if (product.presaleAvailQty <= 0) {
      return 'No hay cupos disponibles para esta preventa';
    }

    if (activeReservedCount > product.presaleAvailQty) {
      return 'No hay cupos disponibles para esta preventa';
    }
  }

  return null;
}

export function isPresaleActive(product: PresaleCandidate, now = new Date()) {
  return getPresaleUnavailableReason(product, now) === null;
}

export type PresaleVariantPrices = {
  sealedCash: number;
  sealedCard: number;
  openedCash: number;
  openedCard: number;
};

const PRESALE_VARIANT_DEFS = [
  { key: 'sealedCash', condition: 'SEALED', paymentType: 'CASH' },
  { key: 'sealedCard', condition: 'SEALED', paymentType: 'CARD' },
  { key: 'openedCash', condition: 'OPENED', paymentType: 'CASH' },
  { key: 'openedCard', condition: 'OPENED', paymentType: 'CARD' },
] as const;

export function getPresaleVariantLabel(condition: string, paymentType: string) {
  return `${condition === 'OPENED' ? 'Open Box' : 'Sellado'} · ${paymentType === 'CARD' ? 'Tarjeta' : 'Efectivo'}`;
}

/** Valida los 4 precios; retorna null si el payload es inválido. */
export function parsePresaleVariantPrices(input: unknown): PresaleVariantPrices | null {
  if (!input || typeof input !== 'object') return null;
  const result: Record<string, number> = {};
  for (const def of PRESALE_VARIANT_DEFS) {
    const value = Number((input as Record<string, unknown>)[def.key]);
    if (!Number.isFinite(value) || value <= 0) return null;
    result[def.key] = value;
  }
  return result as PresaleVariantPrices;
}

/** Crea o actualiza las 4 variantes de preventa de un producto. */
export async function syncPresaleVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  prices: PresaleVariantPrices,
) {
  for (const def of PRESALE_VARIANT_DEFS) {
    const existing = await tx.productVariant.findFirst({
      where: { productId, condition: def.condition, paymentType: def.paymentType },
    });
    const data = {
      name: 'Preventa',
      options: JSON.stringify([getPresaleVariantLabel(def.condition, def.paymentType)]),
      price: prices[def.key],
    };
    if (existing) {
      await tx.productVariant.update({ where: { id: existing.id }, data });
    } else {
      await tx.productVariant.create({
        data: { ...data, productId, condition: def.condition, paymentType: def.paymentType, stock: 0 },
      });
    }
  }
}
