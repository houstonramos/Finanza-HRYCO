window.EBGApi = (function () {
  var endpoint = '/.netlify/functions/gas-proxy';
  var CLOSE_PERIODS_KEY = 'ebg-v1-close-periods';

  function post(payload) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json();
    });
  }

  function normalizeCatalog(items, fallbackIdKey, fallbackNameKey) {
    return (items || []).map(function (item) {
      var id = item.id || item.account_code || item.cuenta_id || item[fallbackIdKey] || '';
      var name = item.name || item.account_name || item.nombre || item[fallbackNameKey] || id;
      return {
        id: id,
        cuenta_id: id,
        nombre: name
      };
    });
  }

  function readClosePeriods() {
    try {
      return JSON.parse(window.localStorage.getItem(CLOSE_PERIODS_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function writeClosePeriod(periodRecord) {
    var current = readClosePeriods().filter(function (item) {
      return String(item.periodo || '') !== String(periodRecord.periodo || '');
    });

    current.push(periodRecord);
    window.localStorage.setItem(CLOSE_PERIODS_KEY, JSON.stringify(current));
  }

  function mapEntity(entity) {
    var table = {
      ingresoMensual: 'income',
      cajaMensual: 'cash',
      gastoMensual: 'expense',
      deudaMensual: 'debt',
      carteraMensual: 'receivablePayable',
      impuestoMensual: 'tax'
    };

    return table[entity] || entity;
  }

  function compactNotes(primary, secondary) {
    return [primary, secondary].filter(Boolean).join(' | ');
  }

  function mapRecord(entity, payload) {
    if (entity === 'income') {
      return {
        line_id: payload.ingreso_id,
        center_id: payload.centro_id,
        service_id: payload.servicio_id,
        quantity: payload.unidades,
        venta_bruta: payload.venta_bruta,
        itbis: payload.itbis_monto,
        costo_variable_directo: payload.costo_variable_directo,
        source: payload.source_reference || 'manual'
      };
    }

    if (entity === 'cash') {
      return {
        account_id: payload.cuenta_operativa_id,
        saldo_inicial: payload.saldo_inicial,
        entradas: payload.entradas_periodo,
        salidas: payload.salidas_periodo,
        conciliado: payload.conciliado,
        notes: compactNotes(payload.source_reference, payload.notes)
      };
    }

    if (entity === 'expense') {
      return {
        cost_id: payload.costo_id,
        account_code: payload.plan_cuenta_id,
        amount: payload.subtotal,
        itbis_creditable: payload.itbis_monto,
        notes: compactNotes(payload.source_reference, payload.notes)
      };
    }

    if (entity === 'debt') {
      return {
        debt_type_id: payload.deuda_tipo_id,
        lender_name: payload.acreedor,
        instrument_name: payload.referencia,
        saldo_inicial: payload.saldo_inicial,
        desembolsos: payload.nuevos_desembolsos,
        pagos_capital: payload.capital_pagado,
        gastos_financieros:
          Number(payload.interes_pagado || 0) + Number(payload.comisiones_pagadas || 0),
        tasa_anual: payload.tasa_anual,
        notes: compactNotes(payload.source_reference, payload.notes)
      };
    }

    if (entity === 'receivablePayable') {
      return {
        category: String(payload.tipo_cartera || '').toUpperCase() === 'CXP' ? 'cxp' : 'cxc',
        counterparty_name: payload.contraparte,
        saldo_inicial: payload.saldo_inicial,
        generated_amount: payload.nuevos_movimientos,
        collected_paid_amount: payload.cobros_o_pagos,
        notes: compactNotes(payload.source_reference, payload.notes)
      };
    }

    if (entity === 'tax') {
      return {
        tax_type: payload.impuesto_tipo,
        base_amount: payload.base_imponible,
        tax_amount: payload.monto_estimado,
        paid_amount: payload.monto_pagado,
        status: payload.estado_impuesto || 'PENDIENTE',
        notes: compactNotes(payload.source_reference, payload.notes)
      };
    }

    return payload;
  }

  function getMetric(object, key, fallback) {
    if (object && object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
    return fallback || 0;
  }

  function toBreakdownRows(items, valueKey) {
    return (items || []).map(function (item) {
      var value = Number(item.value || 0);
      return {
        id: item.key || 'Sin clasificar',
        venta_neta: valueKey === 'venta_neta' ? value : 0,
        costo_variable_directo: 0,
        margen_contribucion: valueKey === 'margen_contribucion' ? value : 0,
        margen_pct: 0,
        saldo_inicial: 0,
        entradas_periodo: 0,
        salidas_periodo: 0,
        saldo_final: value
      };
    });
  }

  function transformDashboard(data) {
    var pnl = (data && data.statements && data.statements.estadoResultados) || {};
    var cash = (data && data.statements && data.statements.flujoCaja) || {};
    var balance = (data && data.statements && data.statements.balanceGerencial) || {};
    var indicators = (data && data.indicators) || {};
    var breakdowns = (data && data.breakdowns) || {};
    var gastosFinancieros = getMetric(pnl, 'gastosFinancieros');
    var deudaServicio = getMetric(indicators, 'deudaServicio');

    return {
      period: data.period,
      overview: {
        ventasBrutas: getMetric(pnl, 'ventasBrutas'),
        itbis: getMetric(pnl, 'itbis'),
        ventasNetas: getMetric(pnl, 'ventasNetas'),
        costoVariableDirecto: getMetric(pnl, 'costosVariables'),
        margenContribucion: getMetric(pnl, 'margenContribucion'),
        margenContribucionPct: getMetric(indicators, 'ratioContribucion') * 100,
        gastosVariables: getMetric(pnl, 'costosVariables'),
        gastosFijos: getMetric(pnl, 'costosFijos'),
        gastosFinancieros: gastosFinancieros,
        impuestoEstimado: getMetric(pnl, 'impuestosEstimados'),
        saldoCajaFinal: getMetric(cash, 'cajaFinal'),
        movimientoCaja: getMetric(cash, 'entradas') - getMetric(cash, 'salidas'),
        saldoDeudaFinal: getMetric(balance, 'deuda'),
        interesesPagados: gastosFinancieros,
        capitalPagado: deudaServicio - gastosFinancieros,
        cuentasCobrar: getMetric(balance, 'cuentasPorCobrar'),
        cuentasPagar: getMetric(balance, 'cuentasPorPagar'),
        resultadoOperativo: getMetric(pnl, 'utilidadOperativa'),
        resultadoAntesImpuestos: getMetric(pnl, 'utilidadConDeuda'),
        flujoLibreAprox: getMetric(cash, 'flujoLibreConDeuda')
      },
      byService: toBreakdownRows(breakdowns.margenPorServicio, 'margen_contribucion'),
      byLinea: toBreakdownRows(breakdowns.ingresosPorLinea, 'venta_neta'),
      byCentro: [],
      cashByAccount: toBreakdownRows(breakdowns.cajaPorCuenta, 'saldo_final'),
      debtByType: []
    };
  }

  function mapDraftEntity(entityType) {
    var table = {
      income: 'ingresoMensual',
      cash: 'cajaMensual',
      expense: 'gastoMensual',
      debt: 'deudaMensual',
      receivablePayable: 'carteraMensual',
      tax: 'impuestoMensual'
    };

    return table[entityType] || 'ingresoMensual';
  }

  function transformChatDraft(data) {
    var record = ((data && data.records) || [])[0] || {};
    var entity = mapDraftEntity(data.entityType);
    var draft = { periodo: data.period };
    var questions = [];

    if (entity === 'ingresoMensual') {
      draft.centro_id = record.center_id || '';
      draft.ingreso_id = record.line_id || '';
      draft.servicio_id = record.service_id || '';
      draft.venta_bruta = record.venta_bruta || '';
      draft.itbis_monto = record.itbis || '';
      draft.costo_variable_directo = record.costo_variable_directo || '';
      if (!record.center_id) questions.push({ field: 'centro_id', question: 'Falta el centro o canal.' });
      if (!record.service_id) questions.push({ field: 'servicio_id', question: 'Falta el tipo de servicio.' });
    } else if (entity === 'cajaMensual') {
      draft.cuenta_operativa_id = record.account_id || '';
      draft.saldo_inicial = record.saldo_inicial || '';
      draft.entradas_periodo = record.entradas || '';
      draft.salidas_periodo = record.salidas || '';
      if (!record.account_id) questions.push({ field: 'cuenta_operativa_id', question: 'Falta la cuenta o caja.' });
    } else if (entity === 'gastoMensual') {
      draft.costo_id = record.cost_id || '';
      draft.subtotal = record.amount || '';
      if (!record.cost_id) questions.push({ field: 'costo_id', question: 'Falta clasificar el tipo de costo.' });
    } else if (entity === 'deudaMensual') {
      draft.deuda_tipo_id = record.debt_type_id || '';
      draft.acreedor = record.lender_name || '';
      draft.referencia = record.instrument_name || '';
      draft.saldo_inicial = record.saldo_inicial || '';
      draft.nuevos_desembolsos = record.desembolsos || '';
      draft.capital_pagado = record.pagos_capital || '';
      draft.interes_pagado = record.gastos_financieros || '';
      if (!record.debt_type_id) questions.push({ field: 'deuda_tipo_id', question: 'Falta el tipo de deuda.' });
    } else if (entity === 'carteraMensual') {
      draft.tipo_cartera = String(record.category || '').toUpperCase();
      draft.contraparte = record.counterparty_name || '';
      draft.saldo_inicial = record.saldo_inicial || '';
      draft.nuevos_movimientos = record.generated_amount || '';
      draft.cobros_o_pagos = record.collected_paid_amount || '';
      if (!record.counterparty_name) questions.push({ field: 'contraparte', question: 'Falta la contraparte.' });
    } else if (entity === 'impuestoMensual') {
      draft.impuesto_tipo = record.tax_type || '';
      draft.base_imponible = record.base_amount || '';
      draft.monto_estimado = record.tax_amount || '';
      draft.monto_pagado = record.paid_amount || '';
    }

    return {
      mode: 'cargar',
      intent: data.entityType,
      entity: entity,
      draft: draft,
      snapshot: record,
      questions: questions,
      guidance: questions.length
        ? 'Preparé un borrador base y marqué lo que todavía falta.'
        : 'Preparé un borrador listo para pasarlo al formulario.'
    };
  }

  return {
    health: function () {
      return post({ action: 'health' });
    },

    getBootstrapData: async function () {
      var health = await post({ action: 'health' });
      var catalogs = await post({ action: 'getCatalogs' });

      if (!health.ok) {
        return health;
      }

      if (!catalogs.ok) {
        return catalogs;
      }

      return {
        ok: true,
        data: {
          app: health.data.appName,
          version: 'gas-v1',
          currentPeriod: new Date().toISOString().slice(0, 7),
          catalogs: {
            ingresos: normalizeCatalog(catalogs.data.ingresos),
            centros: normalizeCatalog(catalogs.data.centros),
            servicios: normalizeCatalog(catalogs.data.servicios),
            cajasCuentas: normalizeCatalog(catalogs.data.cajasCuentas),
            costos: normalizeCatalog(catalogs.data.costos),
            deudasTipos: normalizeCatalog(catalogs.data.deudasTipos),
            planCuentas: normalizeCatalog(catalogs.data.planCuentas, 'account_code', 'account_name')
          },
          closePeriods: readClosePeriods()
        }
      };
    },

    saveMonthlySummary: async function (entity, actor, payload) {
      var entityType = mapEntity(entity);
      var response = await post({
        action: 'saveMonthlySummary',
        actor: actor,
        entityType: entityType,
        period: payload.periodo,
        records: [mapRecord(entityType, payload)]
      });

      if (response.ok && response.data) {
        response.data.updated = Number(response.data.updated || 0) > 0;
      }

      return response;
    },

    getDashboard: async function (periodo) {
      var response = await post({
        action: 'getDashboard',
        period: periodo
      });

      if (!response.ok || !response.data) {
        return response;
      }

      return {
        ok: true,
        data: transformDashboard(response.data)
      };
    },

    closePeriod: async function (periodo, actor, reason) {
      var response = await post({
        action: 'closePeriod',
        actor: actor,
        period: periodo,
        notes: reason
      });

      if (response.ok && response.data) {
        writeClosePeriod({
          periodo: response.data.period,
          estado_cierre: String(response.data.status || '').toLowerCase() === 'cerrado' ? 'CERRADO' : 'ABIERTO',
          motivo: response.data.notes || '',
          cerrado_at: response.data.closed_at || '',
          cerrado_by: response.data.closed_by || ''
        });
      }

      return response;
    },

    chatAssist: async function (actor, payload) {
      var response = await post({
        action: 'createChatDraft',
        actor: actor,
        message: payload.message
      });

      if (!response.ok || !response.data) {
        return response;
      }

      return {
        ok: true,
        data: transformChatDraft(response.data)
      };
    }
  };
})();
