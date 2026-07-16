(function () {
  var STORAGE_KEY_PREFIX = 'ebg-v1-draft-';
  var state = {
    currentView: 'panel',
    currentForm: 'ingresoMensual',
    currentPeriod: getCurrentMonth_(),
    useDemo: true,
    bootstrap: null,
    dashboard: null,
    activity: [],
    chatDraft: null,
    chatQuestions: []
  };

  var refs = {
    views: document.querySelectorAll('.view'),
    navLinks: document.querySelectorAll('[data-view-target]'),
    formTabs: document.querySelectorAll('[data-form-target]'),
    viewTitle: document.getElementById('viewTitle'),
    viewSubtitle: document.getElementById('viewSubtitle'),
    globalPeriod: document.getElementById('globalPeriod'),
    refreshDashboardButton: document.getElementById('refreshDashboardButton'),
    overviewCards: document.getElementById('overviewCards'),
    overviewNarrative: document.getElementById('overviewNarrative'),
    serviceTable: document.getElementById('serviceTable'),
    lineTable: document.getElementById('lineTable'),
    centerTable: document.getElementById('centerTable'),
    cashTable: document.getElementById('cashTable'),
    debtTable: document.getElementById('debtTable'),
    formTitle: document.getElementById('formTitle'),
    formSummary: document.getElementById('formSummary'),
    summaryForm: document.getElementById('summaryForm'),
    activityFeed: document.getElementById('activityFeed'),
    healthButton: document.getElementById('healthButton'),
    bootstrapButton: document.getElementById('bootstrapButton'),
    apiStatusText: document.getElementById('apiStatusText'),
    periodStatusText: document.getElementById('periodStatusText'),
    periodStatusDot: document.getElementById('periodStatusDot'),
    output: document.getElementById('output'),
    chatMode: document.getElementById('chatMode'),
    chatExamplesButton: document.getElementById('chatExamplesButton'),
    chatTranscript: document.getElementById('chatTranscript'),
    chatForm: document.getElementById('chatForm'),
    chatInput: document.getElementById('chatInput'),
    chatToFormButton: document.getElementById('chatToFormButton'),
    chatDraft: document.getElementById('chatDraft'),
    chatQuestions: document.getElementById('chatQuestions'),
    controlSummary: document.getElementById('controlSummary'),
    periodControlCard: document.getElementById('periodControlCard'),
    closePeriodButton: document.getElementById('closePeriodButton'),
    catalogSummary: document.getElementById('catalogSummary')
  };

  var viewMeta = {
    panel: {
      title: 'Panel de decisión',
      subtitle: 'Margen por servicio, caja final, deuda y vista consolidada del grupo.'
    },
    cargas: {
      title: 'Cargas mensuales',
      subtitle: 'Aquí se registra el resumen mensual que luego alimenta los estados gerenciales.'
    },
    chat: {
      title: 'Chat IA controlado',
      subtitle: 'Convierte texto en borradores estructurados, consulta la data y ayuda a analizar.'
    },
    control: {
      title: 'Control del sistema',
      subtitle: 'Sheet maestro, catálogos, estados de conexión y trazabilidad del backend.'
    }
  };

  var formConfigs = {
    ingresoMensual: {
      title: 'Ingresos del mes',
      summary: 'Separa línea de ingreso, centro y tipo de servicio para medir margen de producción y contribución.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'centro_id', label: 'Centro / canal', type: 'catalog', catalog: 'centros', required: true },
        { name: 'ingreso_id', label: 'Línea de ingreso', type: 'catalog', catalog: 'ingresos', required: true },
        { name: 'servicio_id', label: 'Tipo de servicio', type: 'catalog', catalog: 'servicios', required: true },
        { name: 'unidades', label: 'Unidades', type: 'number', step: '0.01' },
        { name: 'venta_bruta', label: 'Venta bruta', type: 'number', step: '0.01', required: true },
        { name: 'itbis_monto', label: 'ITBIS', type: 'number', step: '0.01' },
        { name: 'costo_variable_directo', label: 'Costo variable directo', type: 'number', step: '0.01' },
        { name: 'source_reference', label: 'Referencia fuente', type: 'text', full: true, placeholder: 'Sheet, CleanCloud, Stripe, cierre manual...' },
        { name: 'notes', label: 'Notas', type: 'textarea', full: true }
      ]
    },
    cajaMensual: {
      title: 'Caja y bancos del mes',
      summary: 'Captura saldo inicial, entradas, salidas y saldo final de cada cuenta o caja.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'cuenta_operativa_id', label: 'Caja / cuenta', type: 'catalog', catalog: 'cajasCuentas', required: true },
        { name: 'saldo_inicial', label: 'Saldo inicial', type: 'number', step: '0.01', required: true },
        { name: 'entradas_periodo', label: 'Entradas del periodo', type: 'number', step: '0.01', required: true },
        { name: 'salidas_periodo', label: 'Salidas del periodo', type: 'number', step: '0.01', required: true },
        { name: 'conciliado', label: 'Conciliado', type: 'checkbox' },
        { name: 'source_reference', label: 'Referencia fuente', type: 'text', full: true, placeholder: 'Extracto banco, cierre caja, choferes...' },
        { name: 'notes', label: 'Notas', type: 'textarea', full: true }
      ]
    },
    gastoMensual: {
      title: 'Gastos y costos del mes',
      summary: 'Clasifica costos variables, fijos o financieros sin mezclar operación con deuda.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'centro_id', label: 'Centro / canal', type: 'catalog', catalog: 'centros' },
        { name: 'costo_id', label: 'Tipo de costo', type: 'catalog', catalog: 'costos', required: true },
        { name: 'plan_cuenta_id', label: 'Plan de cuentas', type: 'catalog', catalog: 'planCuentas' },
        { name: 'subtotal', label: 'Subtotal', type: 'number', step: '0.01', required: true },
        { name: 'itbis_monto', label: 'ITBIS', type: 'number', step: '0.01' },
        { name: 'source_reference', label: 'Referencia fuente', type: 'text', full: true },
        { name: 'notes', label: 'Notas', type: 'textarea', full: true }
      ]
    },
    deudaMensual: {
      title: 'Deuda y pagos del mes',
      summary: 'Resume saldo inicial, nuevos desembolsos, capital, interés y comisiones.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'deuda_tipo_id', label: 'Tipo de deuda', type: 'catalog', catalog: 'deudasTipos', required: true },
        { name: 'acreedor', label: 'Acreedor', type: 'text', required: true },
        { name: 'referencia', label: 'Referencia', type: 'text' },
        { name: 'tasa_anual', label: 'Tasa anual', type: 'number', step: '0.01' },
        { name: 'plazo_meses', label: 'Plazo en meses', type: 'number', step: '1' },
        { name: 'saldo_inicial', label: 'Saldo inicial', type: 'number', step: '0.01', required: true },
        { name: 'nuevos_desembolsos', label: 'Nuevos desembolsos', type: 'number', step: '0.01' },
        { name: 'capital_pagado', label: 'Capital pagado', type: 'number', step: '0.01' },
        { name: 'interes_pagado', label: 'Interés pagado', type: 'number', step: '0.01' },
        { name: 'comisiones_pagadas', label: 'Comisiones pagadas', type: 'number', step: '0.01' },
        { name: 'source_reference', label: 'Referencia fuente', type: 'text', full: true },
        { name: 'notes', label: 'Notas', type: 'textarea', full: true }
      ]
    },
    carteraMensual: {
      title: 'CxC y CxP del mes',
      summary: 'Permite ver saldos iniciales y finales de cobros o pagos pendientes.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'tipo_cartera', label: 'Tipo', type: 'select', required: true, options: [
          { value: 'CXC', label: 'Cuentas por cobrar' },
          { value: 'CXP', label: 'Cuentas por pagar' }
        ]},
        { name: 'centro_id', label: 'Centro / canal', type: 'catalog', catalog: 'centros' },
        { name: 'contraparte', label: 'Contraparte', type: 'text', required: true },
        { name: 'saldo_inicial', label: 'Saldo inicial', type: 'number', step: '0.01', required: true },
        { name: 'nuevos_movimientos', label: 'Nuevos movimientos', type: 'number', step: '0.01' },
        { name: 'cobros_o_pagos', label: 'Cobros o pagos', type: 'number', step: '0.01' },
        { name: 'vencido', label: 'Está vencido', type: 'checkbox' },
        { name: 'source_reference', label: 'Referencia fuente', type: 'text', full: true },
        { name: 'notes', label: 'Notas', type: 'textarea', full: true }
      ]
    },
    impuestoMensual: {
      title: 'Impuestos del mes',
      summary: 'Registra ITBIS, ISR u otros tributos estimados/pagados del período.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'impuesto_tipo', label: 'Impuesto', type: 'select', required: true, options: [
          { value: 'ITBIS', label: 'ITBIS' },
          { value: 'ISR', label: 'ISR' },
          { value: 'OTRO', label: 'Otro' }
        ]},
        { name: 'plan_cuenta_id', label: 'Plan de cuentas', type: 'catalog', catalog: 'planCuentas' },
        { name: 'base_imponible', label: 'Base imponible', type: 'number', step: '0.01' },
        { name: 'monto_estimado', label: 'Monto estimado', type: 'number', step: '0.01', required: true },
        { name: 'monto_pagado', label: 'Monto pagado', type: 'number', step: '0.01' },
        { name: 'fecha_vencimiento', label: 'Fecha de vencimiento', type: 'date' },
        { name: 'estado_impuesto', label: 'Estado', type: 'select', options: [
          { value: 'PENDIENTE', label: 'Pendiente' },
          { value: 'PAGADO', label: 'Pagado' }
        ]},
        { name: 'source_reference', label: 'Referencia fuente', type: 'text', full: true },
        { name: 'notes', label: 'Notas', type: 'textarea', full: true }
      ]
    }
  };

  var demoBootstrap = {
    app: 'Houston Ramos y Co Finance',
    version: 'demo',
    currentPeriod: state.currentPeriod,
    catalogs: {
      ingresos: [
        { id: 'ING_MEMBRESIAS', nombre: 'Membresias' },
        { id: 'ING_LAVANDERIA_PUNTUAL', nombre: 'Servicios puntuales de lavanderia' },
        { id: 'ING_CORPORATIVO_B2B', nombre: 'Servicios corporativos y B2B' },
        { id: 'ING_RECOGIDA_ENTREGA', nombre: 'Recogida y entrega' },
        { id: 'ING_EXPRES_RECARDO', nombre: 'Servicios expres y recargos por prioridad' }
      ],
      centros: [
        { id: 'CTR_DELIVERY_SD', nombre: 'Delivery Santo Domingo' },
        { id: 'CTR_PLANTA', nombre: 'Planta' },
        { id: 'CTR_ACROPOLIS', nombre: 'Acropolis' },
        { id: 'CTR_HATO_MAYOR', nombre: 'Hato Mayor' }
      ],
      servicios: [
        { id: 'SRV_LAVADO', nombre: 'Lavado' },
        { id: 'SRV_PLANCHADO', nombre: 'Planchado' },
        { id: 'SRV_LAVADO_PLANCHADO', nombre: 'Lavado + planchado' }
      ],
      cajasCuentas: [
        { id: 'ACC_BANCO_PRINCIPAL', nombre: 'Cuenta bancaria principal de la empresa' },
        { id: 'ACC_STRIPE_PENDIENTE', nombre: 'Stripe y pagos digitales pendientes de liquidacion' },
        { id: 'ACC_EFECTIVO_PLANTA', nombre: 'Efectivo en planta' }
      ],
      costos: [
        { id: 'CST_INSUMOS_PRODUCCION', nombre: 'Insumos de produccion' },
        { id: 'CST_NOMINA_ADMIN', nombre: 'Nomina administrativa' },
        { id: 'CST_INTERESES', nombre: 'Intereses' }
      ],
      deudasTipos: [
        { id: 'DEU_PRESTAMO_BANCARIO', nombre: 'Prestamos bancarios' },
        { id: 'DEU_EQUIPOS', nombre: 'Financiamiento de equipos' }
      ],
      planCuentas: [
        { cuenta_id: 'PC-4000', id: 'PC-4000', nombre: 'Ingresos operativos' },
        { cuenta_id: 'PC-5000', id: 'PC-5000', nombre: 'Costos variables directos' },
        { cuenta_id: 'PC-6000', id: 'PC-6000', nombre: 'Costos fijos operativos' }
      ]
    },
    closePeriods: []
  };

  var demoDashboard = {
    period: state.currentPeriod,
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
    byService: [
      { id: 'SRV_LAVADO', venta_neta: 288000, costo_variable_directo: 126000, margen_contribucion: 162000, margen_pct: 56.25 },
      { id: 'SRV_PLANCHADO', venta_neta: 128000, costo_variable_directo: 52000, margen_contribucion: 76000, margen_pct: 59.38 },
      { id: 'SRV_LAVADO_PLANCHADO', venta_neta: 212814, costo_variable_directo: 84000, margen_contribucion: 128814, margen_pct: 60.53 }
    ],
    byLinea: [
      { id: 'ING_MEMBRESIAS', venta_neta: 286000, costo_variable_directo: 111000, margen_contribucion: 175000, margen_pct: 61.19 },
      { id: 'ING_LAVANDERIA_PUNTUAL', venta_neta: 142000, costo_variable_directo: 65000, margen_contribucion: 77000, margen_pct: 54.23 },
      { id: 'ING_CORPORATIVO_B2B', venta_neta: 132000, costo_variable_directo: 54000, margen_contribucion: 78000, margen_pct: 59.09 },
      { id: 'ING_EXPRES_RECARDO', venta_neta: 68814, costo_variable_directo: 32000, margen_contribucion: 36814, margen_pct: 53.5 }
    ],
    byCentro: [
      { id: 'CTR_DELIVERY_SD', venta_neta: 228000, costo_variable_directo: 100000, margen_contribucion: 128000, margen_pct: 56.14 },
      { id: 'CTR_PLANTA', venta_neta: 232814, costo_variable_directo: 94000, margen_contribucion: 138814, margen_pct: 59.63 },
      { id: 'CTR_ACROPOLIS', venta_neta: 96000, costo_variable_directo: 42000, margen_contribucion: 54000, margen_pct: 56.25 },
      { id: 'CTR_HATO_MAYOR', venta_neta: 72000, costo_variable_directo: 26000, margen_contribucion: 46000, margen_pct: 63.89 }
    ],
    cashByAccount: [
      { id: 'ACC_BANCO_PRINCIPAL', saldo_inicial: 220000, entradas_periodo: 148000, salidas_periodo: 91000, saldo_final: 277000 },
      { id: 'ACC_STRIPE_PENDIENTE', saldo_inicial: 14000, entradas_periodo: 12000, salidas_periodo: 8000, saldo_final: 18000 },
      { id: 'ACC_EFECTIVO_PLANTA', saldo_inicial: 18000, entradas_periodo: 16000, salidas_periodo: 34400, saldo_final: -400 }
    ],
    debtByType: [
      { id: 'DEU_PRESTAMO_BANCARIO', acreedor: 'Banco principal', saldo_inicial: 846000, nuevos_desembolsos: 0, capital_pagado: 23000, interes_pagado: 9100, saldo_final: 823000 },
      { id: 'DEU_EQUIPOS', acreedor: 'Proveedor equipos', saldo_inicial: 18000, nuevos_desembolsos: 0, capital_pagado: 11000, interes_pagado: 0, saldo_final: 7000 }
    ]
  };

  function init() {
    refs.globalPeriod.value = state.currentPeriod;
    bindNavigation_();
    bindFormTabs_();
    bindControls_();
    bindChat_();
    state.bootstrap = demoBootstrap;
    state.dashboard = demoDashboard;
    renderAll_();
    loadBootstrap_();
    loadDashboard_();
  }

  function bindNavigation_() {
    refs.navLinks.forEach(function (button) {
      button.addEventListener('click', function () {
        setView_(button.getAttribute('data-view-target'));
      });
    });
  }

  function bindFormTabs_() {
    refs.formTabs.forEach(function (button) {
      button.addEventListener('click', function () {
        setForm_(button.getAttribute('data-form-target'));
      });
    });
  }

  function bindControls_() {
    refs.globalPeriod.addEventListener('change', function () {
      state.currentPeriod = refs.globalPeriod.value || getCurrentMonth_();
      persistCurrentDraft_();
      renderControlSummary_();
      renderPeriodControls_();
      syncPeriodStatusStrip_();
    });

    refs.refreshDashboardButton.addEventListener('click', function () {
      loadDashboard_();
    });
    refs.healthButton.addEventListener('click', async function () {
      try {
        var response = await window.EBGApi.health();
        refs.apiStatusText.textContent = response.ok ? 'API activa' : 'API con alerta';
        renderOutput_('health', response);
        setView_('control');
      } catch (error) {
        refs.apiStatusText.textContent = 'API no disponible; seguimos en modo demo';
        renderOutput_('health-error', { ok: false, message: error.message });
      }
    });

    refs.bootstrapButton.addEventListener('click', function () {
      loadBootstrap_(true);
    });

    refs.closePeriodButton.addEventListener('click', async function () {
      var reason;
      var response;

      if (state.useDemo) {
        renderOutput_('closePeriod-skipped', {
          ok: false,
          message: 'Conecta Apps Script para cerrar periodos de verdad.'
        });
        setView_('control');
        return;
      }

      reason = window.prompt(
        'Escribe una razón breve para cerrar este periodo.',
        'Cierre gerencial mensual confirmado'
      );

      if (reason === null) {
        return;
      }

      try {
        response = await window.EBGApi.closePeriod(state.currentPeriod, 'frontend@ebg', reason);
        renderOutput_('closePeriod', response);

        if (!response.ok) {
          refs.apiStatusText.textContent = response.message || 'No se pudo cerrar el periodo';
          return;
        }

        refs.apiStatusText.textContent = 'Periodo cerrado y protegido contra cambios';
        state.activity.unshift({
          title: 'Cierre mensual',
          detail: state.currentPeriod + ' · cerrado correctamente.'
        });
        state.activity = state.activity.slice(0, 8);
        renderActivity_();
        await loadBootstrap_();
        await loadDashboard_();
        setView_('control');
      } catch (error) {
        refs.apiStatusText.textContent = 'No se pudo cerrar el periodo en este momento';
        renderOutput_('closePeriod-error', { ok: false, message: error.message });
      }
    });
  }

  function bindChat_() {
    refs.chatExamplesButton.addEventListener('click', function () {
      refs.chatInput.value = 'En julio 2026 Planta vendió 220000 de lavado por membresías y el costo directo fue 90000.';
    });

    refs.chatForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var message = refs.chatInput.value.trim();

      if (!message) {
        return;
      }

      addChatBubble_('user', message);

      try {
        var response = await window.EBGApi.chatAssist('frontend@ebg', {
          message: message,
          mode: refs.chatMode.value,
          context: {
            periodo: state.currentPeriod
          }
        });

        handleChatResponse_(response.ok ? response.data : null, message);
        renderOutput_('chatAssist', response);
      } catch (error) {
        var fallback = buildLocalChatFallback_(message);
        handleChatResponse_(fallback, message);
        renderOutput_('chatAssist-fallback', fallback);
      }

      refs.chatForm.reset();
    });

    refs.chatToFormButton.addEventListener('click', function () {
      if (!state.chatDraft || !state.chatDraft.entity) {
        return;
      }

      setView_('cargas');
      setForm_(state.chatDraft.entity);
      hydrateFormWithDraft_(state.chatDraft.draft || {});
    });
  }

  function renderAll_() {
    renderOverview_();
    renderSummaryForm_();
    renderActivity_();
    renderCatalogSummary_();
    renderControlSummary_();
    renderPeriodControls_();
    syncPeriodStatusStrip_();
    setView_(state.currentView);
  }

  function setView_(viewName) {
    state.currentView = viewName;
    refs.navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-view-target') === viewName);
    });
    refs.views.forEach(function (view) {
      view.classList.toggle('is-active', view.getAttribute('data-view') === viewName);
    });
    refs.viewTitle.textContent = viewMeta[viewName].title;
    refs.viewSubtitle.textContent = viewMeta[viewName].subtitle;
  }

  function setForm_(formKey) {
    state.currentForm = formKey;
    refs.formTabs.forEach(function (tab) {
      tab.classList.toggle('is-active', tab.getAttribute('data-form-target') === formKey);
    });
    renderSummaryForm_();
  }

  async function loadBootstrap_(userTriggered) {
    try {
      var response = await window.EBGApi.getBootstrapData();

      if (response.ok && response.data) {
        state.bootstrap = response.data;
        state.useDemo = false;
        refs.apiStatusText.textContent = 'Catálogos sincronizados desde Apps Script';
      } else if (response && response.message) {
        refs.apiStatusText.textContent = response.message;
      }

      renderCatalogSummary_();
      renderControlSummary_();
      renderPeriodControls_();
      syncPeriodStatusStrip_();
      renderSummaryForm_();

      if (userTriggered) {
        renderOutput_('getBootstrapData', response);
        setView_('control');
      }
    } catch (error) {
      state.useDemo = true;
      renderControlSummary_();
      renderPeriodControls_();
      syncPeriodStatusStrip_();

      if (userTriggered) {
        renderOutput_('getBootstrapData-error', { ok: false, message: error.message });
      }
    }
  }

  async function loadDashboard_() {
    try {
      var response = await window.EBGApi.getDashboard(state.currentPeriod);

      if (response.ok && response.data) {
        state.dashboard = response.data;
        state.useDemo = false;
        refs.apiStatusText.textContent = 'Panel cargado desde Apps Script';
      } else if (response && response.message) {
        refs.apiStatusText.textContent = response.message;
      }
    } catch (error) {
      state.dashboard = demoDashboard;
      refs.apiStatusText.textContent = 'Panel cargado con datos demo';
    }

    renderOverview_();
    renderControlSummary_();
    renderPeriodControls_();
    syncPeriodStatusStrip_();
  }

  function renderOverview_() {
    var dashboard = state.dashboard || demoDashboard;
    var overview = dashboard.overview;
    var cards = [
      {
        label: 'Ventas netas',
        value: overview.ventasNetas,
        tone: 'positive'
      },
      {
        label: 'Margen contribución',
        value: overview.margenContribucion,
        tone: 'positive'
      },
      {
        label: 'Caja final',
        value: overview.saldoCajaFinal,
        tone: 'warning'
      },
      {
        label: 'Deuda final',
        value: overview.saldoDeudaFinal,
        tone: 'danger'
      }
    ];

    refs.overviewCards.innerHTML = cards
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

    refs.overviewNarrative.innerHTML =
      '<strong>Resumen gerencial del periodo ' +
      escapeHtml_(dashboard.period) +
      '</strong><br />' +
      'El margen de contribución estimado es ' +
      formatPercent_(overview.margenContribucionPct) +
      '. El resultado operativo luce en ' +
      formatCurrency_(overview.resultadoOperativo) +
      ' y el flujo libre aproximado en ' +
      formatCurrency_(overview.flujoLibreAprox) +
      '. Sin deuda, la lectura mejora en la medida en que el gasto financiero y el servicio de capital se reduzcan.';

    refs.serviceTable.innerHTML = buildTable_(
      dashboard.byService,
      'id',
      ['venta_neta', 'costo_variable_directo', 'margen_contribucion', 'margen_pct']
    );
    refs.lineTable.innerHTML = buildTable_(
      dashboard.byLinea,
      'id',
      ['venta_neta', 'costo_variable_directo', 'margen_contribucion', 'margen_pct']
    );
    refs.centerTable.innerHTML = buildTable_(
      dashboard.byCentro,
      'id',
      ['venta_neta', 'costo_variable_directo', 'margen_contribucion', 'margen_pct']
    );
    refs.cashTable.innerHTML = buildTable_(
      dashboard.cashByAccount,
      'id',
      ['saldo_inicial', 'entradas_periodo', 'salidas_periodo', 'saldo_final']
    );
    refs.debtTable.innerHTML = buildTable_(
      dashboard.debtByType,
      'id',
      ['acreedor', 'saldo_inicial', 'capital_pagado', 'interes_pagado', 'saldo_final']
    );
  }

  function renderSummaryForm_() {
    var config = formConfigs[state.currentForm];
    refs.formTitle.textContent = config.title;
    refs.formSummary.textContent = config.summary;

    refs.summaryForm.innerHTML =
      '<div class="form-grid">' +
      config.fields
        .map(function (field) {
          return renderField_(field);
        })
        .join('') +
      '</div>' +
      '<div class="chat-actions">' +
      '<button class="solid-button" type="submit">Guardar resumen</button>' +
      '<button id="loadDraftButton" class="ghost-button" type="button">Recuperar borrador</button>' +
      '</div>';

    refs.summaryForm.onsubmit = handleSummarySubmit_;
    refs.summaryForm.querySelector('#loadDraftButton').onclick = loadDraftIntoForm_;
    hydratePeriodField_();
  }

  function renderActivity_() {
    refs.activityFeed.innerHTML = state.activity.length
      ? state.activity
          .map(function (item) {
            return (
              '<article class="feed-item">' +
              '<strong>' +
              escapeHtml_(item.title) +
              '</strong>' +
              '<p>' +
              escapeHtml_(item.detail) +
              '</p>' +
              '</article>'
            );
          })
          .join('')
      : '<article class="feed-item"><strong>Sin actividad todavía</strong><p>Aquí verás las últimas cargas o actualizaciones mensuales.</p></article>';
  }

  function renderCatalogSummary_() {
    var catalogs = (state.bootstrap || demoBootstrap).catalogs;
    var items = [
      ['Líneas de ingreso', catalogs.ingresos.length],
      ['Centros / canales', catalogs.centros.length],
      ['Tipos de servicio', catalogs.servicios.length],
      ['Cajas / cuentas', catalogs.cajasCuentas.length],
      ['Tipos de costo', catalogs.costos.length],
      ['Tipos de deuda', catalogs.deudasTipos.length],
      ['Plan de cuentas', catalogs.planCuentas.length]
    ];

    refs.catalogSummary.innerHTML = items
      .map(function (item) {
        return (
          '<article class="catalog-card">' +
          '<strong>' +
          escapeHtml_(item[0]) +
          '</strong>' +
          '<span>' +
          String(item[1]) +
          ' registros cargados</span>' +
          '</article>'
        );
      })
      .join('');
  }

  function renderControlSummary_() {
    var periodState = getCurrentPeriodState_();

    refs.controlSummary.innerHTML =
      '<strong>Fuente de verdad:</strong> Google Sheets maestro en Google Drive.<br />' +
      '<strong>Captura V1:</strong> resumen mensual.<br />' +
      '<strong>Persistencia local:</strong> solo borradores y estado de interfaz.<br />' +
      '<strong>Periodo actual:</strong> ' +
      escapeHtml_(state.currentPeriod) +
      ' · ' +
      escapeHtml_(periodState.label) +
      '.<br />' +
      '<strong>Estado actual:</strong> ' +
      (state.useDemo ? 'modo demo / fallback local' : 'sincronizado con Apps Script');
  }

  function renderPeriodControls_() {
    var periodClose = getCurrentPeriodClose_();
    var periodState = getCurrentPeriodState_();
    var isClosed = periodState.isClosed;
    var closeReason = periodClose && periodClose.motivo ? periodClose.motivo : 'Aún no se ha cerrado.';
    var closedAt = periodClose && periodClose.cerrado_at ? periodClose.cerrado_at : 'Pendiente';
    var closedBy = periodClose && periodClose.cerrado_by ? periodClose.cerrado_by : 'Pendiente';

    refs.periodControlCard.innerHTML =
      '<strong>Control de cierre:</strong> ' +
      escapeHtml_(periodState.label) +
      '.<br />' +
      '<strong>Motivo:</strong> ' +
      escapeHtml_(closeReason) +
      '<br /><strong>Cerrado el:</strong> ' +
      escapeHtml_(closedAt) +
      '<br /><strong>Por:</strong> ' +
      escapeHtml_(closedBy);

    refs.closePeriodButton.disabled = state.useDemo || isClosed;
    refs.closePeriodButton.textContent = isClosed ? 'Periodo ya cerrado' : 'Cerrar periodo actual';
  }

  async function handleSummarySubmit_(event) {
    event.preventDefault();
    var formElement = refs.summaryForm;
    var payload = readFormPayload_(formElement);
    payload.periodo = normalizeMonth_(payload.periodo || state.currentPeriod);
    persistDraft_(state.currentForm, payload);

    try {
      var response = await window.EBGApi.saveMonthlySummary(state.currentForm, 'frontend@ebg', payload);
      renderOutput_('saveMonthlySummary', response);

      if (response.ok) {
        state.activity.unshift({
          title: formConfigs[state.currentForm].title,
          detail: payload.periodo + ' · ' + (response.data.updated ? 'Actualizado' : 'Guardado') + ' correctamente.'
        });
        state.activity = state.activity.slice(0, 8);
        renderActivity_();
        refs.apiStatusText.textContent = 'Resumen guardado en el Sheet maestro';
        formElement.reset();
        hydratePeriodField_();
        loadDashboard_();
      } else {
        state.activity.unshift({
          title: formConfigs[state.currentForm].title,
          detail: payload.periodo + ' · no se guardó: ' + (response.message || 'revisa la validación.')
        });
        state.activity = state.activity.slice(0, 8);
        renderActivity_();
        refs.apiStatusText.textContent =
          response.code === 'PERIOD_CLOSED'
            ? 'Periodo cerrado; no se permiten cambios sin autorización'
            : (response.message || 'La API rechazó el guardado');
      }
    } catch (error) {
      state.activity.unshift({
        title: formConfigs[state.currentForm].title,
        detail: 'Borrador guardado localmente. La API aún no confirmó el guardado.'
      });
      state.activity = state.activity.slice(0, 8);
      renderActivity_();
      refs.apiStatusText.textContent = 'API no disponible; borrador guardado localmente';
      renderOutput_('saveMonthlySummary-error', { ok: false, message: error.message, payload: payload });
    }
  }

  function handleChatResponse_(data, message) {
    if (!data) {
      return;
    }

    state.chatDraft = data;
    state.chatQuestions = data.questions || [];

    addChatBubble_(
      'system',
      data.guidance || 'Preparé un borrador y marqué lo que falta para poder guardarlo bien.'
    );

    refs.chatDraft.innerHTML =
      '<strong>Modo:</strong> ' +
      escapeHtml_(data.mode || '') +
      '<br /><strong>Intent:</strong> ' +
      escapeHtml_(data.intent || '') +
      '<br /><strong>Entidad:</strong> ' +
      escapeHtml_(data.entity || 'N/A') +
      '<br /><strong>Respuesta:</strong> ' +
      escapeHtml_(data.answer || data.guidance || 'Sin respuesta adicional.') +
      '<pre class="output">' +
      escapeHtml_(JSON.stringify(data.snapshot || data.draft || {}, null, 2)) +
      '</pre>';

    refs.chatQuestions.innerHTML = (data.questions || [])
      .map(function (item) {
        return '<div class="question-item"><strong>' + escapeHtml_(item.field) + '</strong><br />' + escapeHtml_(item.question) + '</div>';
      })
      .join('');

    if (!data.questions || !data.questions.length) {
      refs.chatQuestions.innerHTML =
        data.mode === 'cargar'
          ? '<div class="question-item">El borrador ya tiene suficiente información para pasarlo al formulario y confirmar.</div>'
          : '<div class="question-item">La lectura del periodo ya está lista para consulta o análisis.</div>';
    }
  }

  function buildLocalChatFallback_(message) {
    var text = String(message || '').toLowerCase();
    var entity = 'ingresoMensual';

    if (/banco|caja|saldo/.test(text)) {
      entity = 'cajaMensual';
    } else if (/gasto|costo|nomina|alquiler/.test(text)) {
      entity = 'gastoMensual';
    } else if (/deuda|prestamo|interes/.test(text)) {
      entity = 'deudaMensual';
    }

    return {
      mode: refs.chatMode.value,
      intent: entity,
      entity: entity,
      draft: {
        periodo: state.currentPeriod
      },
      questions: [
        {
          field: 'periodo',
          question: '¿Confirmas el periodo?'
        }
      ],
      guidance: 'La API del chat no está conectada; te dejo un borrador base para continuar.'
    };
  }

  function loadDraftIntoForm_() {
    var draft = readDraft_(state.currentForm);

    if (draft) {
      hydrateFormWithDraft_(draft);
    }
  }

  function hydrateFormWithDraft_(draft) {
    Object.keys(draft).forEach(function (key) {
      var field = refs.summaryForm.elements.namedItem(key);

      if (!field) {
        return;
      }

      if (field.type === 'checkbox') {
        field.checked = draft[key] === true || draft[key] === 'SI';
      } else {
        field.value = key === 'periodo' ? draft[key] : String(draft[key]);
      }
    });
  }

  function renderField_(field) {
    var wideClass = field.full ? 'field-wide' : 'field';
    var input = '';
    var value = field.name === 'periodo' ? state.currentPeriod : '';

    if (field.type === 'catalog') {
      input = renderSelect_(field, getCatalogOptions_(field.catalog));
    } else if (field.type === 'select') {
      input = renderSelect_(field, field.options || []);
    } else if (field.type === 'textarea') {
      input = '<textarea id="' + field.name + '" name="' + field.name + '"></textarea>';
    } else if (field.type === 'checkbox') {
      input = '<input id="' + field.name + '" name="' + field.name + '" type="checkbox" />';
    } else {
      input =
        '<input id="' +
        field.name +
        '" name="' +
        field.name +
        '" type="' +
        field.type +
        '" ' +
        (field.required ? 'required ' : '') +
        (field.step ? 'step="' + field.step + '" ' : '') +
        (field.placeholder ? 'placeholder="' + escapeHtml_(field.placeholder) + '" ' : '') +
        (value ? 'value="' + escapeHtml_(value) + '" ' : '') +
        '/>';
    }

    return (
      '<div class="' +
      wideClass +
      '">' +
      '<label for="' +
      field.name +
      '">' +
      escapeHtml_(field.label) +
      '</label>' +
      input +
      '</div>'
    );
  }

  function renderSelect_(field, options) {
    var normalizedOptions = [{ value: '', label: 'Selecciona...' }].concat(options);

    return (
      '<select id="' +
      field.name +
      '" name="' +
      field.name +
      '" ' +
      (field.required ? 'required' : '') +
      '>' +
      normalizedOptions
        .map(function (option) {
          return (
            '<option value="' +
            escapeHtml_(option.value) +
            '">' +
            escapeHtml_(option.label) +
            '</option>'
          );
        })
        .join('') +
      '</select>'
    );
  }

  function getCatalogOptions_(catalogName) {
    var catalogs = (state.bootstrap || demoBootstrap).catalogs;
    var collection = catalogs[catalogName] || [];

    return collection.map(function (item) {
      return {
        value: item.id || item.cuenta_id || '',
        label: item.nombre || item.codigo || item.cuenta_id || ''
      };
    });
  }

  function readFormPayload_(formElement) {
    var data = new FormData(formElement);
    var payload = {};

    data.forEach(function (value, key) {
      payload[key] = value;
    });

    Array.prototype.slice.call(formElement.querySelectorAll('input[type="checkbox"]')).forEach(function (field) {
      payload[field.name] = field.checked;
    });

    Object.keys(payload).forEach(function (key) {
      if (payload[key] === '') {
        delete payload[key];
        return;
      }

      if (typeof payload[key] === 'string' && /^-?\d+(\.\d+)?$/.test(payload[key])) {
        payload[key] = Number(payload[key]);
      }
    });

    return payload;
  }

  function buildTable_(rows, primaryKey, metricKeys) {
    if (!rows || !rows.length) {
      return '<div class="feed-item"><strong>Sin data todavía</strong><p>Cuando empieces a cargar resúmenes, este panel se llenará.</p></div>';
    }

    var header = ['Concepto'].concat(metricKeys);
    var body = rows
      .map(function (row) {
        return (
          '<tr>' +
          '<td>' +
          escapeHtml_(resolveDisplayName_(row[primaryKey] || '')) +
          '</td>' +
          metricKeys
            .map(function (key) {
              return '<td>' + formatCell_(key, row[key]) + '</td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('');

    return (
      '<table class="mini-table">' +
      '<thead><tr>' +
      header
        .map(function (col) {
          return '<th>' + escapeHtml_(col) + '</th>';
        })
        .join('') +
      '</tr></thead>' +
      '<tbody>' +
      body +
      '</tbody>' +
      '</table>'
    );
  }

  function addChatBubble_(role, message) {
    refs.chatTranscript.insertAdjacentHTML(
      'beforeend',
      '<div class="chat-bubble chat-bubble--' + role + '">' + escapeHtml_(message) + '</div>'
    );
  }

  function renderOutput_(label, payload) {
    refs.output.textContent = 'Última acción: ' + label + '\n\n' + JSON.stringify(payload, null, 2);
  }

  function persistDraft_(formKey, payload) {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + formKey, JSON.stringify(payload));
  }

  function readDraft_(formKey) {
    var raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + formKey);
    return raw ? JSON.parse(raw) : null;
  }

  function persistCurrentDraft_() {
    var activeDraft = readDraft_(state.currentForm);

    if (activeDraft) {
      activeDraft.periodo = state.currentPeriod;
      persistDraft_(state.currentForm, activeDraft);
    }
  }

  function hydratePeriodField_() {
    var periodField = refs.summaryForm.elements.namedItem('periodo');

    if (periodField) {
      periodField.value = state.currentPeriod;
    }
  }

  function normalizeMonth_(value) {
    return String(value || '').slice(0, 7);
  }

  function formatCurrency_(value) {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function formatPercent_(value) {
    return Number(value || 0).toFixed(2) + '%';
  }

  function formatValue_(value) {
    if (typeof value === 'number') {
      return formatCurrency_(value);
    }

    return escapeHtml_(value);
  }

  function formatCell_(key, value) {
    if (typeof value === 'number') {
      if (String(key).indexOf('pct') >= 0) {
        return formatPercent_(value);
      }

      return formatCurrency_(value);
    }

    return escapeHtml_(value);
  }

  function resolveDisplayName_(rawValue) {
    var value = String(rawValue || '');
    var catalogs = (state.bootstrap || demoBootstrap).catalogs;
    var groups = [
      catalogs.ingresos || [],
      catalogs.centros || [],
      catalogs.servicios || [],
      catalogs.cajasCuentas || [],
      catalogs.costos || [],
      catalogs.deudasTipos || [],
      catalogs.planCuentas || []
    ];

    for (var i = 0; i < groups.length; i += 1) {
      for (var j = 0; j < groups[i].length; j += 1) {
        if (String(groups[i][j].id || groups[i][j].cuenta_id || '') === value) {
          return groups[i][j].nombre || value;
        }
      }
    }

    return value;
  }

  function getCurrentMonth_() {
    var now = new Date();
    var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 7);
  }

  function getCurrentPeriodClose_() {
    var closePeriods = ((state.bootstrap || demoBootstrap).closePeriods || []).slice();

    for (var i = 0; i < closePeriods.length; i += 1) {
      if (String(closePeriods[i].periodo || '') === String(state.currentPeriod || '')) {
        return closePeriods[i];
      }
    }

    return null;
  }

  function getCurrentPeriodState_() {
    var closeRecord = getCurrentPeriodClose_();
    var isClosed =
      closeRecord &&
      String(closeRecord.estado_cierre || '').toUpperCase() === 'CERRADO';

    return {
      isClosed: Boolean(isClosed),
      label: isClosed ? 'Cerrado' : 'Abierto'
    };
  }

  function syncPeriodStatusStrip_() {
    var periodState = getCurrentPeriodState_();

    refs.periodStatusText.textContent =
      'Periodo ' + state.currentPeriod + ': ' + periodState.label;
    refs.periodStatusDot.className =
      'status-dot ' + (periodState.isClosed ? 'status-dot--danger' : 'status-dot--open');
  }

  function escapeHtml_(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  init();
})();
