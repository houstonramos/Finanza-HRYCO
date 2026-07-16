# Finanza HRYCO

Panel financiero gerencial para Houston Ramos y Co / EBG Laundry Delivery.

## Variables en Netlify

- `GAS_WEB_APP_URL`
  URL del Web App de Google Apps Script.
- `GAS_SHARED_TOKEN`
  Token compartido configurado en Apps Script.

## Flujo

1. El navegador habla solo con `/.netlify/functions/gas-proxy`.
2. Netlify agrega el token del servidor.
3. Apps Script valida y escribe en Google Sheets.

## Estado actual

- Frontend manual mensual listo.
- Proxy seguro Netlify -> Apps Script listo.
- Catálogos, dashboard, cargas y cierre conectados a la API.
- El token no vive en el frontend ni en el repo.
