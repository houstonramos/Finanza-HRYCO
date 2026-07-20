(function () {
  var STORAGE_KEY_PREFIX = 'ebg-v1-draft-';
  var state = {
    currentView: 'cargas',
    currentForm: 'ingresoMensual',
    currentPeriod: getCurrentMonth_(),
    useDemo: true,
    bootstrap: null,
    dashboard: null,
    yearSummary: null,
    periodRecords: [],
    activity: [],
    chatDraft: null,
    chatQuestions: [],
    chatHistory: []
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
    statesHighlights: document.getElementById('statesHighlights'),
    annualHighlights: document.getElementById('annualHighlights'),
    annualSummaryTable: document.getElementById('annualSummaryTable'),
    annualIndicatorsTable: document.getElementById('annualIndicatorsTable'),
    incomeStatementTable: document.getElementById('incomeStatementTable'),
    cashFlowTable: document.getElementById('cashFlowTable'),
    balanceTable: document.getElementById('balanceTable'),
    debtReportTable: document.getElementById('debtReportTable'),
    serviceTable: document.getElementById('serviceTable'),
    lineTable: document.getElementById('lineTable'),
    centerTable: document.getElementById('centerTable'),
    cashTable: document.getElementById('cashTable'),
    debtTable: document.getElementById('debtTable'),
    formTitle: document.getElementById('formTitle'),
    formSummary: document.getElementById('formSummary'),
    summaryForm: document.getElementById('summaryForm'),
    activityFeed: document.getElementById('activityFeed'),
    periodRecords: document.getElementById('periodRecords'),
    refreshRecordsButton: document.getElementById('refreshRecordsButton'),
    healthButton: document.getElementById('healthButton'),
    bootstrapButton: document.getElementById('bootstrapButton'),
    apiStatusText: document.getElementById('apiStatusText'),
    periodStatusText: document.getElementById('periodStatusText'),
    periodStatusDot: document.getElementById('periodStatusDot'),
    output: document.getElementById('output'),
    outputDetails: document.getElementById('outputDetails'),
    outputJson: document.getElementById('outputJson'),
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
    catalogSummary: document.getElementById('catalogSummary'),
    exportStatesButton: document.getElementById('exportStatesButton')
  };

  var viewMeta = {
    panel: {
      title: 'Tablero de decisión',
      subtitle: 'Margen por servicio, caja final, deuda y vista consolidada del grupo.'
    },
    estados: {
      title: 'Estados financieros',
      subtitle: 'Estado de resultados, flujo de caja, balance, deuda y lectura anual del año activo.'
    },
    cargas: {
      title: 'Cierre mensual',
      subtitle: 'Aquí registras el mes de forma guiada para luego ver estados, caja, deuda e indicadores.'
    },
    chat: {
      title: 'Ayuda guiada',
      subtitle: 'Convierte texto en borradores estructurados, consulta la data y ayuda a analizar.'
    },
    control: {
      title: 'Soporte técnico',
      subtitle: 'Diagnóstico, catálogos, estado de conexión y control de cierre.'
    }
  };

  var formConfigs = {
    ingresoMensual: {
      title: 'Ingresos del mes',
      summary: 'Separa línea de ingreso, centro y servicio para medir margen. Si no escribes ITBIS, el sistema lo estima automáticamente.',
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
      summary: 'Clasifica costos variables, fijos o financieros sin mezclar operación con deuda. Si dejas ITBIS vacío, el sistema lo calcula.',
      fields: [
        { name: 'periodo', label: 'Periodo', type: 'month', required: true },
        { name: 'centro_id', label: 'Centro / canal', type: 'catalog', catalog: 'centros' },
        { name: 'costo_id', label: 'Tipo de costo', type: 'catalog', catalog: 'costos', required: true },
        { name: 'plan_cuenta_id', label: 'Plan de cuentas', type: 'catalog', catalog: 'planCuentas' },
        { name: 'subtotal', label: 'Subtotal', type: 'number', step: '0.01', required: true },
        { name: 'itbis_monto', label: 'ITBIS', type: 'number', step: '0.01' },
        { name: 'es_recurrente', label: 'Gasto recurrente', type: 'checkbox' },
        { name: 'recurrente_alias', label: 'Alias recurrente', type: 'text' },
        { name: 'recurrente_desde', label: 'Recurrente desde', type: 'month' },
        { name: 'recurrente_hasta', label: 'Recurrente hasta', type: 'month' },
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
    loadYearSummary_();
    loadPeriodRecords_();
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
      loadDashboard_();
      loadYearSummary_();
      loadPeriodRecords_();
    });

    refs.refreshDashboardButton.addEventListener('click', function () {
      loadDashboard_();
      loadYearSummary_();
    });

    refs.refreshRecordsButton.addEventListener('click', function () {
      loadPeriodRecords_();
    });

    refs.exportStatesButton.addEventListener('click', function () {
      setView_('estados');
      window.print();
    });

    refs.healthButton.addEventListener('click', async function () {
      try {
        var response = await window.EBGApi.health();
        refs.apiStatusText.textContent = response.ok ? 'API activa' : 'API con alerta';
        renderOutput_('health', response, {
          technical: response.ok !== true,
          autoOpen: response.ok !== true
        });
        setView_('control');
      } catch (error) {
        refs.apiStatusText.textContent = 'API no disponible; seguimos en modo demo';
        renderOutput_('health-error', { ok: false, message: error.message }, {
          technical: true,
          autoOpen: true
        });
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
        }, {
          technical: false
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
        renderOutput_('closePeriod', response, {
          technical: response.ok !== true,
          autoOpen: response.ok !== true
        });

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
        renderOutput_('closePeriod-error', { ok: false, message: error.message }, {
          technical: true,
          autoOpen: true
        });
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
      var selectedMode = refs.chatMode.value;

      if (!message) {
        return;
      }

      addChatBubble_('user', message);

      try {
        var response = await window.EBGApi.chatAssist('frontend@ebg', {
          message: message,
          mode: selectedMode,
          context: buildChatContext_()
        });

        if (response.ok && response.data) {
          handleChatResponse_(response.data, message);
          syncChatApiStatus_(response);
        } else {
          var localFallback = buildLocalChatFallback_(message);
          handleChatResponse_(localFallback, message);
          refs.apiStatusText.textContent = response.message || 'Chat local de respaldo activo';
        }

      } catch (error) {
        var fallback = buildLocalChatFallback_(message);
        handleChatResponse_(fallback, message);
        refs.apiStatusText.textContent = 'Chat local de respaldo; la IA no esta conectada';
        renderOutput_('chatAssist-fallback', {
          ok: false,
          message: 'El chat principal no respondió y se activó el respaldo local.',
          fallback: fallback
        }, {
          technical: true,
          autoOpen: false
        });
      }

      refs.chatForm.reset();
      refs.chatMode.value = selectedMode;
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
    renderStates_();
    renderYearSummary_();
    renderSummaryForm_();
    renderActivity_();
    renderPeriodRecords_();
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
    loadPeriodRecords_();
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
      renderPeriodRecords_();

      if (!state.useDemo) {
        loadYearSummary_();
        loadPeriodRecords_();
      }

      if (userTriggered) {
        renderOutput_('getBootstrapData', response, {
          technical: response.ok !== true,
          autoOpen: response.ok !== true
        });
        setView_('control');
      }
    } catch (error) {
      state.useDemo = true;
      renderControlSummary_();
      renderPeriodControls_();
      syncPeriodStatusStrip_();

      if (userTriggered) {
        renderOutput_('getBootstrapData-error', { ok: false, message: error.message }, {
          technical: true,
          autoOpen: true
        });
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
        state.useDemo = true;
        refs.apiStatusText.textContent = response.message;
        state.dashboard = demoDashboard;
      }
    } catch (error) {
      state.dashboard = demoDashboard;
      state.useDemo = true;
      refs.apiStatusText.textContent = 'Panel cargado con datos demo';
    }

    renderOverview_();
    renderStates_();
    renderControlSummary_();
    renderPeriodControls_();
    syncPeriodStatusStrip_();
  }

  async function loadYearSummary_() {
    var year = String(state.currentPeriod || '').slice(0, 4);

    if (!year) {
      state.yearSummary = null;
      renderYearSummary_();
      return;
    }

    if (state.useDemo) {
      state.yearSummary = null;
      renderYearSummary_();
      return;
    }

    try {
      var response = await window.EBGApi.getYearSummary(year);

      if (response.ok && response.data) {
        state.yearSummary = response.data;
      } else {
        state.yearSummary = null;
      }
    } catch (error) {
      state.yearSummary = null;
    }

    renderYearSummary_();
  }

  async function loadPeriodRecords_() {
    if (state.useDemo) {
      state.periodRecords = [];
      renderPeriodRecords_();
      return;
    }

    try {
      var response = await window.EBGApi.listMonthlyRecords(state.currentForm, state.currentPeriod);

      if (response.ok && response.data) {
        state.periodRecords = response.data;
      } else {
        state.periodRecords = [];
      }
    } catch (error) {
      state.periodRecords = [];
    }

    renderPeriodRecords_();
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

  function renderStates_() {
    var dashboard = state.dashboard || demoDashboard;
    var model = buildStatesModel_(dashboard);

    refs.statesHighlights.innerHTML = model.highlights
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

    refs.incomeStatementTable.innerHTML = buildStatementTable_(model.incomeRows);
    refs.cashFlowTable.innerHTML = buildStatementTable_(model.cashFlowRows);
    refs.balanceTable.innerHTML = buildStatementTable_(model.balanceRows);
    refs.debtReportTable.innerHTML = buildDebtReportTable_(model);
  }

  function renderSummaryForm_() {
    var config = formConfigs[state.currentForm];
    var includeRecurringAction = state.currentForm === 'gastoMensual';
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
      '<input id="record_id" name="record_id" type="hidden" value="" />' +
      '<div class="chat-actions">' +
      '<button class="solid-button" type="submit">Guardar resumen</button>' +
      '<button id="loadDraftButton" class="ghost-button" type="button">Recuperar borrador</button>' +
      '<button id="newRecordButton" class="ghost-button" type="button">Nuevo registro</button>' +
      (includeRecurringAction
        ? '<button id="copyRecurringButton" class="ghost-button" type="button">Traer recurrentes</button>'
        : '') +
      '</div>';

    refs.summaryForm.onsubmit = handleSummarySubmit_;
    refs.summaryForm.querySelector('#loadDraftButton').onclick = loadDraftIntoForm_;
    refs.summaryForm.querySelector('#newRecordButton').onclick = resetFormForNewRecord_;
    hydratePeriodField_();
    bindSmartFormHelpers_();

    if (includeRecurringAction) {
      refs.summaryForm.querySelector('#copyRecurringButton').onclick = copyRecurringCosts_;
    }
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
      : [
          '<article class="feed-item"><strong>1. Carga ingresos</strong><p>Resume ventas del mes por línea, centro y servicio.</p></article>',
          '<article class="feed-item"><strong>2. Actualiza caja y bancos</strong><p>Registra saldo inicial, entradas, salidas y saldo final por cuenta.</p></article>',
          '<article class="feed-item"><strong>3. Registra gastos, deuda e impuestos</strong><p>Así el estado de resultados y el flujo de caja salen completos.</p></article>',
          '<article class="feed-item"><strong>4. Revisa Estados</strong><p>Cuando cierres la carga, valida estado de resultados, flujo, balance y deuda.</p></article>'
        ].join('');
  }

  function renderYearSummary_() {
    var yearSummary = state.yearSummary;
    var totals = yearSummary && yearSummary.totals;
    var indicators = yearSummary && yearSummary.indicators;

    if (!yearSummary || !totals) {
      refs.annualHighlights.innerHTML = [
        '<article class="metric-card metric-card--warning"><span>Resumen anual</span><strong>Sin data</strong></article>',
        '<article class="metric-card metric-card--warning"><span>Año activo</span><strong>' + escapeHtml_(String(state.currentPeriod || '').slice(0, 4)) + '</strong></article>'
      ].join('');
      refs.annualSummaryTable.innerHTML =
        '<div class="feed-item"><strong>Sin resumen anual todavía</strong><p>Cuando existan meses cargados del año activo, aquí verás el consolidado.</p></div>';
      refs.annualIndicatorsTable.innerHTML =
        '<div class="feed-item"><strong>Indicadores pendientes</strong><p>Los ratios anuales aparecerán cuando haya información real del año.</p></div>';
      return;
    }

    refs.annualHighlights.innerHTML = [
      buildMetricCard_('Ventas netas año', totals.ventasNetas, 'positive'),
      buildMetricCard_('Margen contribución año', totals.margenContribucion, 'positive'),
      buildMetricCard_('Resultado operativo año', totals.resultadoOperativo, totals.resultadoOperativo >= 0 ? 'positive' : 'danger'),
      buildMetricCard_('Flujo libre año', totals.flujoLibreAprox, totals.flujoLibreAprox >= 0 ? 'positive' : 'danger')
    ].join('');

    refs.annualSummaryTable.innerHTML = buildAnnualMonthsTable_(yearSummary.months || []);
    refs.annualIndicatorsTable.innerHTML = buildStatementTable_([
      { label: 'Indicadores anuales ' + yearSummary.year, kind: 'section' },
      { label: 'Meses con data', amount: Number(indicators.monthsWithData || 0), kind: 'detail', format: 'number' },
      { label: 'Margen de contribución', amount: Number(indicators.margenContribucionPct || 0), kind: 'detail', format: 'percent' },
      { label: 'Margen operativo', amount: Number(indicators.margenOperativoPct || 0), kind: 'detail', format: 'percent' },
      { label: 'Margen antes de impuestos', amount: Number(indicators.margenAntesImpuestosPct || 0), kind: 'detail', format: 'percent' },
      { label: 'Razón corriente', amount: Number(indicators.razonCorriente || 0), kind: 'detail', format: 'ratio' },
      { label: 'Apalancamiento simple', amount: Number(indicators.apalancamientoSimple || 0), kind: 'detail', format: 'ratio' },
      { label: 'Cobertura de intereses', amount: Number(indicators.coberturaIntereses || 0), kind: 'detail', format: 'ratio' },
      { label: 'Mejor mes', amount: indicators.bestMonth || 'N/D', kind: 'detail', format: 'text' }
    ]);
  }

  function renderPeriodRecords_() {
    if (state.useDemo) {
      refs.periodRecords.innerHTML =
        '<div class="feed-item"><strong>Historial inactivo en demo</strong><p>Con Apps Script conectado podrás editar montos o eliminar registros cargados por error.</p></div>';
      return;
    }

    refs.periodRecords.innerHTML = buildRecordsTable_(state.periodRecords, state.currentForm);
    refs.periodRecords.onclick = handlePeriodRecordsClick_;
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

  function resetFormForNewRecord_() {
    refs.summaryForm.reset();
    hydratePeriodField_();
    bindSmartFormHelpers_();
    refs.apiStatusText.textContent = 'Formulario listo para un nuevo registro';
  }

  async function handleSummarySubmit_(event) {
    event.preventDefault();
    var formElement = refs.summaryForm;
    var payload = readFormPayload_(formElement);
    payload.periodo = normalizeMonth_(payload.periodo || state.currentPeriod);
    persistDraft_(state.currentForm, payload);

    try {
      var response = await window.EBGApi.saveMonthlySummary(state.currentForm, 'frontend@ebg', payload);

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
        bindSmartFormHelpers_();
        await loadDashboard_();
        await loadYearSummary_();
        await loadPeriodRecords_();
        renderOutput_('saveMonthlySummary', response, {
          technical: false
        });
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
        renderOutput_('saveMonthlySummary', response, {
          technical: true,
          autoOpen: true
        });
      }
    } catch (error) {
      state.activity.unshift({
        title: formConfigs[state.currentForm].title,
        detail: 'Borrador guardado localmente. La API aún no confirmó el guardado.'
      });
      state.activity = state.activity.slice(0, 8);
      renderActivity_();
      refs.apiStatusText.textContent = 'API no disponible; borrador guardado localmente';
      renderOutput_('saveMonthlySummary-error', { ok: false, message: error.message, payload: payload }, {
        technical: true,
        autoOpen: true
      });
    }
  }

  async function copyRecurringCosts_() {
    try {
      var response = await window.EBGApi.copyRecurringCostsToPeriod(state.currentPeriod, 'frontend@ebg');

      if (response.ok) {
        refs.apiStatusText.textContent = 'Recurrentes procesados para ' + state.currentPeriod;
        state.activity.unshift({
          title: 'Recurrentes de gastos',
          detail: state.currentPeriod + ' · ' + String((response.data && response.data.createdCount) || 0) + ' copiados.'
        });
        state.activity = state.activity.slice(0, 8);
        renderActivity_();
        await loadDashboard_();
        await loadYearSummary_();
        await loadPeriodRecords_();
        renderOutput_('copyRecurringCostsToPeriod', response, {
          technical: false
        });
        return;
      }

      renderOutput_('copyRecurringCostsToPeriod', response, {
        technical: true,
        autoOpen: true
      });
    } catch (error) {
      renderOutput_('copyRecurringCostsToPeriod-error', {
        ok: false,
        message: error.message
      }, {
        technical: true,
        autoOpen: true
      });
    }
  }

  function handleChatResponse_(data, message) {
    var normalizedData;
    var visibleAnswer;
    var structuredSummary;

    if (!data) {
      return;
    }

    normalizedData = normalizeChatDisplayData_(data);
    visibleAnswer = normalizedData.answer || normalizedData.guidance || 'Sin respuesta adicional.';
    structuredSummary = buildChatStructuredSummary_(normalizedData);

    state.chatDraft = normalizedData;
    state.chatQuestions = normalizedData.questions || [];

    addChatBubble_(
      'system',
      visibleAnswer
    );

    refs.chatDraft.innerHTML =
      '<strong>Modo:</strong> ' +
      escapeHtml_(normalizedData.mode || '') +
      '<br /><strong>Intent:</strong> ' +
      escapeHtml_(normalizedData.intent || '') +
      '<br /><strong>Entidad:</strong> ' +
      escapeHtml_(normalizedData.entity || 'N/A') +
      '<br /><strong>Respuesta:</strong> ' +
      escapeHtml_(visibleAnswer) +
      structuredSummary;

    refs.chatQuestions.innerHTML = (normalizedData.questions || [])
      .map(function (item) {
        return '<div class="question-item"><strong>' + escapeHtml_(item.field) + '</strong><br />' + escapeHtml_(item.question) + '</div>';
      })
      .join('');

    if (!normalizedData.questions || !normalizedData.questions.length) {
      refs.chatQuestions.innerHTML =
        normalizedData.mode === 'cargar'
          ? '<div class="question-item">El borrador ya tiene suficiente información para pasarlo al formulario y confirmar.</div>'
          : (isNoDataChatResponse_(normalizedData)
            ? '<div class="question-item">Todavía no hay información cargada para ese período. Puedes cargar meses anteriores o registrar este mes primero.</div>'
            : '<div class="question-item">La lectura del periodo ya está lista para consulta o análisis.</div>');
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

  function buildChatContext_() {
    return {
      periodo: state.currentPeriod,
      previousEntity: state.chatDraft ? state.chatDraft.entity : '',
      previousDraft: state.chatDraft ? state.chatDraft.draft || {} : {},
      previousQuestions: state.chatQuestions || [],
      catalogs: buildChatCatalogContext_(),
      dashboard: state.useDemo ? null : buildChatDashboardContext_(),
      history: state.chatHistory.slice(-8)
    };
  }

  function buildChatCatalogContext_() {
    var catalogs = (state.bootstrap || demoBootstrap).catalogs || {};

    return {
      ingresos: normalizeCatalogForChat_(catalogs.ingresos),
      centros: normalizeCatalogForChat_(catalogs.centros),
      servicios: normalizeCatalogForChat_(catalogs.servicios),
      cajasCuentas: normalizeCatalogForChat_(catalogs.cajasCuentas),
      costos: normalizeCatalogForChat_(catalogs.costos),
      deudasTipos: normalizeCatalogForChat_(catalogs.deudasTipos),
      planCuentas: normalizeCatalogForChat_(catalogs.planCuentas)
    };
  }

  function buildChatDashboardContext_() {
    var dashboard = state.dashboard || null;

    if (!dashboard) {
      return null;
    }

    return {
      period: dashboard.period,
      overview: dashboard.overview,
      byService: dashboard.byService,
      byLinea: dashboard.byLinea,
      byCentro: dashboard.byCentro,
      cashByAccount: dashboard.cashByAccount,
      debtByType: dashboard.debtByType
    };
  }

  function normalizeCatalogForChat_(items) {
    return (items || []).map(function (item) {
      return {
        id: item.id || item.cuenta_id || '',
        nombre: pickCatalogLabel_(item)
      };
    });
  }

  function syncChatApiStatus_(response) {
    if (!response || !response.source) {
      return;
    }

    if (response.source === 'openai') {
      refs.apiStatusText.textContent = 'Chat IA conectado por Netlify';
      return;
    }

    if (response.source === 'apps_script_fallback') {
      refs.apiStatusText.textContent = 'Chat guiado de respaldo desde Apps Script';
    }
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

    var itbisField = refs.summaryForm.elements.namedItem('itbis_monto');

    if (itbisField) {
      itbisField.dataset.autoFill = itbisField.value ? 'manual' : 'auto';
    }
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
        label: pickCatalogLabel_(item)
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

  function bindSmartFormHelpers_() {
    var ventaBrutaField = refs.summaryForm.elements.namedItem('venta_bruta');
    var subtotalField = refs.summaryForm.elements.namedItem('subtotal');
    var itbisField = refs.summaryForm.elements.namedItem('itbis_monto');

    if (!itbisField) {
      return;
    }

    itbisField.dataset.autoFill = itbisField.value ? 'manual' : 'auto';
    itbisField.addEventListener('input', function () {
      itbisField.dataset.autoFill = itbisField.value ? 'manual' : 'auto';
    });

    if (ventaBrutaField) {
      ventaBrutaField.addEventListener('input', function () {
        if (itbisField.dataset.autoFill === 'manual') {
          return;
        }

        itbisField.value = formatInputNumber_(calculateItbisFromGross_(ventaBrutaField.value));
      });
    }

    if (subtotalField) {
      subtotalField.addEventListener('input', function () {
        if (itbisField.dataset.autoFill === 'manual') {
          return;
        }

        itbisField.value = formatInputNumber_(toNumber_(subtotalField.value) * 0.18);
      });
    }
  }

  function handlePeriodRecordsClick_(event) {
    var actionButton = event.target.closest('[data-record-action]');
    var recordId = actionButton && actionButton.getAttribute('data-record-id');

    if (!actionButton || !recordId) {
      return;
    }

    if (actionButton.getAttribute('data-record-action') === 'edit') {
      var record = findPeriodRecordById_(recordId);
      var editableRecord = null;

      if (!record) {
        return;
      }

      editableRecord = shallowCopy_(record);
      editableRecord.record_id = record.id;
      hydrateFormWithDraft_(editableRecord);
      refs.apiStatusText.textContent = 'Registro cargado al formulario en modo edición.';
      return;
    }

    if (actionButton.getAttribute('data-record-action') === 'delete') {
      deleteRecord_(recordId);
    }
  }

  async function deleteRecord_(recordId) {
    var confirmed = window.confirm('Se marcará este registro como eliminado y dejará de afectar los estados. ¿Continuar?');

    if (!confirmed) {
      return;
    }

    try {
      var response = await window.EBGApi.deleteMonthlyRecord(
        state.currentForm,
        recordId,
        'frontend@ebg',
        'Eliminado desde historial del período'
      );

      if (response.ok) {
        refs.apiStatusText.textContent = 'Registro eliminado del período';
        state.activity.unshift({
          title: 'Eliminación de registro',
          detail: state.currentPeriod + ' · registro retirado de los estados.'
        });
        state.activity = state.activity.slice(0, 8);
        renderActivity_();
        await loadDashboard_();
        await loadYearSummary_();
        await loadPeriodRecords_();
        renderOutput_('deleteMonthlyRecord', response, {
          technical: false
        });
        return;
      }

      renderOutput_('deleteMonthlyRecord', response, {
        technical: true,
        autoOpen: true
      });
    } catch (error) {
      renderOutput_('deleteMonthlyRecord-error', {
        ok: false,
        message: error.message
      }, {
        technical: true,
        autoOpen: true
      });
    }
  }

  function buildMetricCard_(label, value, tone) {
    return (
      '<article class="metric-card metric-card--' +
      tone +
      '">' +
      '<span>' +
      escapeHtml_(label) +
      '</span>' +
      '<strong>' +
      formatCurrency_(value) +
      '</strong>' +
      '</article>'
    );
  }

  function buildRecordsTable_(records, entity) {
    var columns = getRecordColumns_(entity);

    if (!records || !records.length) {
      return '<div class="feed-item"><strong>Sin registros en este período</strong><p>Cuando guardes resúmenes de ' + escapeHtml_(formConfigs[entity].title.toLowerCase()) + ', aparecerán aquí.</p></div>';
    }

    return (
      '<table class="mini-table mini-table--records">' +
      '<thead><tr>' +
      columns
        .map(function (column) {
          return '<th>' + escapeHtml_(column.label) + '</th>';
        })
        .join('') +
      '<th>Acciones</th></tr></thead>' +
      '<tbody>' +
      records
        .map(function (record) {
          return (
            '<tr>' +
            columns
              .map(function (column) {
                return '<td>' + formatRecordCell_(column, record[column.key]) + '</td>';
              })
              .join('') +
            '<td class="record-actions">' +
            '<button class="ghost-button ghost-button--small" type="button" data-record-action="edit" data-record-id="' + escapeHtml_(record.id) + '">Editar</button>' +
            '<button class="ghost-button ghost-button--small ghost-button--danger" type="button" data-record-action="delete" data-record-id="' + escapeHtml_(record.id) + '">Eliminar</button>' +
            '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody>' +
      '</table>'
    );
  }

  function getRecordColumns_(entity) {
    var map = {
      ingresoMensual: [
        { key: 'ingreso_id', label: 'Línea' },
        { key: 'centro_id', label: 'Centro' },
        { key: 'servicio_id', label: 'Servicio' },
        { key: 'venta_bruta', label: 'Venta bruta' },
        { key: 'venta_neta', label: 'Venta neta' },
        { key: 'margen_contribucion', label: 'Margen' }
      ],
      cajaMensual: [
        { key: 'cuenta_operativa_id', label: 'Cuenta' },
        { key: 'saldo_inicial', label: 'Saldo inicial' },
        { key: 'entradas_periodo', label: 'Entradas' },
        { key: 'salidas_periodo', label: 'Salidas' },
        { key: 'saldo_final', label: 'Saldo final' }
      ],
      gastoMensual: [
        { key: 'costo_id', label: 'Costo' },
        { key: 'centro_id', label: 'Centro' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'itbis_monto', label: 'ITBIS' },
        { key: 'total', label: 'Total' },
        { key: 'es_recurrente', label: 'Recurrente' }
      ],
      deudaMensual: [
        { key: 'deuda_tipo_id', label: 'Tipo deuda' },
        { key: 'acreedor', label: 'Acreedor' },
        { key: 'saldo_inicial', label: 'Saldo inicial' },
        { key: 'capital_pagado', label: 'Capital' },
        { key: 'interes_pagado', label: 'Interés' },
        { key: 'saldo_final', label: 'Saldo final' }
      ],
      carteraMensual: [
        { key: 'tipo_cartera', label: 'Tipo' },
        { key: 'contraparte', label: 'Contraparte' },
        { key: 'saldo_inicial', label: 'Saldo inicial' },
        { key: 'nuevos_movimientos', label: 'Movimientos' },
        { key: 'cobros_o_pagos', label: 'Cobros / pagos' },
        { key: 'saldo_final', label: 'Saldo final' }
      ],
      impuestoMensual: [
        { key: 'impuesto_tipo', label: 'Impuesto' },
        { key: 'monto_estimado', label: 'Estimado' },
        { key: 'monto_pagado', label: 'Pagado' },
        { key: 'saldo_pendiente', label: 'Pendiente' },
        { key: 'estado_impuesto', label: 'Estado' }
      ]
    };

    return map[entity] || [];
  }

  function formatRecordCell_(column, value) {
    if (column.key.indexOf('_id') >= 0) {
      return escapeHtml_(resolveDisplayName_(value || ''));
    }

    if (typeof value === 'number') {
      return formatCurrency_(value);
    }

    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
      return formatCurrency_(Number(value));
    }

    return escapeHtml_(value || '');
  }

  function buildAnnualMonthsTable_(months) {
    if (!months || !months.length) {
      return '<div class="feed-item"><strong>Año sin meses cargados</strong><p>El consolidado anual aparecerá cuando exista al menos un mes guardado.</p></div>';
    }

    return (
      '<table class="mini-table">' +
      '<thead><tr><th>Mes</th><th>Ventas netas</th><th>Margen contribución</th><th>Resultado operativo</th><th>Flujo libre</th><th>Caja final</th><th>Deuda final</th></tr></thead>' +
      '<tbody>' +
      months
        .map(function (item) {
          var overview = item.overview || {};
          return (
            '<tr>' +
            '<td>' + escapeHtml_(item.period || '') + '</td>' +
            '<td>' + formatCurrency_(overview.ventasNetas) + '</td>' +
            '<td>' + formatCurrency_(overview.margenContribucion) + '</td>' +
            '<td>' + formatCurrency_(overview.resultadoOperativo) + '</td>' +
            '<td>' + formatCurrency_(overview.flujoLibreAprox) + '</td>' +
            '<td>' + formatCurrency_(overview.saldoCajaFinal) + '</td>' +
            '<td>' + formatCurrency_(overview.saldoDeudaFinal) + '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody>' +
      '</table>'
    );
  }

  function findPeriodRecordById_(recordId) {
    for (var i = 0; i < state.periodRecords.length; i += 1) {
      if (String(state.periodRecords[i].id || '') === String(recordId || '')) {
        return state.periodRecords[i];
      }
    }

    return null;
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
            (row.kind === 'section' ? '' : formatStatementValue_(row)) +
            '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '</tbody>' +
      '</table>'
    );
  }

  function buildDebtReportTable_(model) {
    return (
      '<div class="statement-stack">' +
      buildStatementTable_(model.debtSummaryRows) +
      '<div>' +
      '<p class="statement-caption">Detalle por tipo de deuda y acreedor del período.</p>' +
      buildTable_(
        model.debtDetailRows,
        'id',
        ['acreedor', 'saldo_inicial', 'nuevos_desembolsos', 'capital_pagado', 'interes_pagado', 'saldo_final']
      ) +
      '</div>' +
      '</div>'
    );
  }

  function buildStatesModel_(dashboard) {
    var overview = (dashboard && dashboard.overview) || {};
    var cashByAccount = (dashboard && dashboard.cashByAccount) || [];
    var debtByType = (dashboard && dashboard.debtByType) || [];
    var impuestosPendientes = toNumber_(overview.impuestosPendientes || overview.impuestoEstimado);
    var saldoCajaInicial = sumRows_(cashByAccount, 'saldo_inicial');
    var entradasPeriodo = sumRows_(cashByAccount, 'entradas_periodo');
    var salidasPeriodo = sumRows_(cashByAccount, 'salidas_periodo');
    var saldoCajaFinal = sumRows_(cashByAccount, 'saldo_final');
    var activosCorrientes = toNumber_(overview.saldoCajaFinal) + toNumber_(overview.cuentasCobrar);
    var pasivosOperativos = toNumber_(overview.cuentasPagar) + impuestosPendientes;
    var pasivosFinancieros = toNumber_(overview.saldoDeudaFinal);
    var pasivosTotales = pasivosOperativos + pasivosFinancieros;
    var patrimonioEstimado = activosCorrientes - pasivosTotales;
    var resultadoNeto = toNumber_(overview.resultadoAntesImpuestos) - toNumber_(overview.impuestoEstimado);
    var flujoDespuesDeuda = toNumber_(overview.movimientoCaja) - toNumber_(overview.capitalPagado) - toNumber_(overview.interesesPagados);

    return {
      highlights: [
        { label: 'Resultado neto aprox', value: resultadoNeto, tone: resultadoNeto >= 0 ? 'positive' : 'danger' },
        { label: 'Flujo libre aprox', value: toNumber_(overview.flujoLibreAprox), tone: toNumber_(overview.flujoLibreAprox) >= 0 ? 'positive' : 'danger' },
        { label: 'Activos corrientes', value: activosCorrientes, tone: 'warning' },
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
      cashFlowRows: [
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
        { label: 'Impuestos estimados pendientes', amount: impuestosPendientes, kind: 'detail' },
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
      ],
      debtDetailRows: debtByType
    };
  }

  function addChatBubble_(role, message) {
    state.chatHistory.push({
      role: role,
      message: String(message || '')
    });
    state.chatHistory = state.chatHistory.slice(-8);

    refs.chatTranscript.insertAdjacentHTML(
      'beforeend',
      '<div class="chat-bubble chat-bubble--' + role + '">' + escapeHtml_(message) + '</div>'
    );
  }

  function renderOutput_(label, payload, options) {
    var summary = buildOutputSummary_(label, payload);
    var settings = options || {};
    var showTechnical = settings.technical === true || (payload && payload.ok === false);

    refs.output.textContent = summary;
    refs.outputJson.textContent = showTechnical
      ? JSON.stringify(payload, null, 2)
      : 'Oculto para no ensuciar la operación diaria. Solo se muestra cuando algo falla o cuando hace falta soporte.';

    if (showTechnical) {
      refs.outputDetails.open = Boolean(settings.autoOpen) || (payload && payload.ok === false);
      return;
    }

    refs.outputDetails.open = false;
  }

  function normalizeChatDisplayData_(data) {
    var normalized = shallowCopy_(data);

    if (isNoDataChatResponse_(normalized)) {
      normalized.answer =
        'No encuentro datos cargados para ' +
        (normalized.snapshot && normalized.snapshot.period ? normalized.snapshot.period : state.currentPeriod) +
        '. Puedes cargar meses anteriores y luego volver a consultar ese período.';
      normalized.guidance = normalized.answer;
    }

    return normalized;
  }

  function isNoDataChatResponse_(data) {
    var snapshot = (data && data.snapshot) || {};
    var overview = snapshot.overview || {};
    var numericKeys = Object.keys(overview);
    var hasRows =
      (data && data.snapshot && data.snapshot.bestService) ||
      (data && data.draft && Object.keys(data.draft).length > 1);

    if (!data || (data.mode !== 'consultar' && data.mode !== 'analizar')) {
      return false;
    }

    if (!numericKeys.length) {
      return false;
    }

    if (hasRows) {
      return false;
    }

    return numericKeys.every(function (key) {
      return toNumber_(overview[key]) === 0;
    });
  }

  function buildChatStructuredSummary_(data) {
    var rows = [];
    var draft = data.draft || {};

    if (data.mode === 'cargar') {
      Object.keys(draft).forEach(function (key) {
        if (draft[key] === '' || draft[key] === null || draft[key] === undefined) {
          return;
        }

        rows.push(
          '<div class="question-item"><strong>' +
          escapeHtml_(humanizeField_(key)) +
          '</strong><br />' +
          escapeHtml_(String(draft[key])) +
          '</div>'
        );
      });

      return rows.length
        ? '<div class="question-list">' + rows.join('') + '</div>'
        : '<div class="question-item">Todavía no hay borrador suficiente para mostrar.</div>';
    }

    if (isNoDataChatResponse_(data)) {
      return '<div class="question-item">Aún no hay resumen financiero cargado para este período.</div>';
    }

    if (data.snapshot && data.snapshot.metrics && data.snapshot.metrics.length) {
      rows = data.snapshot.metrics.map(function (item) {
        return (
          '<div class="question-item"><strong>' +
          escapeHtml_(item.label) +
          '</strong><br />' +
          escapeHtml_(item.value) +
          '</div>'
        );
      });

      return '<div class="question-list">' + rows.join('') + '</div>';
    }

    return '';
  }

  function buildOutputSummary_(label, payload) {
    var lines = ['Última acción registrada: ' + label];

    if (payload && payload.ok === true) {
      lines.push(payload.message || 'Acción completada correctamente.');

      if (payload.source === 'apps_script_fallback') {
        lines.push('Se usó el respaldo de Apps Script porque la IA principal no respondió.');
      }

      lines.push('El detalle técnico se mantiene oculto para no distraer la operación.');

      return lines.join('\n');
    }

    if (payload && payload.ok === false) {
      lines.push(payload.message || 'La acción no se completó.');

      if (payload.code) {
        lines.push('Código: ' + payload.code);
      }

      return lines.join('\n');
    }

    return lines.concat('Se registró una respuesta técnica para revisión.').join('\n');
  }

  function shallowCopy_(value) {
    var output = {};

    Object.keys(value || {}).forEach(function (key) {
      output[key] = value[key];
    });

    return output;
  }

  function humanizeField_(fieldName) {
    var labels = {
      periodo: 'Periodo',
      centro_id: 'Centro / canal',
      ingreso_id: 'Línea de ingreso',
      servicio_id: 'Tipo de servicio',
      venta_bruta: 'Venta bruta',
      costo_variable_directo: 'Costo variable directo',
      cuenta_operativa_id: 'Caja / cuenta',
      saldo_inicial: 'Saldo inicial',
      entradas_periodo: 'Entradas',
      salidas_periodo: 'Salidas',
      costo_id: 'Tipo de costo',
      plan_cuenta_id: 'Plan de cuentas',
      subtotal: 'Subtotal',
      es_recurrente: 'Gasto recurrente',
      recurrente_alias: 'Alias recurrente',
      recurrente_desde: 'Recurrente desde',
      recurrente_hasta: 'Recurrente hasta',
      deuda_tipo_id: 'Tipo de deuda',
      acreedor: 'Acreedor',
      tipo_cartera: 'Tipo de cartera',
      contraparte: 'Contraparte',
      impuesto_tipo: 'Impuesto',
      monto_estimado: 'Monto estimado'
    };

    return labels[fieldName] || fieldName;
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
    var recordIdField = refs.summaryForm.elements.namedItem('record_id');

    if (periodField) {
      periodField.value = state.currentPeriod;
    }

    if (recordIdField) {
      recordIdField.value = '';
    }
  }

  function normalizeMonth_(value) {
    return String(value || '').slice(0, 7);
  }

  function sumRows_(rows, key) {
    return (rows || []).reduce(function (acc, row) {
      return acc + toNumber_(row[key]);
    }, 0);
  }

  function toNumber_(value) {
    return Number(value || 0);
  }

  function calculateItbisFromGross_(grossValue) {
    var gross = toNumber_(grossValue);
    return gross > 0 ? gross - gross / 1.18 : 0;
  }

  function formatInputNumber_(value) {
    var number = Number(value || 0);
    return number ? String(Math.round(number * 100) / 100) : '';
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

  function formatStatementValue_(row) {
    if (!row) {
      return '';
    }

    if (row.format === 'percent') {
      return formatPercent_(row.amount);
    }

    if (row.format === 'ratio') {
      return Number(row.amount || 0).toFixed(2) + 'x';
    }

    if (row.format === 'number') {
      return String(Math.round(Number(row.amount || 0)));
    }

    if (row.format === 'text') {
      return escapeHtml_(row.amount);
    }

    return formatCurrency_(row.amount);
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
          return pickCatalogLabel_(groups[i][j]) || value;
        }
      }
    }

    return value;
  }

  function pickCatalogLabel_(item) {
    var primary = cleanCatalogText_(item && item.nombre);
    var fallback = cleanCatalogText_(
      (item && (item.descripcion || item.uso_resumen || item.codigo || item.cuenta_id || item.id)) || ''
    );

    if (!isWeakCatalogLabel_(primary)) {
      return primary;
    }

    return fallback || primary || '';
  }

  function cleanCatalogText_(value) {
    return String(value || '').trim();
  }

  function isWeakCatalogLabel_(value) {
    return [
      '',
      'activo',
      'inactivo',
      'pasivo',
      'patrimonio',
      'ingreso',
      'gasto',
      'costo',
      'variable',
      'fijo',
      'efectivo',
      'banco',
      'transito',
      'pasarela'
    ].indexOf(cleanCatalogText_(value).toLowerCase()) >= 0;
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
