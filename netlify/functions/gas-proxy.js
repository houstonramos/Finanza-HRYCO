exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      message: 'Solo POST permitido en el proxy.'
    });
  }

  if (!process.env.GAS_WEB_APP_URL || !process.env.GAS_SHARED_TOKEN) {
    return jsonResponse(500, {
      ok: false,
      message: 'Faltan GAS_WEB_APP_URL o GAS_SHARED_TOKEN en Netlify.'
    });
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var upstreamResponse = await fetch(process.env.GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(
        Object.assign({}, body, {
          token: process.env.GAS_SHARED_TOKEN
        })
      ),
      redirect: 'follow'
    });
    var text = await upstreamResponse.text();

    return {
      statusCode: upstreamResponse.status || 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      },
      body: text
    };
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message || 'No se pudo conectar con Apps Script.'
    });
  }
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}
