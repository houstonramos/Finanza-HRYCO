(function () {
  var STATUS_TEXT = 'Mostrando el último período con data útil';

  function getCurrentMonth_() {
    var now = new Date();
    var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 7);
  }

  function toNumber_(value) {
    return Number(value || 0);
  }

  function scorePeriod_(overview) {
    var data = overview || {};
    var score = 0;

    if (toNumber_(data.ventasBrutas) > 0 || toNumber_(data.ventasNetas) > 0) {
      score += 100;
    }

    if (toNumber_(data.costoVariableDirecto) > 0 || toNumber_(data.margenContribucion) > 0) {
      score += 40;
    }

    if (toNumber_(data.saldoCajaFinal) > 0 || toNumber_(data.movimientoCaja) !== 0) {
      score += 20;
    }

    if (
      toNumber_(data.saldoDeudaFinal) > 0 ||
      toNumber_(data.capitalPagado) > 0 ||
      toNumber_(data.interesesPagados) > 0
    ) {
      score += 10;
    }

    if (
      toNumber_(data.gastosVariables) > 0 ||
      toNumber_(data.gastosFijos) > 0 ||
      toNumber_(data.gastosFinancieros) > 0
    ) {
      score += 5;
    }

    if (toNumber_(data.cuentasCobrar) > 0 || toNumber_(data.cuentasPagar) > 0) {
      score += 3;
    }

    if (toNumber_(data.impuestoEstimado) > 0 || toNumber_(data.itbis) > 0) {
      score += 2;
    }

    return score;
  }

  function findBestPeriod_(yearSummary, currentPeriod) {
    var currentMonth = getCurrentMonth_();
    var currentYear = currentMonth.slice(0, 4);
    var months = ((yearSummary && yearSummary.months) || [])
      .map(function (item) {
        return {
          period: String(item.period || '').slice(0, 7),
          overview: item.overview || {}
        };
      })
      .filter(function (item) {
        if (!item.period) {
          return false;
        }

        if (String(yearSummary.year || '') === currentYear) {
          return item.period <= currentMonth;
        }

        return true;
      });

    if (!months.length) {
      return null;
    }

    return months.reduce(function (best, item) {
      var candidateScore = scorePeriod_(item.overview);
      var bestScore = best ? scorePeriod_(best.overview) : -1;

      if (!best || candidateScore > bestScore) {
        return item;
      }

      if (candidateScore === bestScore && item.period > best.period) {
        return item;
      }

      return best;
    }, months.find(function (item) {
      return item.period === currentPeriod;
    }) || null);
  }

  function start_() {
    var periodInput = document.getElementById('globalPeriod');
    var apiStatus = document.getElementById('apiStatusText');
    var currentPeriod;

    if (!periodInput || !window.EBGApi || typeof window.EBGApi.getYearSummary !== 'function') {
      return;
    }

    periodInput.addEventListener('change', function (event) {
      if (event.isTrusted) {
        window.sessionStorage.setItem('ebg-manual-period', '1');
      }
    });

    if (window.sessionStorage.getItem('ebg-manual-period') === '1') {
      return;
    }

    currentPeriod = String(periodInput.value || '').slice(0, 7);

    if (!currentPeriod) {
      return;
    }

    window.EBGApi.getYearSummary(currentPeriod.slice(0, 4))
      .then(function (response) {
        var bestPeriod;
        var currentScore;
        var bestScore;

        if (!response || !response.ok || !response.data) {
          return;
        }

        bestPeriod = findBestPeriod_(response.data, currentPeriod);

        if (!bestPeriod || !bestPeriod.period || bestPeriod.period === currentPeriod) {
          return;
        }

        currentScore = scorePeriod_(
          (((response.data && response.data.months) || []).find(function (item) {
            return String(item.period || '').slice(0, 7) === currentPeriod;
          }) || {}).overview || {}
        );
        bestScore = scorePeriod_(bestPeriod.overview);

        if (bestScore <= currentScore) {
          return;
        }

        periodInput.value = bestPeriod.period;
        periodInput.dispatchEvent(new Event('change', { bubbles: true }));

        if (apiStatus) {
          apiStatus.textContent = STATUS_TEXT;
        }
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.setTimeout(start_, 1400);
    });
  } else {
    window.setTimeout(start_, 1400);
  }
})();
