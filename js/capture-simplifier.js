(function () {
  var FORM_HINTS = {
    ingresoMensual: 'Registra primero de donde vino el ingreso y cuanto dejo antes de complicarte con mas detalles.',
    cajaMensual: 'Con saldo inicial, entradas y salidas ya puedes cuadrar la caja del mes.',
    gastoMensual: 'Empieza por el tipo de gasto y el monto. Luego agregas lo demas si hace falta.',
    deudaMensual: 'Aqui importa quien te presto, cuanto debias y cuanto pagaste este mes.',
    carteraMensual: 'Solo registra si es por cobrar o pagar, con quien y cual es el saldo.',
    impuestoMensual: 'Con el tipo de impuesto y el monto ya queda documentado lo esencial.'
  };

  var FORM_STEPS = {
    ingresoMensual: [
      { label: 'Fecha', helper: 'Elige el mes y, si quieres, el dia de referencia.', fields: ['periodo', 'fecha_referencia'] },
      { label: 'Clasificacion', helper: 'Define a que canal y a que linea pertenece.', fields: ['centro_id', 'ingreso_id', 'servicio_id'] },
      { label: 'Monto', helper: 'Registra el ingreso y su costo directo si aplica.', fields: ['venta_bruta', 'costo_variable_directo', 'itbis_monto'] },
      { label: 'Detalles', helper: 'Esto es opcional. Sirve para notas, fuente y unidades.', fields: ['unidades', 'source_reference', 'notes'] }
    ],
    cajaMensual: [
      { label: 'Fecha', helper: 'Primero define el periodo y el dia de referencia.', fields: ['periodo', 'fecha_referencia'] },
      { label: 'Cuenta', helper: 'Selecciona la caja o cuenta correcta.', fields: ['cuenta_operativa_id', 'conciliado'] },
      { label: 'Montos', helper: 'Con estos tres montos ya puedes cuadrar la caja.', fields: ['saldo_inicial', 'entradas_periodo', 'salidas_periodo'] },
      { label: 'Detalles', helper: 'Usa esto solo si quieres dejar soporte adicional.', fields: ['source_reference', 'notes'] }
    ],
    gastoMensual: [
      { label: 'Fecha', helper: 'Define el mes y el dia de referencia del gasto.', fields: ['periodo', 'fecha_referencia'] },
      { label: 'Clasificacion', helper: 'Primero ubica si es fijo, variable o financiero.', fields: ['costo_id', 'plan_cuenta_id', 'centro_id'] },
      { label: 'Monto', helper: 'Registra el subtotal; el ITBIS puede calcularse solo.', fields: ['subtotal', 'itbis_monto'] },
      { label: 'Recurrencia', helper: 'Si este gasto vuelve todos los meses, marcalo aqui.', fields: ['es_recurrente', 'recurrente_alias', 'recurrente_desde', 'recurrente_hasta', 'source_reference', 'notes'] }
    ],
    deudaMensual: [
      { label: 'Fecha', helper: 'Elige el periodo y la fecha de referencia.', fields: ['periodo', 'fecha_referencia'] },
      { label: 'Credito', helper: 'Identifica el tipo de deuda y el acreedor.', fields: ['deuda_tipo_id', 'acreedor', 'referencia'] },
      { label: 'Montos', helper: 'Aqui defines saldo, capital e intereses.', fields: ['saldo_inicial', 'nuevos_desembolsos', 'capital_pagado', 'interes_pagado', 'comisiones_pagadas'] },
      { label: 'Detalles', helper: 'Usa esto para tasa, plazo y soporte adicional.', fields: ['tasa_anual', 'plazo_meses', 'source_reference', 'notes'] }
    ],
    carteraMensual: [
      { label: 'Fecha', helper: 'Primero el periodo y la fecha de referencia.', fields: ['periodo', 'fecha_referencia'] },
      { label: 'Clasificacion', helper: 'Define si es por cobrar o pagar y con quien.', fields: ['tipo_cartera', 'contraparte', 'centro_id'] },
      { label: 'Montos', helper: 'Con saldo, movimientos y cobros/pagos ya queda la posicion.', fields: ['saldo_inicial', 'nuevos_movimientos', 'cobros_o_pagos'] },
      { label: 'Detalles', helper: 'Esto sirve para notas o marcar si esta vencido.', fields: ['vencido', 'source_reference', 'notes'] }
    ],
    impuestoMensual: [
      { label: 'Fecha', helper: 'Elige el periodo y la fecha de referencia.', fields: ['periodo', 'fecha_referencia'] },
      { label: 'Clasificacion', helper: 'Selecciona el impuesto y, si quieres, su cuenta.', fields: ['impuesto_tipo', 'plan_cuenta_id', 'fecha_vencimiento', 'estado_impuesto'] },
      { label: 'Monto', helper: 'Con el estimado y el pagado ya queda documentado.', fields: ['base_imponible', 'monto_estimado', 'monto_pagado'] },
      { label: 'Detalles', helper: 'Agrega soporte o comentarios si hace falta.', fields: ['source_reference', 'notes'] }
    ]
  };

  var COST_CATEGORY_MAP = {
    CST_INSUMOS_PRODUCCION: 'VARIABLE',
    CST_MANO_OBRA_DIRECTA: 'VARIABLE',
    CST_COMBUSTIBLE_RUTAS: 'VARIABLE',
    CST_EMPAQUE: 'VARIABLE',
    CST_NOMINA_ADMIN: 'FIJO',
    CST_ALQUILER_SERVICIOS: 'FIJO',
    CST_MARKETING: 'FIJO',
    CST_SOFTWARE_HONORARIOS: 'FIJO',
    CST_INTERESES: 'FINANCIERO',
    CST_COMISIONES_FINANCIERAS: 'FINANCIERO'
  };

  var COST_CATEGORY_LABELS = {
    VARIABLE: 'Variable',
    FIJO: 'Fijo',
    FINANCIERO: 'Financiero'
  };

  function onReady_(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
      return;
    }

    callback();
  }

  function getActiveView_() {
    var active = document.querySelector('.nav-link.is-active');
    return active ? active.getAttribute('data-view-target') : '';
  }

  function getActiveForm_() {
    var active = document.querySelector('.tab.is-active');
    return active ? active.getAttribute('data-form-target') : '';
  }

  function syncTopbarActions_() {
    var actions = document.querySelector('.topbar-actions');

    if (!actions) {
      return;
    }

    actions.classList.toggle('ux-simplifier-hidden', getActiveView_() !== 'control');
  }

  function simplifyNavigation_() {
    var navLabels = {
      cargas: ['Registrar', 'Movimientos uno por uno'],
      estados: ['Estados', 'ER, flujo, balance y deuda'],
      control: ['Ajustes', 'Catalogos y conexion']
    };

    Array.prototype.slice.call(document.querySelectorAll('.nav-link')).forEach(function (button) {
      var target = button.getAttribute('data-view-target');
      var label = button.querySelector('.nav-label');
      var note = button.querySelector('.nav-note');

      if (target === 'panel' || target === 'chat') {
        button.classList.add('ux-hidden-nav');
        return;
      }

      if (navLabels[target]) {
        if (label) {
          label.textContent = navLabels[target][0];
        }
        if (note) {
          note.textContent = navLabels[target][1];
        }
      }
    });

    if (getActiveView_() === 'panel' || getActiveView_() === 'chat') {
      openView_('cargas');
    }
  }

  function ensureCaptureGuide_() {
    var cargasView = document.querySelector('[data-view="cargas"]');
    var tabRow = cargasView && cargasView.querySelector('.tab-row');
    var existing = document.getElementById('simpleCaptureGuide');
    var panel;

    if (!tabRow || existing) {
      return;
    }

    panel = tabRow.parentElement;
    if (!panel) {
      return;
    }

    existing = document.createElement('div');
    existing.id = 'simpleCaptureGuide';
    existing.className = 'simple-capture-guide';
    existing.innerHTML =
      '<strong>Hoy quiero registrar una sola cosa a la vez</strong>' +
      '<span>Elige el tipo de movimiento y te ire guiando paso a paso: fecha, clasificacion, monto y detalles opcionales.</span>';

    panel.insertBefore(existing, tabRow);
  }

  function ensureMonthCompletionGuide_() {
    var stepsRoot = document.getElementById('monthSteps');
    var cardsRoot = document.getElementById('monthSummaryCards');
    var existing = document.getElementById('simpleCompletionGuide');
    var stepCards;
    var pending;
    var optional;
    var buttonHtml = '';
    var message = '';
    var parent;

    if (!stepsRoot || !cardsRoot) {
      return;
    }

    stepCards = Array.prototype.slice.call(stepsRoot.querySelectorAll('.workflow-step'));
    if (!stepCards.length) {
      return;
    }

    pending = stepCards.filter(function (step) {
      return step.classList.contains('workflow-step--pending');
    });
    optional = stepCards.filter(function (step) {
      return step.classList.contains('workflow-step--optional');
    });

    if (pending.length) {
      message =
        'Todavia te falta cargar: ' +
        pending
          .map(function (step) {
            var label = step.querySelector('.workflow-step__label');
            return label ? label.textContent.trim() : '';
          })
          .filter(Boolean)
          .join(', ') +
        '.';

      buttonHtml = buildCompletionGuideButton_(pending[0]);
    } else if (optional.length) {
      message =
        'La base del mes ya esta lista. Ahora puedes completar deuda, cartera o impuestos si aplican y luego revisar Estados.';
      buttonHtml = buildCompletionGuideButton_(optional[0]);
    } else {
      message =
        'El mes ya tiene la carga base completa. Lo siguiente es revisar Estados y confirmar utilidad, caja y deuda.';
    }

    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'simpleCompletionGuide';
      existing.className = 'simple-completion-guide';
      parent = cardsRoot.parentElement;
      if (!parent) {
        return;
      }
      parent.insertBefore(existing, stepsRoot);
    }

    existing.innerHTML =
      '<div class="simple-completion-guide__copy">' +
      '<strong>Que le falta a este mes</strong>' +
      '<span>' + escapeHtml_(message) + '</span>' +
      '</div>' +
      '<div class="simple-completion-guide__actions">' +
      buttonHtml +
      '<button type="button" class="ghost-button" data-open-view="estados">Ver estados del mes</button>' +
      '</div>';
  }

  function buildCompletionGuideButton_(stepCard) {
    var button = stepCard && stepCard.querySelector('[data-open-form]');
    var formKey = button && button.getAttribute('data-open-form');
    var label = stepCard && stepCard.querySelector('.workflow-step__label');

    if (!formKey) {
      return '';
    }

    return (
      '<button type="button" class="ghost-button" data-open-form="' +
      escapeHtml_(formKey) +
      '">' +
      'Abrir ' +
      escapeHtml_(label ? label.textContent.trim() : 'siguiente paso') +
      '</button>'
    );
  }

  function ensureReferenceDateField_(formGrid) {
    var existing = formGrid.querySelector('[name="fecha_referencia"]');
    var periodField = formGrid.querySelector('[name="periodo"]');
    var wrapper;

    if (existing || !periodField) {
      return;
    }

    wrapper = document.createElement('div');
    wrapper.className = 'field';
    wrapper.innerHTML =
      '<label for="fecha_referencia">Fecha de referencia</label>' +
      '<input id="fecha_referencia" name="fecha_referencia" type="date" />';

    periodField.parentElement.insertAdjacentElement('afterend', wrapper);
  }

  function simplifyForm_() {
    var summaryForm = document.getElementById('summaryForm');
    var formKey = getActiveForm_();
    var steps = FORM_STEPS[formKey] || [];
    var formGrid;
    var actions;
    var fields;
    var fieldMap = {};
    var wizard;
    var wizardHeader;
    var progress;
    var panes;
    var footer;
    var saveButton;
    var extraActions;

    if (
      !summaryForm ||
      !formKey ||
      (
        summaryForm.getAttribute('data-ux-form') === formKey &&
        summaryForm.querySelector('.wizard-shell')
      )
    ) {
      return;
    }

    formGrid = summaryForm.querySelector('.form-grid');
    actions = summaryForm.querySelector('.chat-actions');

    if (!formGrid || !actions) {
      return;
    }

    ensureReferenceDateField_(formGrid);
    fields = Array.prototype.slice.call(formGrid.children);
    fields.forEach(function (field) {
      var input = field.querySelector('[name]');
      if (input) {
        fieldMap[input.getAttribute('name')] = field;
      }
    });

    wizard = document.createElement('section');
    wizard.className = 'simple-form-block wizard-shell';
    wizardHeader = document.createElement('div');
    wizardHeader.className = 'simple-form-header';
    wizardHeader.innerHTML =
      '<strong>Paso a paso</strong>' +
      '<span>' + escapeHtml_(FORM_HINTS[formKey] || 'Completa lo minimo necesario para guardar.') + '</span>';
    wizard.appendChild(wizardHeader);

    progress = document.createElement('div');
    progress.className = 'wizard-progress';
    steps.forEach(function (step, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'wizard-progress__step';
      button.setAttribute('data-wizard-go', String(index));
      button.innerHTML =
        '<span>' + String(index + 1) + '</span>' +
        '<strong>' + escapeHtml_(step.label) + '</strong>';
      progress.appendChild(button);
    });
    wizard.appendChild(progress);

    panes = document.createElement('div');
    panes.className = 'wizard-panes';
    steps.forEach(function (step, index) {
      var pane = document.createElement('section');
      var grid = document.createElement('div');

      pane.className = 'wizard-pane';
      pane.setAttribute('data-wizard-step', String(index));
      pane.innerHTML =
        '<div class="wizard-pane__head">' +
        '<strong>' + escapeHtml_(step.label) + '</strong>' +
        '<span>' + escapeHtml_(step.helper || '') + '</span>' +
        '</div>';

      if (formKey === 'gastoMensual' && step.label === 'Clasificacion') {
        pane.appendChild(buildCostCategoryHelper_());
      }

      grid.className = 'form-grid form-grid--primary';
      step.fields.forEach(function (fieldName) {
        if (fieldMap[fieldName]) {
          grid.appendChild(fieldMap[fieldName]);
        }
      });

      pane.appendChild(grid);
      panes.appendChild(pane);
    });
    wizard.appendChild(panes);

    saveButton = actions.querySelector('button[type="submit"]');
    extraActions = document.createElement('div');
    extraActions.className = 'wizard-secondary-actions';
    Array.prototype.slice.call(actions.children).forEach(function (child) {
      if (child !== saveButton) {
        extraActions.appendChild(child);
      }
    });

    footer = document.createElement('div');
    footer.className = 'wizard-footer';
    footer.innerHTML =
      '<div class="wizard-footer__main">' +
      '<button type="button" class="ghost-button" data-wizard-prev>Atras</button>' +
      '<button type="button" class="solid-button" data-wizard-next>Siguiente</button>' +
      '</div>';
    if (saveButton) {
      footer.querySelector('.wizard-footer__main').appendChild(saveButton);
      saveButton.classList.add('wizard-save-button');
    }
    wizard.appendChild(footer);

    if (extraActions.children.length) {
      wizard.appendChild(extraActions);
    }

    summaryForm.insertBefore(wizard, formGrid);
    formGrid.remove();
    actions.remove();
    summaryForm.setAttribute('data-ux-form', formKey);
    summaryForm.setAttribute('data-wizard-step', '0');

    attachWizardEvents_(summaryForm);
    setupCostCategoryHelper_(summaryForm, formKey);
    relabelSupportActions_(summaryForm, formKey);
    syncWizardStep_(summaryForm, 0);
  }

  function buildCostCategoryHelper_() {
    var wrapper = document.createElement('div');
    wrapper.className = 'cost-category-helper';
    wrapper.innerHTML =
      '<div class="cost-category-helper__head">' +
      '<strong>Clasificacion del gasto</strong>' +
      '<span>Esto te ayuda a encontrar rapido si el gasto es fijo, variable o financiero.</span>' +
      '</div>' +
      '<div class="cost-category-helper__current" data-cost-category-current hidden></div>' +
      '<div class="cost-category-helper__choices">' +
      '<button type="button" class="cost-category-helper__pill is-active" data-cost-category="TODOS">Todos</button>' +
      '<button type="button" class="cost-category-helper__pill" data-cost-category="VARIABLE">Variable</button>' +
      '<button type="button" class="cost-category-helper__pill" data-cost-category="FIJO">Fijo</button>' +
      '<button type="button" class="cost-category-helper__pill" data-cost-category="FINANCIERO">Financiero</button>' +
      '</div>';
    return wrapper;
  }

  function setupCostCategoryHelper_(summaryForm, formKey) {
    var helper;
    var select;

    if (formKey !== 'gastoMensual') {
      return;
    }

    helper = summaryForm.querySelector('.cost-category-helper');
    select = summaryForm.querySelector('[name="costo_id"]');

    if (!helper || !select || helper.getAttribute('data-bound') === 'yes') {
      return;
    }

    helper.addEventListener('click', function (event) {
      var button = event.target.closest('[data-cost-category]');
      var category = button && button.getAttribute('data-cost-category');

      if (!category) {
        return;
      }

      Array.prototype.slice.call(helper.querySelectorAll('[data-cost-category]')).forEach(function (pill) {
        pill.classList.toggle('is-active', pill === button);
      });

      Array.prototype.slice.call(select.options).forEach(function (option) {
        var optionCategory = COST_CATEGORY_MAP[option.value] || 'TODOS';
        var matches = category === 'TODOS' || optionCategory === category || option.value === '';
        option.hidden = !matches;
      });

      if (select.value && category !== 'TODOS' && COST_CATEGORY_MAP[select.value] !== category) {
        select.value = '';
      }

      updateSelectedCostCategoryHint_(helper, select);
    });

    select.addEventListener('change', function () {
      updateSelectedCostCategoryHint_(helper, select);
    });

    helper.setAttribute('data-bound', 'yes');
    updateSelectedCostCategoryHint_(helper, select);
  }

  function updateSelectedCostCategoryHint_(helper, select) {
    var hint = helper.querySelector('[data-cost-category-current]');
    var category = COST_CATEGORY_MAP[select.value];

    if (!hint) {
      return;
    }

    if (!category) {
      hint.hidden = true;
      hint.textContent = '';
      return;
    }

    hint.hidden = false;
    hint.textContent =
      'Clasificacion actual: ' +
      (COST_CATEGORY_LABELS[category] || category) +
      '. Si vuelve cada mes, marcalo como recurrente en el paso siguiente.';
  }

  function relabelSupportActions_(summaryForm, formKey) {
    var copyRecurringButton = summaryForm.querySelector('#copyRecurringButton');
    var loadDraftButton = summaryForm.querySelector('#loadDraftButton');
    var newRecordButton = summaryForm.querySelector('#newRecordButton');

    if (loadDraftButton) {
      loadDraftButton.textContent = 'Recuperar borrador local';
    }

    if (newRecordButton) {
      newRecordButton.textContent = 'Limpiar formulario';
    }

    if (formKey === 'gastoMensual' && copyRecurringButton) {
      copyRecurringButton.textContent = 'Traer gastos recurrentes';
      copyRecurringButton.title = 'Copia al periodo actual los gastos marcados como recurrentes.';
    }
  }

  function bindSimplifierEvents_() {
    if (document.body.getAttribute('data-ux-events-bound') === 'yes') {
      return;
    }

    document.body.addEventListener('click', function (event) {
      var formButton = event.target.closest('[data-open-form]');
      var viewButton = event.target.closest('[data-open-view]');
      var formKey;

      if (formButton && !formButton.closest('#monthSteps')) {
        event.preventDefault();
        formKey = formButton.getAttribute('data-open-form');
        openForm_(formKey);
        return;
      }

      if (viewButton) {
        event.preventDefault();
        openView_(viewButton.getAttribute('data-open-view'));
      }
    });

    document.body.setAttribute('data-ux-events-bound', 'yes');
  }

  function openForm_(formKey) {
    var button;

    if (!formKey) {
      return;
    }

    button = document.querySelector('[data-form-target="' + formKey + '"]');
    if (button) {
      button.click();
      window.requestAnimationFrame(function () {
        var summaryForm = document.getElementById('summaryForm');
        if (summaryForm && typeof summaryForm.scrollIntoView === 'function') {
          summaryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  function openView_(viewKey) {
    var button;

    if (!viewKey) {
      return;
    }

    button = document.querySelector('[data-view-target="' + viewKey + '"]');
    if (button) {
      button.click();
    }
  }

  function attachWizardEvents_(summaryForm) {
    if (summaryForm.getAttribute('data-wizard-bound') === 'yes') {
      return;
    }

    summaryForm.addEventListener('click', function (event) {
      var nextButton = event.target.closest('[data-wizard-next]');
      var prevButton = event.target.closest('[data-wizard-prev]');
      var goButton = event.target.closest('[data-wizard-go]');
      var currentStep = Number(summaryForm.getAttribute('data-wizard-step') || 0);

      if (nextButton) {
        event.preventDefault();
        if (!validateWizardStep_(summaryForm, currentStep)) {
          return;
        }
        syncWizardStep_(summaryForm, currentStep + 1);
        return;
      }

      if (prevButton) {
        event.preventDefault();
        syncWizardStep_(summaryForm, currentStep - 1);
        return;
      }

      if (goButton) {
        event.preventDefault();
        syncWizardStep_(summaryForm, Number(goButton.getAttribute('data-wizard-go') || 0));
      }
    });

    summaryForm.setAttribute('data-wizard-bound', 'yes');
  }

  function validateWizardStep_(summaryForm, stepIndex) {
    var pane = summaryForm.querySelector('[data-wizard-step="' + String(stepIndex) + '"]');
    var controls = pane ? pane.querySelectorAll('input, select, textarea') : [];
    var isValid = true;

    Array.prototype.slice.call(controls).forEach(function (control) {
      if (typeof control.reportValidity === 'function' && !control.reportValidity()) {
        isValid = false;
      }
    });

    return isValid;
  }

  function syncWizardStep_(summaryForm, nextIndex) {
    var panes = Array.prototype.slice.call(summaryForm.querySelectorAll('.wizard-pane'));
    var progress = Array.prototype.slice.call(summaryForm.querySelectorAll('[data-wizard-go]'));
    var boundedIndex = Math.max(0, Math.min(nextIndex, panes.length - 1));
    var prevButton = summaryForm.querySelector('[data-wizard-prev]');
    var nextButton = summaryForm.querySelector('[data-wizard-next]');
    var saveButton = summaryForm.querySelector('.wizard-save-button');

    panes.forEach(function (pane, index) {
      pane.classList.toggle('is-active', index === boundedIndex);
    });

    progress.forEach(function (button, index) {
      button.classList.toggle('is-active', index === boundedIndex);
      button.classList.toggle('is-complete', index < boundedIndex);
    });

    if (prevButton) {
      prevButton.disabled = boundedIndex === 0;
    }

    if (nextButton) {
      nextButton.style.display = boundedIndex >= panes.length - 1 ? 'none' : '';
    }

    if (saveButton) {
      saveButton.style.display = boundedIndex >= panes.length - 1 ? '' : 'none';
    }

    summaryForm.setAttribute('data-wizard-step', String(boundedIndex));
  }

  function simplifyPeriodRecords_() {
    var records = document.getElementById('periodRecords');
    var section = records && records.parentElement;
    var wrapper = document.getElementById('recordsFold');
    var content;
    var summary;
    var rowCount;
    var recordIdField;

    if (!records || !section) {
      return;
    }

    if (!wrapper) {
      wrapper = document.createElement('details');
      wrapper.id = 'recordsFold';
      wrapper.className = 'records-fold';
      wrapper.innerHTML =
        '<summary>Ver movimientos cargados y corregirlos</summary>' +
        '<div class="records-fold__content"></div>';
      section.appendChild(wrapper);
    }

    content = wrapper.querySelector('.records-fold__content');
    summary = wrapper.querySelector('summary');
    rowCount = records.querySelectorAll('tbody tr').length;
    recordIdField = document.getElementById('record_id');

    if (summary) {
      summary.textContent = rowCount
        ? 'Ver ' + String(rowCount) + ' movimientos cargados y corregirlos'
        : 'Ver movimientos cargados y corregirlos';
    }

    if (content && records.parentElement !== content) {
      content.appendChild(records);
    }

    if ((recordIdField && recordIdField.value) || (rowCount && rowCount <= 5)) {
      wrapper.open = true;
    }
  }

  function trimEmptyFeed_() {
    var emptyTip = document.querySelector('.feed-item.feed-item--empty');
    var feed = document.getElementById('activityFeed');

    if (!feed || !emptyTip) {
      return;
    }

    if (feed.children.length > 4) {
      emptyTip.style.display = 'none';
    }
  }

  function apply_() {
    document.body.classList.add('ux-simplified');
    simplifyNavigation_();
    syncTopbarActions_();
    ensureCaptureGuide_();
    ensureMonthCompletionGuide_();
    simplifyForm_();
    simplifyPeriodRecords_();
    trimEmptyFeed_();
    bindSimplifierEvents_();
  }

  function escapeHtml_(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  onReady_(function () {
    var observer = new MutationObserver(function () {
      window.requestAnimationFrame(apply_);
    });

    apply_();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });
})();
