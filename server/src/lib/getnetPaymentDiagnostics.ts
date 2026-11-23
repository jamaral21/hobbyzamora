type JsonRecord = Record<string, unknown>;

export interface GetnetDiagnostics {
  gatewayStatus: string | null;
  responseCode: string | null;
  responseMessage: string | null;
}

export interface GetnetPaymentResolution {
  paymentStatus: 'APPROVED' | 'DECLINED' | 'PENDING';
  orderStatus: 'PROCESSING' | 'CANCELLED' | 'PENDING';
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function getString(...values: unknown[]): string | null {
  const value = values.find((candidate) => typeof candidate === 'string' || typeof candidate === 'number');
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, 500) : null;
}

export function extractGetnetDiagnostics(payload: unknown): GetnetDiagnostics {
  const response = asRecord(payload);
  const responseStatus = asRecord(response?.status);
  const payment = Array.isArray(response?.payment) ? asRecord(response.payment[0]) : null;
  const transactionStatus = asRecord(payment?.status);
  const details = transactionStatus ?? responseStatus;
  const rawTransactionStatus = typeof payment?.status === 'string' ? payment.status : null;
  const rawResponseStatus = typeof response?.status === 'string' ? response.status : null;

  return {
    gatewayStatus: getString(details?.status, rawTransactionStatus, responseStatus?.status, rawResponseStatus),
    responseCode: getString(
      details?.reason,
      details?.code,
      responseStatus?.reason,
      responseStatus?.code,
      payment?.responseCode,
      response?.responseCode,
    ),
    responseMessage: getString(
      details?.message,
      details?.description,
      responseStatus?.message,
      responseStatus?.description,
      payment?.responseMessage,
      response?.message,
    ),
  };
}

export function resolveGetnetStatuses(rawStatus?: string | null): GetnetPaymentResolution {
  const status = (rawStatus || '').toUpperCase();

  if (status === 'APPROVED') {
    return { paymentStatus: 'APPROVED', orderStatus: 'PROCESSING' };
  }

  if (status === 'REJECTED' || status === 'DECLINED') {
    return { paymentStatus: 'DECLINED', orderStatus: 'CANCELLED' };
  }

  return { paymentStatus: 'PENDING', orderStatus: 'PENDING' };
}
