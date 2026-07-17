(function () {
  var mount = document.getElementById('financialStatesSection');

  if (!mount || !window.EBGApi) {
    return;
  }

  var refs = {
    periodInput: document.getElementById('globalPeriod'),
    refreshButton: document.getElementById('refreshDashboardButton'),
    printButton: document.getElementById('financialStatesPrintButton'),
    status: document.getElementById('financialStatesStatus'),
    highlights: document.getElementById('financialStatesHighlights'),
    income: document.getElementById('incomeStatementMount'),
    cash: document.getElementById('cashFlowMount'),
    balance: document.getElementById('balanceMount'),
    debtSummary: document.getElementById('debtSummaryMount'),
    debtDetail: document.getElementById('debtDetailMount')
  };

  var bootstrap = null;
  var demoDashboard = {
    period: getCurrentPeriod_(),
    overview: {
      ventasBrutas: 742000,
      itbis: 113186,
      ventasNetas: 628814,
      costoVariableDirecto: 262000,
      margenContribucion: 366814,
      margenContribucionPct: 58.33,
      gastosVariables: 44000,
      gastosFijos: 158000,
      gastosFinancieros: 22800,
      impuestoEstimado: 38400,
      saldoCajaFinal: 294600,
      movimientoCaja: 61100,
      saldoDeudaFinal: 812000,
      interesesPagados: 9100,
      capitalPagado: 23800,
      cuentasCobrar: 68400,
      cuentasPagar: 43200,
      resultadoOperativo: 164814,
      resultadoAntesImpuestos: 142014,
      flujoLibreAprox: -10200
    },
    debtByType: [
      { id: 'DEU_PRESTAMO_BANCARIO', acreedor: 'Banco principal', saldo_inicial: 846000, nuevos_desembolsos: 0, capital_pagado: 23000, interes_pagado: 9100, saldo_final: 823000 },
      { id: 'DEU_EQUIPOS', acreedor: 'Proveedor equipos', saldo_inicial: 18000, nuevos_desembolsos: 0, capital_pagado: 11000, interes_pagado: 0, saldo_final: 7000 }
    ],
    cashByAccount: [
      { id: 'ACC_BANCO_PRINCIPAL', saldo_inicial: 220000, entradas_periodo: 148000, salidas_periodo: 91000, saldo_final: 277000 },
      { id: 'ACC_STRIPE_PENDIENTE', saldo_inicial: 14000, entradas_periodo: 12000, salidas_periodo: 8000, saldo_final: 18000 },
      { id: 'ACC_EFECTIVO_PLANTA', saldo_inicial: 18000, entradas_periodo: 16000, salidas_periodo: 34400, saldo_final: -400 }
    ]
  };

  bind_();
  load_();

  function bind_() {
    if (refs.periodInput) {
      refs.periodInput.addEventListener('change', load_);
    }

    if (refs.refreshButton) {
      refs.refreshButton.addEventListener('click', load_);
    }

    if (refs.printButton) {
      refs.printButton.addEventListener('click', function () {
        window.print();
      });
    }
  }

  async function load_() {
    var period = getCurrentPeriod_();
    var dashboardResponse;

    refs.status.textContent = 'Actualizando estados para ' + period + '...';

    try {
      if (!bootstrap) {
        var bootstrapResponse = await window.EBGApi.getBootstrapData();

        if (bootstrapResponse && bootstrapResponse.ok && bootstrapResponse.data) {
          bootstrap = bootstrapResponse.data;
        }
      }

      dashboardResponse = await window.EBGApi.getDashboard(period);

      if (dashboardResponse && dashboardResponse.ok && dashboardResponse.data) {
        render_(dashboardResponse.data, period, false);
        return;
      }
    } catch (error) {
      refs.status.textContent = 'La API no respondió; mostrando un ejemplo de referencia.';
    }

    render_(demoDashboard, period, true);
  }

  function render_(dashboard, period, isFallback) {
    var model = buildStatesModel_(dashboard);
    var hasMovements = hasMovements_(dashboard);

    refs.status.textContent = hasMovements
      ? ('Estados gerenciales del período ' + period + (isFallback ? ' · respaldo local' : ' · conectado'))
      : ('Período ' + period + ' sin movimientos cargados todavía. Puedes cargar resúmenes y volver a recargar.');

    refs.highlights.innerHTML = model.highlights
      .map(function (item) {
        return (
          '<article class="metric-card metric-card--' +
          item.tone +
          '">' +
          '<span>' +
          escapeHtml_(item.label) +
          '</span>' +
          '<strong>' +
          formatCurrency_(item.value) +
          '</strong>' +
          '</article>'
        );
      })
      .join('');

    refs.income.innerHTML = buildStatementTable_(model.incomeRows);
    refs.cash.innerHTML = buildStatementTable_(model.cashRows);
    refs.balance.innerHTML = buildStatementTable_(model.balanceRows);
    refs.debtSummary.innerHTML = buildStatementTable_(model.debtSummaryRows);
    refs.debtDetail.innerHTML =
      '<p class="statement-caption">Detalle por tipo de deuda y acreedor del período.</p>' +
      buildDebtDetailTable_(dashboard.debtByType || []);
  }

  function buildStatesModel_(dashboard) {
    var overview = dashboard.overview || {};
    var cashByAccount = dashboard.cashByAccount || [];
    var debtByType = dashboard.debtByType || [];
    var saldoCajaInicial = sumRows_(cashByAccount, 'saldo_inicial');
    var entradasPeriodo = sumRows_(cashByAccount, 'entradas_periodo');
    var salidasPeriodo = sumRows_(cashByAccount, 'salidas_periodo');
    var saldoCajaFinal = sumRows_(cashByAccount, 'saldo_final');
    var activosCorrientes = toNumber_(overview.saldoCajaFinal) + toNumber_(overview.cuentasCobrar);
    var pasivosOperativos = toNumber_(overview.cuentasPagar) + toNumber_(overview.impuestoEstimado);
    var pasivosFinancieros = toNumber_(overview.saldoDeudaFinal);
    var pasivosTotales = pasivosOperativos + pasivosFinancieros;
    var patrimonioEstimado = activosCorrientes - pasivosTotales;
    var resultadoNeto = toNumber_(overview.resultadoAntesImpuestos) - toNumber_(overview.impuestoEstimado);
    var flujoDespuesDeuda = toNumber_(overview.movimientoCaja) - toNumber_(overview.capitalPagado) - toNumber_(overview.interesesPagados);

    return {
      highlights: [
        { label: 'Ventas netas', value: toNumber_(overview.ventasNetas), tone: 'positive' },
        { label: 'Resultado neto aprox', value: resultadoNeto, tone: resultadoNeto >= 0 ? 'positive' : 'danger' },
        { label: 'Flujo libre aprox', value: toNumber_(overview.flujoLibreAprox), tone: toNumber_(overview.flujoLibreAprox) >= 0 ? 'positive' : 'danger' },
        { label: 'Patrimonio estimado', value: patrimonioEstimado, tone: patrimonioEstimado >= 0 ? 'positive' : 'danger' }
      ],
      incomeRows: [
        { label: 'Ingresos', kind: 'section' },
        { label: 'Ventas brutas', amount: toNumber_(overview.ventasBrutas) },
        { label: '(-) ITBIS facturado', amount: -toNumber_(overview.itbis), kind: 'detail' },
        { label: 'Ventas netas', amount: toNumber_(overview.ventasNetas), kind: 'subtotal' },
        { label: 'Costos de producción', kind: 'section' },
        { label: '(-) Costos variables directos', amount: -toNumber_(overview.costoVariableDirecto), kind: 'detail' },
        { label: 'Margen de contribución', amount: toNumber_(overview.margenContribucion), kind: 'subtotal', tone: 'positive' },
        { label: 'Gastos operativos', kind: 'section' },
        { label: '(-) Gastos variables', amount: -toNumber_(overview.gastosVariables), kind: 'detail' },
        { label: '(-) Gastos fijos', amount: -toNumber_(overview.gastosFijos), kind: 'detail' },
        { label: 'Resultado operativo', amount: toNumber_(overview.resultadoOperativo), kind: 'subtotal', tone: toNumber_(overview.resultadoOperativo) >= 0 ? 'positive' : 'danger' },
        { label: 'Resultado financiero e impuestos', kind: 'section' },
        { label: '(-) Gastos financieros', amount: -toNumber_(overview.gastosFinancieros), kind: 'detail' },
        { label: 'Resultado antes de impuestos', amount: toNumber_(overview.resultadoAntesImpuestos), kind: 'subtotal', tone: toNumber_(overview.resultadoAntesImpuestos) >= 0 ? 'positive' : 'danger' },
        { label: '(-) Impuesto estimado', amount: -toNumber_(overview.impuestoEstimado), kind: 'detail' },
        { label: 'Resultado neto aproximado', amount: resultadoNeto, kind: 'total', tone: resultadoNeto >= 0 ? 'positive' : 'danger' }
      ],
      cashRows: [
        { label: 'Caja operativa', kind: 'section' },
        { label: 'Saldo inicial de caja', amount: saldoCajaInicial },
        { label: 'Entradas del período', amount: entradasPeriodo, kind: 'detail' },
        { label: '(-) Salidas del período', amount: -salidasPeriodo, kind: 'detail' },
        { label: 'Movimiento neto de caja', amount: toNumber_(overview.movimientoCaja), kind: 'subtotal', tone: toNumber_(overview.movimientoCaja) >= 0 ? 'positive' : 'danger' },
        { label: 'Deuda e impuestos', kind: 'section' },
        { label: '(-) Capital pagado', amount: -toNumber_(overview.capitalPagado), kind: 'detail' },
        { label: '(-) Intereses pagados', amount: -toNumber_(overview.interesesPagados), kind: 'detail' },
        { label: 'Flujo después de deuda', amount: flujoDespuesDeuda, kind: 'subtotal', tone: flujoDespuesDeuda >= 0 ? 'positive' : 'danger' },
        { label: '(-) Impuesto estimado', amount: -toNumber_(overview.impuestoEstimado), kind: 'detail' },
        { label: 'Flujo libre aproximado', amount: toNumber_(overview.flujoLibreAprox), kind: 'total', tone: toNumber_(overview.flujoLibreAprox) >= 0 ? 'positive' : 'danger' },
        { label: 'Saldo final de caja', amount: saldoCajaFinal, kind: 'total', tone: saldoCajaFinal >= 0 ? 'positive' : 'danger' }
      ],
      balanceRows: [
        { label: 'Activos corrientes', kind: 'section' },
        { label: 'Caja y bancos', amount: toNumber_(overview.saldoCajaFinal), kind: 'detail' },
        { label: 'Cuentas por cobrar', amount: toNumber_(overview.cuentasCobrar), kind: 'detail' },
        { label: 'Total activos corrientes', amount: activosCorrientes, kind: 'subtotal' },
        { label: 'Pasivos operativos', kind: 'section' },
        { label: 'Cuentas por pagar', amount: toNumber_(overview.cuentasPagar), kind: 'detail' },
        { label: 'Impuestos estimados pendientes', amount: toNumber_(overview.impuestoEstimado), kind: 'detail' },
        { label: 'Total pasivos operativos', amount: pasivosOperativos, kind: 'subtotal' },
        { label: 'Pasivos financieros', kind: 'section' },
        { label: 'Deuda financiera', amount: pasivosFinancieros, kind: 'detail' },
        { label: 'Total pasivos financieros', amount: pasivosFinancieros, kind: 'subtotal' },
        { label: 'Total pasivos', amount: pasivosTotales, kind: 'subtotal' },
        { label: 'Patrimonio gerencial estimado', amount: patrimonioEstimado, kind: 'total', tone: patrimonioEstimado >= 0 ? 'positive' : 'danger' },
        { label: 'Total pasivos + patrimonio', amount: pasivosTotales + patrimonioEstimado, kind: 'total' }
      ],
      debtSummaryRows: [
        { label: 'Deuda financiera', kind: 'section' },
        { label: 'Saldo inicial total', amount: sumRows_(debtByType, 'saldo_inicial') },
        { label: 'Nuevos desembolsos', amount: sumRows_(debtByType, 'nuevos_desembolsos'), kind: 'detail' },
        { label: '(-) Capital pagado', amount: -toNumber_(overview.capitalPagado), kind: 'detail' },
        { label: '(-) Intereses pagados', amount: -toNumber_(overview.interesesPagados), kind: 'detail' },
        { label: 'Saldo final total', amount: toNumber_(overview.saldoDeudaFinal), kind: 'total', tone: toNumber_(overview.saldoDeudaFinal) > 0 ? 'warning' : 'positive' }
      ]
    };
  }

  function buildStatementTable_(rows) {
    return (
      '<table class="mini-table statement-table">' +
      '<thead><tr><th>Concepto</th><th>Monto</th></tr></thead>' +
      '<tbody>' +
      rows
        .map(function (row) {
          var rowClass = 'statement-row--' + (row.kind || 'normal');

          if (row.tone) {
            rowClass += ' statement-row--' + row.tone;
          }

          return (
            '<tr class="' +
            rowClass +
            '">' +
            '<td>' +
            escapeHtml_(row.label) +
            '</td>' +
            '<td>' +
            (row.kind === 'section' ? '' : formatCurrency_(row.amount)) +
            '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody>' +
      '</table>'
    );
  }

  function buildDebtDetailTable_(rows) {
    if (!rows.length) {
      return '<div class="feed-item"><strong>Sin deuda detallada todavía</strong><p>Cuando registres deuda mensual, verás el detalle por acreedor aquí.</p></div>';
    }

    return (
      '<table class="mini-table">' +
      '<thead><tr><th>Concepto</th><th>Acreedor</th><th>Saldo inicial</th><th>Nuevos desembolsos</th><th>Capital pagado</th><th>Interés pagado</th><th>Saldo final</th></tr></thead>' +
      '<tbody>' +
      rows
        .map(function (row) {
          return (
            '<tr>' +
            '<td>' + escapeHtml_(resolveDebtType_(row.id)) + '</td>' +
            '<td>' + escapeHtml_(row.acreedor || '') + '</td>' +
            '<td>' + formatCurrency_(row.saldo_inicial) + '</td>' +
            '<td>' + formatCurrency_(row.nuevos_desembolsos) + '</td>' +
            '<td>' + formatCurrency_(row.capital_pagado) + '</td>' +
            '<td>' + formatCurrency_(row.interes_pagado) + '</td>' +
            '<td>' + formatCurrency_(row.saldo_final) + '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody>' +
      '</table>'
    );
  }

  function resolveDebtType_(id) {
    var catalog = bootstrap && bootstrap.catalogs && bootstrap.catalogs.deudasTipos;
    var found;

    if (!catalog) {
      return String(id || '');
    }

    found = catalog.find(function (item) {
      return String(item.id || '') === String(id || '');
    });

    return found ? found.nombre : String(id || '');
  }

  function hasMovements_(dashboard) {
    var overview = dashboard.overview || {};
    var values = Object.keys(overview).map(function (key) {
      return toNumber_(overview[key]);
    });

    return values.some(function (value) {
      return Math.abs(value) > 0;
    });
  }

  function sumRows_(rows, key) {
    return (rows || []).reduce(function (acc, row) {
      return acc + toNumber_(row[key]);
    }, 0);
  }

  function toNumber_(value) {
    return Number(value || 0);
  }

  function formatCurrency_(value) {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 0
    }).format(toNumber_(value));
  }

  function escapeHtml_(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCurrentPeriod_() {
    return refs.periodInput && refs.periodInput.value
      ? refs.periodInput.value
      : new Date().toISOString().slice(0, 7);
  }
})();