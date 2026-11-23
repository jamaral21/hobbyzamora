import { describe, expect, it } from 'vitest';
import { extractGetnetDiagnostics, resolveGetnetStatuses } from './getnetPaymentDiagnostics.js';

describe('Getnet payment diagnostics', () => {
  it('extracts processor code and reason from a rejected transaction', () => {
    expect(extractGetnetDiagnostics({
      status: { status: 'REJECTED' },
      payment: [{
        status: {
          status: 'REJECTED',
          reason: '89',
          message: 'Negada, Invalido el ruteo de la transacción por el tipo de tarjeta',
        },
      }],
    })).toEqual({
      gatewayStatus: 'REJECTED',
      responseCode: '89',
      responseMessage: 'Negada, Invalido el ruteo de la transacción por el tipo de tarjeta',
    });
  });

  it('leaves unrecognized statuses pending instead of treating them as declines', () => {
    expect(resolveGetnetStatuses('UNKNOWN')).toEqual({
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
    });
    expect(resolveGetnetStatuses('REJECTED')).toEqual({
      paymentStatus: 'DECLINED',
      orderStatus: 'CANCELLED',
    });
  });
});
