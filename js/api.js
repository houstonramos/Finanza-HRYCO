window.EBGApi = (function () {
  var gasEndpoint = '/.netlify/functions/gas-proxy';
  var aiEndpoint = '/.netlify/functions/ai-chat';

  async function post(endpoint, payload) {
    var response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  return {
    health: function () {
      return post(gasEndpoint, { action: 'health' });
    },
    getBootstrapData: function () {
      return post(gasEndpoint, { action: 'getBootstrapData' });
    },
    saveMonthlySummary: function (entity, actor, payload) {
      return post(gasEndpoint, {
        action: 'saveMonthlySummary',
        entity: entity,
        actor: actor,
        payload: payload
      });
    },
    getDashboard: function (periodo) {
      return post(gasEndpoint, {
        action: 'getDashboard',
        payload: {
          periodo: periodo
        }
      });
    },
    closePeriod: function (periodo, actor, reason) {
      return post(gasEndpoint, {
        action: 'closePeriod',
        actor: actor,
        payload: {
          periodo: periodo,
          reason: reason
        }
      });
    },
    chatAssist: async function (actor, payload) {
      var aiError = null;

      try {
        var aiResponse = await post(aiEndpoint, {
          actor: actor,
          payload: payload
        });

        if (aiResponse && aiResponse.ok) {
          aiResponse.source = 'openai';
          return aiResponse;
        }

        aiError = aiResponse || {
          ok: false,
          code: 'AI_UNAVAILABLE',
          message: 'La IA no respondio correctamente.'
        };
      } catch (error) {
        aiError = {
          ok: false,
          code: 'AI_REQUEST_FAILED',
          message: error.message
        };
      }

      try {
        var gasResponse = await post(gasEndpoint, {
          action: 'chatAssist',
          actor: actor,
          payload: payload
        });

        if (gasResponse) {
          gasResponse.source = 'apps_script_fallback';
          gasResponse.fallbackReason = aiError ? aiError.code : 'AI_UNAVAILABLE';
          return gasResponse;
        }
      } catch (error) {
        if (aiError) {
          return aiError;
        }

        throw error;
      }

      return aiError;
    }
  };
})();