const crypto = require('node:crypto');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Usa POST para consumir este proxy.'
    });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const gasToken = process.env.GAS_SHARED_TOKEN || '';

  if (!gasUrl) {
    return jsonResponse(200, {
      ok: false,
      code: 'MISSING_CONFIG',
      message: 'Falta la variable GAS_WEB_APP_URL. El frontend puede seguir operando en modo demo.',
      requestId: buildRequestId('proxy')
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, {
      ok: false,
      code: 'INVALID_JSON',
      message: 'El body enviado al proxy no es JSON válido.'
    });
  }

  const requestId = body.requestId || buildRequestId(body.action || 'proxy');
  const payload = {
    ...body,
    requestId,
    authToken: gasToken
  };

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    return {
      statusCode: response.ok ? 200 : response.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store'
      },
      body: text
    };
  } catch (error) {
    return jsonResponse(200, {
      ok: false,
      code: 'GAS_UNREACHABLE',
      message: 'No se pudo conectar con Apps Script; se mantiene modo demo.',
      requestId,
      details: {
        error: error.message
      }
    });
  }
};

function buildRequestId(prefix) {
  return [
    String(prefix || 'REQ').toUpperCase(),
    new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14),
    crypto.randomUUID().slice(0, 8).toUpperCase()
  ].join('_');
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}