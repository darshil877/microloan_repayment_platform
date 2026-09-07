(function () {
  var chart;
  var state = {
    loan: null,
    analysis: null,
    effectiveEMI: 0,
    plan: null,
    paidThisCycle: false
  };

  function monthLabel(iso) {
    var d = new Date(iso);
    return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }

  function cycleKey(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function drawChart(txns) {
    var canvas = document.getElementById("cashChart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var g1 = ctx.createLinearGradient(0, 0, 0, 280);
    g1.addColorStop(0, "rgba(47,122,85,0.35)");
    g1.addColorStop(1, "rgba(47,122,85,0)");
    var g2 = ctx.createLinearGradient(0, 0, 0, 280);
    g2.addColorStop(0, "rgba(196,92,62,0.28)");
    g2.addColorStop(1, "rgba(196,92,62,0)");

    var labels = txns.map(function (t) {
      return new Date(t.txn_date).toLocaleString("en-IN", { month: "short", year: "2-digit" });
    });

    var incLabel = window.EquiFlowI18n ? EquiFlowI18n.t("income_label") : "Income";
    var expLabel = window.EquiFlowI18n ? EquiFlowI18n.t("expenses_label") : "Expenses";

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: incLabel,
            data: txns.map(function (t) { return t.income; }),
            borderColor: "#2f7a52",
            backgroundColor: g1,
            fill: true,
            tension: 0.38,
            pointRadius: 3,
            borderWidth: 2.4
          },
          {
            label: expLabel,
            data: txns.map(function (t) { return t.expenses; }),
            borderColor: "#c45c3e",
            backgroundColor: g2,
            fill: true,
            tension: 0.38,
            pointRadius: 3,
            borderWidth: 2.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "rgba(18,36,28,0.55)", font: { family: "Outfit" } } },
          y: {
            grid: { color: "rgba(18,36,28,0.06)" },
            ticks: {
              color: "rgba(18,36,28,0.55)",
              callback: function (v) { return "₹" + (v / 1000) + "k"; }
            }
          }
        }
      }
    });
  }

  function renderFeed(notes) {
    var el = document.getElementById("feed");
    if (!notes.length) {
      el.innerHTML = '<p class="text-sm text-ink/50" data-i18n="no_adjustments">' + EquiFlowI18n.t("no_adjustments") + '</p>';
      return;
    }
    el.innerHTML = notes.slice(0, 8).map(function (n) {
      return '<div class="feed-item"><div class="text-sm font-semibold">' + n.title +
        '</div><div class="text-sm text-ink/70 mt-0.5">' + n.body +
        '</div><div class="text-[11px] text-ink/40 mt-1">' +
        new Date(n.created_at).toLocaleString("en-IN") + "</div></div>";
    }).join("");
  }

  async function render() {
    var profile = window.EQ_PROFILE;
    var loan = await eq.getLoanForFarmer(profile.id);
    var asOf = eq.getAsOf();
    var lang = EquiFlowI18n ? EquiFlowI18n.getLang() : "en";

    document.getElementById("hello").textContent = (EquiFlowI18n.t("farmer_greeting") || "Namaste") + ", " + (profile.full_name.split(" ")[0]) + ".";
    document.getElementById("subhello").textContent =
      (profile.occupation || "Borrower") + (profile.location ? " · " + profile.location : "");
    document.getElementById("asof-label").textContent = EquiFlowI18n.t("showing_cashflow_through") + " " + monthLabel(asOf);

    if (!loan) {
      document.getElementById("health-status").textContent = "—";
      document.getElementById("why-message").textContent = "This account has no seeded loan.";
      return;
    }

    var txns = await eq.getTransactions(profile.id);
    var rawAnalysis = EquiFlowEngine.analyzeCashFlow(txns, loan.base_emi);
    var analysis = EquiFlowI18nEngine ? EquiFlowI18nEngine.localizeAnalysis(rawAnalysis, lang) : rawAnalysis;

    var plan = eq.latestPlan(loan.id);
    var approved = !!(plan && plan.status === "approved");
    var effective = approved ? Number(plan.recommended_emi) : analysis.recommendedEMI;

    state.loan = loan;
    state.analysis = analysis;
    state.effectiveEMI = effective;
    state.plan = plan;

    var statusKey = "status_stable";
    if (analysis.status.indexOf("Seasonal") === 0) statusKey = "status_seasonal";
    else if (analysis.status === "Financial Stress") statusKey = "status_stress";
    else if (analysis.status === "Critical") statusKey = "status_critical";

    var riskKey = "risk_normal";
    if (analysis.riskLevel === "Low") riskKey = "risk_low";
    else if (analysis.riskLevel === "Medium") riskKey = "risk_medium";
    else if (analysis.riskLevel === "High") riskKey = "risk_high";

    document.getElementById("health-status").textContent = EquiFlowI18n.t(statusKey);
    document.getElementById("risk-label").textContent = EquiFlowI18n.t(riskKey);
    var traffic = document.getElementById("traffic");
    traffic.className = "traffic traffic-" + analysis.riskLevel;

    var seg1 = document.getElementById("seg-1");
    var seg2 = document.getElementById("seg-2");
    var seg3 = document.getElementById("seg-3");
    var capLabel = document.getElementById("capacity-label");

    if (analysis.riskLevel === "Normal") {
      seg1.className = "segment bg-leaf";
      seg2.className = "segment bg-leaf";
      seg3.className = "segment bg-leaf";
      if (capLabel) { capLabel.textContent = EquiFlowI18n.t("capacity_full"); capLabel.className = "font-semibold text-leaf"; }
    } else if (analysis.riskLevel === "Low") {
      seg1.className = "segment bg-gold";
      seg2.className = "segment bg-gold";
      seg3.className = "segment bg-gold/30";
      if (capLabel) { capLabel.textContent = EquiFlowI18n.t("capacity_seasonal"); capLabel.className = "font-semibold text-gold"; }
    } else if (analysis.riskLevel === "Medium") {
      seg1.className = "segment bg-amber-600";
      seg2.className = "segment bg-amber-600";
      seg3.className = "segment bg-amber-600/25";
      if (capLabel) { capLabel.textContent = EquiFlowI18n.t("capacity_tight"); capLabel.className = "font-semibold text-amber-700"; }
    } else {
      seg1.className = "segment bg-clay";
      seg2.className = "segment bg-clay/30";
      seg3.className = "segment bg-clay/20";
      if (capLabel) { capLabel.textContent = EquiFlowI18n.t("capacity_stress"); capLabel.className = "font-semibold text-clay"; }
    }

    var hintKey = "health_hint_normal";
    if (analysis.riskLevel === "Low") hintKey = "health_hint_low";
    else if (analysis.riskLevel === "Medium") hintKey = "health_hint_medium";
    else if (analysis.riskLevel === "High") hintKey = "health_hint_high";
    document.getElementById("health-hint").textContent = EquiFlowI18n.t(hintKey);

    document.getElementById("emi-amount").textContent = formatINR(effective);
    document.getElementById("base-emi").textContent = formatINR(loan.base_emi);
    document.getElementById("emi-note").textContent = approved
      ? EquiFlowI18n.t("note_approved")
      : (effective < loan.base_emi ? EquiFlowI18n.t("note_auto_adjusted") : EquiFlowI18n.t("note_on_schedule"));
    document.getElementById("approved-banner").classList.toggle("hidden", !approved);

    document.getElementById("loan-product").textContent = loan.product || "Microloan";
    document.getElementById("outstanding").textContent = formatINR(loan.outstanding);
    document.getElementById("principal").textContent = formatINR(loan.principal);

    var mp = document.getElementById("micropulse");
    if (analysis.microPulse) {
      mp.classList.remove("hidden");
      document.getElementById("micropulse-text").textContent =
        formatINR(analysis.microPulse) + " / week";
    } else {
      mp.classList.add("hidden");
    }

    document.getElementById("why-message").textContent = analysis.message;
    document.getElementById("why-action").textContent = EquiFlowI18n.t("for_your_lender") + " " + analysis.suggestedAction;

    var payments = await eq.getPayments(profile.id);
    var ck = cycleKey(asOf);
    state.paidThisCycle = payments.some(function (p) { return p.for_month === ck; });
    document.getElementById("paid-flag").classList.toggle("hidden", !state.paidThisCycle);
    document.getElementById("btn-pay").disabled = state.paidThisCycle;
    if (state.paidThisCycle) document.getElementById("btn-pay").classList.add("opacity-50");
    else document.getElementById("btn-pay").classList.remove("opacity-50");

    drawChart(txns);
    renderFeed(await eq.getNotifications(profile.id));
    if (window.lucide) lucide.createIcons();
  }

  function openPay() {
    if (!state.loan || state.paidThisCycle) return;
    document.getElementById("modal-amount").textContent = formatINR(state.effectiveEMI);
    document.getElementById("pay-modal").classList.remove("hidden");
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    document.getElementById("btn-logout").addEventListener("click", async function () {
      await eq.signOut();
      window.location.href = eq.url("index.html");
    });

    document.getElementById("btn-simulate").addEventListener("click", async function () {
      var res = await eq.simulateNextMonth();
      if (!res.ok) { eq.toast(res.message, "warn"); return; }
      eq.toast(EquiFlowI18n.t("toast_advanced_to") + " " + monthLabel(res.as_of));
      await render();
    });

    document.getElementById("btn-reset").addEventListener("click", async function () {
      await eq.resetDemo();
      eq.toast(EquiFlowI18n.t("toast_demo_reset"));
      await render();
    });

    document.getElementById("btn-pay").addEventListener("click", openPay);
    document.getElementById("pay-cancel").addEventListener("click", function () {
      document.getElementById("pay-modal").classList.add("hidden");
    });
    document.getElementById("pay-confirm").addEventListener("click", async function () {
      document.getElementById("pay-modal").classList.add("hidden");
      await eq.recordPayment(window.EQ_PROFILE.id, state.loan.id, state.effectiveEMI);
      eq.toast("Payment recorded: " + formatINR(state.effectiveEMI));
      await render();
    });

    document.addEventListener("i18n:changed", function () { render(); });
    eq.subscribe(function () { render(); });
    render();
  }

  document.addEventListener("eq:ready", start);
  if (window.EQ_PROFILE) start();
})();
