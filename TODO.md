# TODO

## Getnet / Pagos

- [ ] Esperar credenciales sandbox de Getnet (login + tranKey) y agregarlas al `.env`:
  ```
  GETNET_LOGIN=...
  GETNET_TRANKEY=...
  ```
- [ ] Hacer 4 transacciones de prueba en el sandbox de Getnet con tarjetas de prueba:
  - [ ] Débito — Aprobación → anotar `requestId`
  - [ ] Débito — Rechazo → anotar `requestId`
  - [ ] Crédito sin cuotas — Rechazo → anotar `requestId`
  - [ ] Crédito 2+ cuotas — Aprobación → anotar `requestId`
- [ ] Enviar los 4 `requestId` al formulario de validación de Getnet
- [ ] Al recibir credenciales de producción, actualizar `.env` del servidor en Vultr:
  ```
  GETNET_ENDPOINT=https://checkout.getnet.cl
  GETNET_LOGIN=...
  GETNET_TRANKEY=...
  API_URL=https://hobbyzamora.cl
  ```

## Seguridad

- [ ] Rotar credenciales de Google OAuth en Google Cloud Console (estuvieron expuestas en git)
