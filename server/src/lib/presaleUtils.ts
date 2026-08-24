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
