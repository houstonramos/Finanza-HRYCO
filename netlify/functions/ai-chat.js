const crypto = require('node:crypto');

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const MODE_VALUES = ['cargar', 'consultar', 'analizar'];
const LOAD_ENTITIES = [
  'ingresoMensual',
  'cajaMensual',
  'gastoMensual',
  'deudaMensual',
  'carteraMensual',
  'impuestoMensual'
];
const DRAFT_FIELDS = [
  'periodo',
  'centro_id',
  'ingreso_id',
  'servicio_id',
  'unidades',
  'venta_bruta',
  'itbis_monto',
  'costo_variable_directo',
  'source_reference',
  'notes',
  'cuenta_operativa_id',
  'saldo_inicial',
  'entradas_periodo',
  'salidas_periodo',
  'saldo_final',
  'conciliado',
  'costo_id',
  'plan_cuenta_id',
  'subtotal',
  'deuda_tipo_id',
  'acreedor',
  'referencia',
  'tasa_anual',
  'plazo_meses',
  'nuevos_desembolsos',
  'capital_pagado',
  'interes_pagado',
  'comisiones_pagadas',
  'tipo_cartera',
  'contraparte',
  'nuevos_movimientos',
  'cobros_o_pagos',
  'vencido',
  'impuesto_tipo',
  'base_imponible',
  'monto_estimado',
  'monto_pagado',
  'fecha_vencimiento',
  'estado_impuesto'
];
const NUMERIC_FIELDS = [
  'unidades',
  'venta_bruta',
  'itbis_monto',
  'costo_variable_directo',
  'saldo_inicial',
  'entradas_periodo',
  'salidas_periodo',
  'saldo_final',
  'subtotal',
  'tasa_anual',
  'plazo_meses',
  'nuevos_desembolsos',
  'capital_pagado',
  'interes_pagado',
  'comisiones_pagadas',
  'nuevos_movimientos',
  'cobros_o_pagos',
  'base_imponible',
  'monto_estimado',
  'monto_pagado'
];
const BOOLEAN_FIELDS = ['conciliado', 'vencido'];
const CATALOG_FIELD_MAP = {
  centro_id: 'centros',
  ingreso_id: 'ingresos',
  servicio_id: 'servicios',
  cuenta_operativa_id: 'cajasCuentas',
  costo_id: 'costos',
  deuda_tipo_id: 'deudasTipos',
  plan_cuenta_id: 'planCuentas'
};
const QUESTION_MAP = {
  ingresoMensual: [
    ['periodo', '¿Qué periodo estás cargando? Usa formato YYYY-MM.'],
    ['centro_id', '¿A qué centro o canal corresponde?'],
    ['ingreso_id', '¿Qué línea de ingreso es?'],
    ['servicio_id', '¿Qué tipo de servicio produjo ese ingreso?'],
    ['venta_bruta', '¿Cuál fue la venta bruta del periodo?'],
    ['costo_variable_directo', '¿Cuál fue el costo variable directo de ese resumen?']
  ],
  cajaMensual: [
    ['periodo', '¿Qué periodo estás cargando?'],
    ['cuenta_operativa_id', '¿Qué caja o cuenta quieres resumir?'],
    ['saldo_inicial', '¿Cuál fue el saldo inicial?'],
    ['entradas_periodo', '¿Cuánto entró en el periodo?'],
    ['salidas_periodo', '¿Cuánto salió en el periodo?']
  ],
  gastoMensual: [
    ['periodo', '¿Qué periodo estás cargando?'],
    ['costo_id', '¿Qué tipo de costo o gasto es?'],
    ['subtotal', '¿Cuál es el subtotal del gasto del periodo?']
  ],
  deudaMensual: [
    ['periodo', '¿Qué periodo estás cargando?'],
    ['deuda_tipo_id', '¿Qué tipo de deuda es?'],
    ['acreedor', '¿Quién es el acreedor?'],
    ['saldo_inicial', '¿Cuál fue el saldo inicial de la deuda?']
  ],
  carteraMensual: [
    ['periodo', '¿Qué periodo estás cargando?'],
    ['tipo_cartera', '¿Es CXC o CXP?'],
    ['contraparte', '¿Quién es la contraparte principal?'],
    ['saldo_inicial', '¿Cuál fue el saldo inicial?']
  ],
  impuestoMensual: [
    ['periodo', '¿Qué periodo estás cargando?'],
    ['impuesto_tipo', '¿Qué impuesto estás registrando?'],
    ['monto_estimado', '¿Cuál es el monto estimado o causado del periodo?']
  ]
};

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Usa POST para consumir el chat IA.'
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(200, {
      ok: false,
      code: 'AI_NOT_CONFIGURED',
      message: 'Falta OPENAI_API_KEY en Netlify. El chat seguira usando el respaldo controlado.'
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, {
      ok: false,
      code: 'INVALID_JSON',
      message: 'El body enviado al chat IA no es JSON valido.'
    });
  }

  const requestId = buildRequestId('AI');
  const payload = body.payload || {};

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        store: false,
        instructions: buildInstructions_(),
        input: JSON.stringify(buildPromptPayload_(payload), null, 2),
        text: {
          format: {
            type: 'json_schema',
            name: 'ebg_chat_result',
            schema: buildSchema_(),
            strict: true
          }
        },
        safety_identifier: hashActor_(body.actor || 'anonymous')
      })
    });

    const raw = await response.json();

    if (!response.ok) {
      return jsonResponse(200, {
        ok: false,
        code: 'AI_UPSTREAM_ERROR',
        message: 'La IA no respondio correctamente en este momento.',
        requestId: requestId,
        details: {
          status: response.status,
          error: raw && raw.error ? raw.error.message : 'Sin detalle adicional.'
        }
      });
    }

    const parsed = extractStructuredPayload_(raw);

    if (!parsed) {
      return jsonResponse(200, {
        ok: false,
        code: 'AI_EMPTY_RESPONSE',
        message: 'La IA no devolvio un JSON utilizable.',
        requestId: requestId
      });
    }

    return jsonResponse(200, {
      ok: true,
      code: 'AI_CHAT_OK',
      message: 'Respuesta IA lista.',
      requestId: requestId,
      data: normalizeChatResult_(parsed, payload),
      meta: {
        model: DEFAULT_MODEL
      }
    });
  } catch (error) {
    return jsonResponse(200, {
      ok: false,
      code: 'AI_HANDLER_ERROR',
      message: 'No se pudo procesar la respuesta del chat IA.',
      requestId: requestId,
      details: {
        error: error.message
      }
    });
  }
};

function buildInstructions_() {
  return [
    'Eres el chat IA controlado de Houston Ramos y Co Finance.',
    'Responde en espanol claro, corto y util para un dueno de empresa con equipo pequeno.',
    'Nunca inventes registros, ids, montos, periodos ni clasificaciones.',
    'Si el modo es cargar, convierte el texto libre en un borrador estructurado.',
    'Si faltan datos, deja el campo vacio y formula preguntas concretas.',
    'Usa solo ids que existan en los catalogos enviados.',
    'Si el usuario responde una pregunta de seguimiento, completa el borrador previo sin borrar lo ya confirmado.',
    'Si el modo es consultar o analizar, responde solo con la data real del dashboard recibido.',
    'Si no hay dashboard real, dilo claramente.'
  ].join(' ');
}

function buildPromptPayload_(payload) {
  const context = payload.context || {};

  return {
    requested_mode: normalizeMode_(payload.mode),
    user_message: String(payload.message || ''),
    current_period: normalizeMonth_(context.periodo || ''),
    previous_entity: context.previousEntity || '',
    previous_draft: context.previousDraft || {},
    previous_questions: context.previousQuestions || [],
    history: Array.isArray(context.history) ? context.history.slice(-8) : [],
    catalogs: simplifyCatalogs_(context.catalogs || {}),
    dashboard: context.dashboard || null
  };
}

function buildSchema_() {
  const draftProperties = {};

  DRAFT_FIELDS.forEach(function eachField(fieldName) {
    draftProperties[fieldName] = { type: 'string' };
  });

  NUMERIC_FIELDS.forEach(function eachField(fieldName) {
    draftProperties[fieldName] = { type: 'number' };
  });

  BOOLEAN_FIELDS.forEach(function eachField(fieldName) {
    draftProperties[fieldName] = { type: 'boolean' };
  });

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: {
        type: 'string',
        enum: MODE_VALUES
      },
      intent: {
        type: 'string',
        enum: LOAD_ENTITIES.concat(['query', 'analysis'])
      },
      entity: {
        type: 'string',
        enum: [''].concat(LOAD_ENTITIES)
      },
      draft: {
        type: 'object',
        additionalProperties: false,
        properties: draftProperties
      },
      guidance: { type: 'string' },
      answer: { type: 'string' },
      confidence: {
        type: 'string',
        enum: ['alta', 'media', 'baja']
      },
      snapshot: {
        type: 'object',
        additionalProperties: false,
        properties: {
          period: { type: 'string' },
          summary: { type: 'string' },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                value: { type: 'string' }
              },
              required: ['label', 'value']
            }
          },
          observations: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['period', 'summary', 'metrics', 'observations']
      }
    },
    required: ['mode', 'intent', 'entity', 'draft', 'guidance', 'answer', 'confidence', 'snapshot']
  };
}

function extractStructuredPayload_(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (raw.output_parsed && typeof raw.output_parsed === 'object') {
    return raw.output_parsed;
  }

  if (typeof raw.output_text === 'string') {
    return safeJsonParse_(raw.output_text);
  }

  if (!Array.isArray(raw.output)) {
    return null;
  }

  return raw.output.reduce(function reduceOutput(found, item) {
    if (found) {
      return found;
    }

    return extractFromContent_(item && item.content);
  }, null);
}

function extractFromContent_(content) {
  if (!Array.isArray(content)) {
    return null;
  }

  return content.reduce(function reduceContent(found, item) {
    if (found) {
      return found;
    }

    if (item && typeof item === 'object') {
      if (item.json && typeof item.json === 'object') {
        return item.json;
      }

      if (typeof item.text === 'string') {
        return safeJsonParse_(item.text);
      }
    }

    return null;
  }, null);
}

function normalizeChatResult_(result, payload) {
  const context = payload.context || {};
  const mode = normalizeMode_(result.mode || payload.mode);
  const fallbackEntity =
    resolveLoadEntity_(context.previousEntity) || inferEntityFromText_(payload.message || '');
  const entity = mode === 'cargar' ? resolveLoadEntity_(result.entity) || fallbackEntity : '';
  const intent = normalizeIntent_(result.intent, mode, entity);
  const draft =
    mode === 'cargar'
      ? sanitizeDraft_(
          mergeDrafts_(context.previousDraft || {}, result.draft || {}),
          entity,
          context
        )
      : {};
  const questions = mode === 'cargar' ? buildQuestions_(entity, draft) : [];

  return {
    mode: mode,
    intent: intent,
    entity: entity,
    draft: draft,
    questions: questions,
    guidance: buildGuidance_(mode, entity, questions, context.dashboard, result.guidance),
    answer: buildAnswer_(mode, questions, context.dashboard, result.answer),
    snapshot: buildSnapshot_(mode, draft, context, questions, result.snapshot),
    confidence: normalizeConfidence_(result.confidence)
  };
}

function mergeDrafts_(previousDraft, nextDraft) {
  const merged = Object.assign({}, previousDraft || {});

  Object.keys(nextDraft || {}).forEach(function eachKey(key) {
    const value = nextDraft[key];

    if (value === '' || value === null || typeof value === 'undefined') {
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function sanitizeDraft_(draft, entity, context) {
  const output = {};
  const catalogs = context.catalogs || {};

  DRAFT_FIELDS.forEach(function eachField(fieldName) {
    const value = draft[fieldName];

    if (value === '' || value === null || typeof value === 'undefined') {
      return;
    }

    if (BOOLEAN_FIELDS.indexOf(fieldName) >= 0) {
      output[fieldName] = normalizeBoolean_(value);
      return;
    }

    if (NUMERIC_FIELDS.indexOf(fieldName) >= 0) {
      const parsed = normalizeNumber_(value);

      if (parsed !== null) {
        output[fieldName] = parsed;
      }
      return;
    }

    output[fieldName] = String(value).trim();
  });

  output.periodo = normalizeMonth_(output.periodo || context.periodo || '');

  Object.keys(CATALOG_FIELD_MAP).forEach(function eachField(fieldName) {
    if (!output[fieldName]) {
      return;
    }

    output[fieldName] = resolveCatalogId_(catalogs, CATALOG_FIELD_MAP[fieldName], output[fieldName]);
  });

  if (output.tipo_cartera) {
    output.tipo_cartera = normalizeEnum_(output.tipo_cartera, ['CXC', 'CXP']);
  }

  if (output.impuesto_tipo) {
    output.impuesto_tipo = normalizeEnum_(output.impuesto_tipo, ['ITBIS', 'ISR', 'OTRO']);
  }

  if (output.estado_impuesto) {
    output.estado_impuesto = normalizeEnum_(output.estado_impuesto, ['PENDIENTE', 'PAGADO']);
  }

  if (entity !== 'ingresoMensual') {
    deleteFields_(output, ['ingreso_id', 'servicio_id', 'unidades', 'venta_bruta', 'itbis_monto', 'costo_variable_directo']);
  }

  if (entity !== 'cajaMensual') {
    deleteFields_(output, ['cuenta_operativa_id', 'saldo_inicial', 'entradas_periodo', 'salidas_periodo', 'saldo_final', 'conciliado']);
  }

  if (entity !== 'gastoMensual') {
    deleteFields_(output, ['costo_id', 'plan_cuenta_id', 'subtotal', 'itbis_monto']);
  }

  if (entity !== 'deudaMensual') {
    deleteFields_(output, ['deuda_tipo_id', 'acreedor', 'referencia', 'tasa_anual', 'plazo_meses', 'saldo_inicial', 'nuevos_desembolsos', 'capital_pagado', 'interes_pagado', 'comisiones_pagadas']);
  }

  if (entity !== 'carteraMensual') {
    deleteFields_(output, ['tipo_cartera', 'contraparte', 'saldo_inicial', 'nuevos_movimientos', 'cobros_o_pagos', 'vencido']);
  }

  if (entity !== 'impuestoMensual') {
    deleteFields_(output, ['impuesto_tipo', 'plan_cuenta_id', 'base_imponible', 'monto_estimado', 'monto_pagado', 'fecha_vencimiento', 'estado_impuesto']);
  }

  return removeEmptyValues_(output);
}

function buildQuestions_(entity, draft) {
  if (!entity) {
    return [
      {
        field: 'entity',
        question: 'Necesito saber si esto es ingreso, caja, gasto, deuda, cartera o impuesto.'
      }
    ];
  }

  return (QUESTION_MAP[entity] || [])
    .filter(function eachQuestion(pair) {
      const value = draft[pair[0]];
      return value === '' || value === null || typeof value === 'undefined';
    })
    .map(function mapQuestion(pair) {
      return {
        field: pair[0],
        question: pair[1]
      };
    });
}

function buildGuidance_(mode, entity, questions, dashboard, rawGuidance) {
  if (mode === 'consultar') {
    return dashboard && dashboard.overview
      ? 'Use la data del periodo cargado para responder la consulta.'
      : 'Todavia no hay data real sincronizada para responder esa consulta con seguridad.';
  }

  if (mode === 'analizar') {
    return dashboard && dashboard.overview
      ? 'Use la data del periodo para una lectura gerencial corta.'
      : 'Todavia no hay data real sincronizada para analizar sin inventar.';
  }

  if (!entity) {
    return 'Primero necesito identificar a que formulario pertenece esta carga.';
  }

  if (questions.length) {
    return 'Prepare un borrador inicial y marque lo que falta antes de pasarlo al formulario.';
  }

  return String(rawGuidance || 'El borrador ya puede pasar al formulario para revision.');
}

function buildAnswer_(mode, questions, dashboard, rawAnswer) {
  if (mode === 'consultar' || mode === 'analizar') {
    if (!dashboard || !dashboard.overview) {
      return 'Aun no tengo data real sincronizada para responder esa consulta con seguridad.';
    }

    return String(rawAnswer || '').trim() || 'La lectura del periodo quedo lista.';
  }

  if (questions.length) {
    return 'Todavia faltan algunos datos clave para guardar bien el resumen.';
  }

  return String(rawAnswer || '').trim() || 'El borrador ya puede pasar al formulario para confirmacion.';
}

function buildSnapshot_(mode, draft, context, questions, rawSnapshot) {
  if (mode === 'consultar' || mode === 'analizar') {
    const dashboard = context.dashboard || {};
    const overview = dashboard.overview || {};

    return {
      period: normalizeMonth_((rawSnapshot && rawSnapshot.period) || dashboard.period || context.periodo || ''),
      summary:
        String(rawSnapshot && rawSnapshot.summary ? rawSnapshot.summary : '').trim() ||
        (mode === 'consultar'
          ? 'Consulta basada en el dashboard del periodo.'
          : 'Analisis basado en el dashboard del periodo.'),
      metrics: normalizeSnapshotMetrics_(rawSnapshot && rawSnapshot.metrics, overview),
      observations: normalizeObservations_(rawSnapshot && rawSnapshot.observations)
    };
  }

  return {
    period: normalizeMonth_(draft.periodo || context.periodo || ''),
    summary: questions.length
      ? 'Borrador parcial listo para completar.'
      : 'Borrador estructurado listo para revisar.',
    metrics: buildDraftMetrics_(draft),
    observations: questions.length
      ? ['Faltan datos obligatorios antes de guardar.']
      : ['El registro ya puede pasar al formulario de confirmacion.']
  };
}

function buildDraftMetrics_(draft) {
  return [
    metricOrNull_('Venta bruta', draft.venta_bruta),
    metricOrNull_('Costo variable directo', draft.costo_variable_directo),
    metricOrNull_('Subtotal', draft.subtotal),
    metricOrNull_('Saldo inicial', draft.saldo_inicial),
    metricOrNull_('Monto estimado', draft.monto_estimado)
  ].filter(Boolean);
}

function normalizeSnapshotMetrics_(metrics, overview) {
  if (Array.isArray(metrics) && metrics.length) {
    return metrics
      .filter(function eachMetric(item) {
        return item && item.label && item.value;
      })
      .map(function mapMetric(item) {
        return {
          label: String(item.label),
          value: String(item.value)
        };
      });
  }

  return [
    metricOrNull_('Ventas netas', overview.ventasNetas),
    metricOrNull_('Margen contribucion', overview.margenContribucion),
    metricOrNull_('Caja final', overview.saldoCajaFinal),
    metricOrNull_('Deuda final', overview.saldoDeudaFinal)
  ].filter(Boolean);
}

function metricOrNull_(label, value) {
  if (typeof value !== 'number') {
    return null;
  }

  return {
    label: label,
    value: formatMoney_(value)
  };
}

function normalizeObservations_(observations) {
  if (!Array.isArray(observations) || !observations.length) {
    return ['Respuesta armada con la data disponible del periodo.'];
  }

  return observations
    .map(function mapObservation(item) {
      return String(item || '').trim();
    })
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeMode_(value) {
  return MODE_VALUES.indexOf(value) >= 0 ? value : 'cargar';
}

function normalizeIntent_(value, mode, entity) {
  if (mode === 'consultar') {
    return 'query';
  }

  if (mode === 'analizar') {
    return 'analysis';
  }

  return LOAD_ENTITIES.indexOf(value) >= 0 ? value : entity || 'ingresoMensual';
}

function normalizeConfidence_(value) {
  return ['alta', 'media', 'baja'].indexOf(value) >= 0 ? value : 'media';
}

function resolveLoadEntity_(value) {
  return LOAD_ENTITIES.indexOf(value) >= 0 ? value : '';
}

function inferEntityFromText_(message) {
  const normalized = normalizeText_(message);

  if (/(itbis|isr|impuesto)/.test(normalized)) {
    return 'impuestoMensual';
  }

  if (/(deuda|prestamo|cuota|interes|acreedor)/.test(normalized)) {
    return 'deudaMensual';
  }

  if (/(cxc|cxp|cuentas por cobrar|cuentas por pagar|cobrar|pagar)/.test(normalized)) {
    return 'carteraMensual';
  }

  if (/(gasto|costo|nomina|alquiler|marketing|combustible|internet)/.test(normalized)) {
    return 'gastoMensual';
  }

  if (/(banco|caja|efectivo|stripe|mercury|popular|banreservas|saldo inicial|saldo final)/.test(normalized)) {
    return 'cajaMensual';
  }

  return 'ingresoMensual';
}

function simplifyCatalogs_(catalogs) {
  const output = {};

  Object.keys(catalogs || {}).forEach(function eachCatalog(key) {
    output[key] = (catalogs[key] || []).map(function mapItem(item) {
      return {
        id: item.id || item.cuenta_id || '',
        nombre: item.nombre || ''
      };
    });
  });

  return output;
}

function resolveCatalogId_(catalogs, catalogKey, rawValue) {
  const items = Array.isArray(catalogs[catalogKey]) ? catalogs[catalogKey].slice() : [];
  const value = String(rawValue || '').trim();

  if (!value || !items.length) {
    return '';
  }

  const exactId = items.find(function matchExactId(item) {
    return String(item.id || '') === value;
  });

  if (exactId) {
    return exactId.id;
  }

  const normalized = normalizeText_(value);
  const byName = items
    .slice()
    .sort(function byLength(a, b) {
      return String(b.nombre || '').length - String(a.nombre || '').length;
    })
    .find(function matchByName(item) {
      const normalizedName = normalizeText_(item.nombre || '');
      const normalizedId = normalizeText_(item.id || '');

      return (
        normalized === normalizedName ||
        normalized === normalizedId ||
        normalized.indexOf(normalizedName) >= 0 ||
        normalizedName.indexOf(normalized) >= 0
      );
    });

  return byName ? byName.id : '';
}

function normalizeMonth_(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/(20\d{2})[-\/](0[1-9]|1[0-2])/);

  if (match) {
    return match[1] + '-' + match[2];
  }

  return '';
}

function normalizeNumber_(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value || '').trim();

  if (!raw) {
    return null;
  }

  const cleaned = raw.replace(/\s+/g, '');
  const hasComma = cleaned.indexOf(',') >= 0;
  const hasDot = cleaned.indexOf('.') >= 0;
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const partsWithDot = cleaned.split('.');

    if (partsWithDot.length > 2 || (partsWithDot.length === 2 && partsWithDot[1].length === 3)) {
      normalized = cleaned.replace(/\./g, '');
    }
  } else if (hasComma) {
    const partsWithComma = cleaned.split(',');

    if (partsWithComma.length > 2 || (partsWithComma.length === 2 && partsWithComma[1].length === 3)) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(',', '.');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean_(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return /^(si|true|1|yes)$/i.test(String(value || '').trim());
}

function normalizeEnum_(value, allowedValues) {
  const upper = String(value || '').trim().toUpperCase();
  return allowedValues.indexOf(upper) >= 0 ? upper : '';
}

function normalizeText_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, ' y ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeEmptyValues_(record) {
  const output = {};

  Object.keys(record || {}).forEach(function eachKey(key) {
    const value = record[key];

    if (value === '' || value === null || typeof value === 'undefined') {
      return;
    }

    output[key] = value;
  });

  return output;
}

function deleteFields_(record, fields) {
  (fields || []).forEach(function eachField(fieldName) {
    delete record[fieldName];
  });
}

function formatMoney_(value) {
  return 'DOP ' + Number(value || 0).toFixed(2);
}

function safeJsonParse_(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function hashActor_(value) {
  return crypto.createHash('sha256').update(String(value || 'anonymous')).digest('hex').slice(0, 32);
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
    statusCode: statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}