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
  const originalAction = body.action || '';
  const translatedAction = translateAction_(originalAction);
  const requestedPeriod = normalizePeriod_(
    body.period ||
      body.periodo ||
      (body.payload && (body.payload.period || body.payload.periodo)) ||
      ''
  );
  const payload = {
    ...body,
    action: translatedAction,
    requestId,
    authToken: gasToken,
    token: gasToken
  };

  if (translatedAction === 'getDashboard' && requestedPeriod) {
    payload.period = requestedPeriod;
  }

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    const parsed = safeJsonParse_(text);
    const normalized = normalizeLegacyResponse_(originalAction, parsed, requestedPeriod);

    return {
      statusCode: response.ok ? 200 : response.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store'
      },
      body: typeof normalized === 'string' ? normalized : JSON.stringify(normalized)
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

function translateAction_(action) {
  if (action === 'getBootstrapData') {
    return 'getCatalogs';
  }

  return action;
}

function normalizeLegacyResponse_(originalAction, parsed, requestedPeriod) {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  if (!parsed.ok) {
    return parsed;
  }

  if (originalAction === 'getBootstrapData') {
    return normalizeBootstrapResponse_(parsed, requestedPeriod);
  }

  if (originalAction === 'getDashboard') {
    return normalizeDashboardResponse_(parsed, requestedPeriod);
  }

  return parsed;
}

function normalizeBootstrapResponse_(parsed, requestedPeriod) {
  const data = parsed.data || {};

  return {
    ok: true,
    code: parsed.code || 'BOOTSTRAP_OK',
    message: parsed.message || 'Datos base cargados.',
    data: {
      app: 'Houston Ramos y Co Finance',
      version: 'legacy-gas-bridge',
      currentPeriod: requestedPeriod || currentPeriod_(),
      catalogs: {
        ingresos: normalizeCatalogCollection_(data.ingresos),
        centros: normalizeCatalogCollection_(data.centros),
        servicios: normalizeCatalogCollection_(data.servicios),
        cajasCuentas: normalizeCatalogCollection_(data.cajasCuentas),
        costos: normalizeCatalogCollection_(data.costos),
        deudasTipos: normalizeCatalogCollection_(data.deudasTipos),
        planCuentas: normalizePlanCuentas_(data.planCuentas)
      },
      closePeriods: []
    },
    meta: parsed.meta || {
      action: 'getBootstrapData'
    }
  };
}

function normalizeDashboardResponse_(parsed, requestedPeriod) {
  const data = parsed.data || {};
  const statements = data.statements || {};
  const pnl = statements.estadoResultados || {};
  const cash = statements.flujoCaja || {};
  const balance = statements.balanceGerencial || {};
  const indicators = data.indicators || {};
  const breakdowns = data.breakdowns || {};

  return {
    ok: true,
    code: parsed.code || 'DASHBOARD_OK',
    message: parsed.message || 'Panel consolidado listo.',
    data: {
      period: data.period || requestedPeriod || currentPeriod_(),
      overview: {
        ventasBrutas: toNumber_(pnl.ventasBrutas),
        itbis: toNumber_(pnl.itbis),
        ventasNetas: toNumber_(pnl.ventasNetas),
        costoVariableDirecto: toNumber_(pnl.costosVariables),
        margenContribucion: toNumber_(pnl.margenContribucion),
        margenContribucionPct: normalizePercent_(indicators.ratioContribucion),
        gastosVariables: 0,
        gastosFijos: toNumber_(pnl.costosFijos),
        gastosFinancieros: toNumber_(pnl.gastosFinancieros),
        impuestoEstimado: toNumber_(pnl.impuestosEstimados),
        saldoCajaFinal: toNumber_(cash.cajaFinal),
        movimientoCaja: toNumber_(cash.entradas) - toNumber_(cash.salidas),
        saldoDeudaFinal: toNumber_(balance.deuda),
        interesesPagados: 0,
        capitalPagado: 0,
        cuentasCobrar: toNumber_(balance.cuentasPorCobrar),
        cuentasPagar: toNumber_(balance.cuentasPorPagar),
        resultadoOperativo: toNumber_(pnl.utilidadOperativa),
        resultadoAntesImpuestos: toNumber_(pnl.utilidadConDeuda || pnl.utilidadSinDeuda),
        flujoLibreAprox: toNumber_(cash.flujoLibreConDeuda || cash.flujoLibreSinDeuda)
      },
      byService: normalizeBreakdownRows_(breakdowns.margenPorServicio),
      byLinea: normalizeBreakdownRows_(breakdowns.ingresosPorLinea),
      byCentro: normalizeBreakdownRows_(breakdowns.ingresosPorCentro),
      cashByAccount: normalizeCashRows_(breakdowns.cajaPorCuenta),
      debtByType: normalizeDebtRows_(breakdowns.deudaPorTipo)
    },
    meta: parsed.meta || {
      action: 'getDashboard'
    }
  };
}

function normalizeCatalogCollection_(items) {
  return Array.isArray(items)
    ? items.map(function mapItem(item) {
        return {
          id: String(item.id || item.cuenta_id || item.account_code || ''),
          nombre: item.nombre || item.name || item.account_name || '',
          estado: item.estado || item.status || '',
          notes: item.notes || ''
        };
      })
    : [];
}

function normalizePlanCuentas_(items) {
  return Array.isArray(items)
    ? items.map(function mapItem(item) {
        const code = String(item.id || item.cuenta_id || item.account_code || '');

        return {
          id: code,
          cuenta_id: code,
          codigo: code,
          nombre: item.nombre || item.name || item.account_name || '',
          estado: item.estado || item.status || (item.is_active ? 'ACTIVO' : 'INACTIVO'),
          notes: item.notes || ''
        };
      })
    : [];
}

function normalizeBreakdownRows_(items) {
  return Array.isArray(items)
    ? items.map(function mapItem(item) {
        return {
          id: String(item.id || item.linea_id || item.service_id || item.centro_id || ''),
          venta_neta: toNumber_(item.venta_neta || item.ventasNetas),
          costo_variable_directo: toNumber_(item.costo_variable_directo || item.costosVariables),
          margen_contribucion: toNumber_(item.margen_contribucion || item.margenContribucion),
          margen_pct: normalizePercent_(item.margen_pct || item.margenPct || item.ratioContribucion)
        };
      })
    : [];
}

function normalizeCashRows_(items) {
  return Array.isArray(items)
    ? items.map(function mapItem(item) {
        return {
          id: String(item.id || item.cuenta_id || ''),
          saldo_inicial: toNumber_(item.saldo_inicial || item.cajaInicial),
          entradas_periodo: toNumber_(item.entradas_periodo || item.entradas),
          salidas_periodo: toNumber_(item.salidas_periodo || item.salidas),
          saldo_final: toNumber_(item.saldo_final || item.cajaFinal)
        };
      })
    : [];
}

function normalizeDebtRows_(items) {
  return Array.isArray(items)
    ? items.map(function mapItem(item) {
        return {
          id: String(item.id || item.deuda_tipo_id || ''),
          acreedor: item.acreedor || item.creditor || '',
          saldo_inicial: toNumber_(item.saldo_inicial || item.deudaInicial),
          capital_pagado: toNumber_(item.capital_pagado || item.capitalPagado),
          interes_pagado: toNumber_(item.interes_pagado || item.interesPagado),
          saldo_final: toNumber_(item.saldo_final || item.deudaFinal)
        };
      })
    : [];
}

function normalizePeriod_(value) {
  return String(value || '').slice(0, 7);
}

function normalizePercent_(value) {
  const number = toNumber_(value);
  return Math.abs(number) <= 1 ? number * 100 : number;
}

function toNumber_(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function currentPeriod_() {
  return new Date().toISOString().slice(0, 7);
}

function safeJsonParse_(value) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

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