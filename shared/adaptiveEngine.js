(function (global) {
  function roundTo(n, step) {
    step = step || 50;
    return Math.round(Number(n) / step) * step;
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce(function (s, x) { return s + x; }, 0) / arr.length;
  }

  function monthKey(d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.getFullYear() * 12 + dt.getMonth();
  }

  function formatINR(n) {
    n = Math.round(Number(n) || 0);
    return "₹" + n.toLocaleString("en-IN");
  }

  function pct(n) {
    return Math.round(n * 100);
  }

  function analyzeCashFlow(transactions, baseEMI) {
    var base = Number(baseEMI) || 0;
    var empty = {
      status: "Stable",
      riskLevel: "Normal",
      recommendedEMI: base,
      message: "Not enough cash-flow history yet. Keeping the original EMI in place until we see a full season.",
      suggestedAction: "Collect the scheduled EMI. Recheck after two more months of data.",
      isSeasonal: false,
      microPulse: null,
      metrics: {}
    };

    if (!transactions || !transactions.length) return empty;

    var sorted = transactions.map(function (t) {
      return {
        income: Number(t.income) || 0,
        expenses: Number(t.expenses) || 0,
        farming_expenses: Number(t.farming_expenses) || 0,
        date: new Date(t.txn_date),
        category: t.category || ""
      };
    }).sort(function (a, b) { return a.date - b.date; });

    var current = sorted[sorted.length - 1];
    var history = sorted.length > 1 ? sorted.slice(0, -1) : sorted;
    var avgIncome = avg(history.map(function (t) { return t.income; })) || 1;
    var avgExpenses = avg(history.map(function (t) { return t.expenses; })) || 1;
    var currentKey = monthKey(current.date);
    var lastYear = null;
    for (var i = 0; i < sorted.length; i++) {
      if (monthKey(sorted[i].date) === currentKey - 12) lastYear = sorted[i];
    }

    var incomeRatio = current.income / avgIncome;
    var dipThreshold = 0.78;
    var isDip = incomeRatio < dipThreshold;
    var farmingShare = current.expenses > 0 ? current.farming_expenses / current.expenses : 0;
    var lastYearWasDip = !!(lastYear && lastYear.income < avgIncome * 0.85);
    var isSeasonal = lastYearWasDip || (isDip && farmingShare > 0.4);

    var consecutiveDips = 0;
    for (var j = sorted.length - 1; j >= 0; j--) {
      if (sorted[j].income < avgIncome * dipThreshold) consecutiveDips++;
      else break;
    }

    var dropPct = Math.max(0, 1 - incomeRatio);
    var monthName = current.date.toLocaleString("en-IN", { month: "long", year: "numeric" });
    var status, riskLevel, recommendedEMI, message, suggestedAction;

    if (!isDip) {
      status = "Stable";
      riskLevel = "Normal";
      recommendedEMI = base;
      message =
        "Income in " + monthName + " is " + formatINR(current.income) +
        ", sitting inside the usual band (average " + formatINR(avgIncome) +
        "). Expenses of " + formatINR(current.expenses) +
        " look routine. The original EMI of " + formatINR(base) +
        " remains appropriate — cash flow can support it without squeezing the household.";
      suggestedAction = "Continue scheduled collection this cycle. No intervention needed.";
    } else if (farmingShare > 0.4) {
      status = "Seasonal Dip (Investment Phase)";
      riskLevel = "Low";
      recommendedEMI = Math.max(100, roundTo(base * 0.3, 50));
      message =
        "Income dipped to " + formatINR(current.income) + " — " + pct(dropPct) +
        "% below the average of " + formatINR(avgIncome) +
        ". That would look like distress, except " + pct(farmingShare) +
        "% of this month's expenses are farming / investment outlays (seeds, fertiliser, labour). " +
        (lastYear
          ? "The same month last year looked similar (" + formatINR(lastYear.income) + "). "
          : "This matches a pre-harvest investment pattern. ") +
        "This is a seasonal, investment-driven dip, not household stress. Recommended due amount is " +
        formatINR(recommendedEMI) + " until the next harvest window (typically 4–8 weeks).";
      suggestedAction =
        "Pause major collection for 21 days. Request a MicroPulse weekly amount until harvest, then restructure to capture 15% of harvest revenue. Revisit on the first harvest inflow.";
    } else if (consecutiveDips >= 3 && !isSeasonal) {
      status = "Critical";
      riskLevel = "High";
      recommendedEMI = Math.max(100, roundTo(base * 0.2, 50));
      message =
        "Income has stayed below the seasonal floor for " + consecutiveDips +
        " consecutive months (now " + formatINR(current.income) + " vs average " +
        formatINR(avgIncome) + "). Farming / investment spend is only " + pct(farmingShare) +
        "% of expenses, so this is not a planting cycle — and there is no matching prior-year pattern. " +
        "This is genuine, persistent financial stress. Pushing the full EMI of " +
        formatINR(base) + " risks default and damages the relationship.";
      suggestedAction =
        "Open a formal restructuring conversation within 7 days. Offer tenure extension or a harvest-linked recovery (15% of the next large inflow) rather than standard collection.";
    } else {
      status = "Financial Stress";
      riskLevel = "Medium";
      recommendedEMI = Math.max(100, roundTo(base * 0.5, 50));
      message =
        "Income fell to " + formatINR(current.income) + ", " + pct(dropPct) +
        "% below average (" + formatINR(avgIncome) +
        "), without an investment signal — farming spend is only " + pct(farmingShare) +
        "% of expenses. " +
        (lastYearWasDip
          ? "There is some seasonal rhyme with last year, but household cash is still tight. "
          : "This does not match last year's pattern for this month. ") +
        "Treat it as a short, genuine squeeze. EMI is cut to " + formatINR(recommendedEMI) +
        " (about half of " + formatINR(base) + ") for this cycle.";
      suggestedAction =
        "Trigger an early-intervention review. Approve the reduced EMI for two cycles and monitor weekly inflows. Do not send a field collector this week.";
    }

    var weeklyIncome = avgIncome / 4.33;
    var microPulse = status === "Stable" ? null : Math.max(50, roundTo(weeklyIncome * 0.12, 10));

    return {
      status: status,
      riskLevel: riskLevel,
      recommendedEMI: recommendedEMI,
      message: message,
      suggestedAction: suggestedAction,
      isSeasonal: isSeasonal,
      microPulse: microPulse,
      metrics: {
        currentIncome: current.income,
        currentExpenses: current.expenses,
        farmingShare: farmingShare,
        avgIncome: avgIncome,
        avgExpenses: avgExpenses,
        incomeRatio: incomeRatio,
        consecutiveDips: consecutiveDips,
        monthName: monthName,
        dropPct: dropPct,
        lastYearIncome: lastYear ? lastYear.income : null,
        currentDate: current.date.toISOString().slice(0, 10)
      }
    };
  }

  global.EquiFlowEngine = { analyzeCashFlow: analyzeCashFlow, formatINR: formatINR };
  global.formatINR = formatINR;
})(window);
