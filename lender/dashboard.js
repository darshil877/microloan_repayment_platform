(function () {
  var chart;
  var selectedId = null;
  var borrowers = [];

  var STATUS_KEYS = {
    "Stable": "status_stable",
    "Seasonal Dip (Investment Phase)": "status_seasonal",
    "Financial Stress": "status_stress",
    "Critical": "status_critical",
    "Harvest Surplus (Catch-up Phase)": "status_surplus"
  };

  function statusLabel(status) {
    if (!status) return "";
    var key = STATUS_KEYS[status];
    if (!key && status.indexOf("Seasonal") === 0) key = "status_seasonal";
    else if (!key && status.indexOf("Surplus") >= 0) key = "status_surplus";
    return window.EquiFlowI18n ? EquiFlowI18n.t(key || status) : status;
  }

  function pill(status) {
    var cls = "status-stress";
    if (status === "Stable") { cls = "status-stable"; }
    else if (status.indexOf("Seasonal") === 0) { cls = "status-seasonal"; }
    else if (status === "Critical") { cls = "status-critical"; }
    else if (status.indexOf("Surplus") >= 0) { cls = "status-surplus"; }
    var text = statusLabel(status);
    return '<span class="status-pill ' + cls + '">' + text + "</span>";
  }

  function monthLabel(iso) {
    return new Date(iso).toLocaleString("en-IN", { month: "long", year: "numeric" });
  }

  function drawChart(txns) {
    var canvas = document.getElementById("lenderChart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var g1 = ctx.createLinearGradient(0, 0, 0, 240);
    g1.addColorStop(0, "rgba(47,122,85,0.35)");
    g1.addColorStop(1, "rgba(47,122,85,0)");

    var sorted = txns.slice().sort(function (a, b) { return new Date(a.txn_date) - new Date(b.txn_date); });

    var labels = sorted.map(function (t) {
      return new Date(t.txn_date).toLocaleString("en-IN", { month: "short", year: "2-digit" });
    });

    var incLabel = window.EquiFlowI18n ? EquiFlowI18n.t("income_label") : "Income";
    var expLabel = window.EquiFlowI18n ? EquiFlowI18n.t("expenses_label") : "Expenses";
    var farmLabel = window.EquiFlowI18n ? EquiFlowI18n.t("kpi_seasonal_dips") : "Farming / Outlays";

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "line",
            label: incLabel,
            data: sorted.map(function (t) { return Number(t.income); }),
            borderColor: "#2f7a52",
            backgroundColor: g1,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointRadius: 3,
            order: 1
          },
          {
            type: "bar",
            label: expLabel,
            data: sorted.map(function (t) { return Number(t.expenses); }),
            backgroundColor: "rgba(196, 92, 62, 0.65)",
            borderColor: "#c45c3e",
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          },
          {
            type: "bar",
            label: farmLabel,
            data: sorted.map(function (t) { return Number(t.farming_expenses || 0); }),
            backgroundColor: "rgba(196, 160, 70, 0.85)",
            borderColor: "#c4a046",
            borderWidth: 1,
            borderRadius: 4,
            order: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { font: { family: "Outfit", size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ": ₹" + Number(ctx.raw).toLocaleString("en-IN");
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "rgba(18,36,28,0.55)", font: { family: "Outfit" } } },
          y: {
            grid: { color: "rgba(18,36,28,0.06)" },
            ticks: {
              color: "rgba(18,36,28,0.55)",
              font: { family: "Outfit" },
              callback: function (v) { return "₹" + (v / 1000) + "k"; }
            }
          }
        }
      }
    });
  }

  function renderKpis(list) {
    var n = list.length;
    var stress = list.filter(function (b) { return b.analysis.status === "Financial Stress" || b.analysis.status === "Critical"; }).length;
    var seasonal = list.filter(function (b) { return b.analysis.status.indexOf("Seasonal") === 0; }).length;
    var due = list.reduce(function (s, b) { return s + b.effectiveEMI; }, 0);
    var cards = [
      { k: EquiFlowI18n.t("kpi_borrowers"), v: String(n), s: EquiFlowI18n.t("kpi_borrowers_sub") },
      { k: EquiFlowI18n.t("kpi_needs_review"), v: String(stress), s: EquiFlowI18n.t("kpi_needs_review_sub") },
      { k: EquiFlowI18n.t("kpi_seasonal_dips"), v: String(seasonal), s: EquiFlowI18n.t("kpi_seasonal_sub") },
      { k: EquiFlowI18n.t("kpi_ask_cycle"), v: formatINR(due), s: EquiFlowI18n.t("kpi_ask_sub") }
    ];
    document.getElementById("kpis").innerHTML = cards.map(function (c) {
      return '<article class="eq-card p-5"><p class="text-xs uppercase tracking-widest text-ink/45">' +
        c.k + '</p><div class="font-display text-3xl mt-1">' + c.v +
        '</div><p class="text-sm text-ink/50 mt-1">' + c.s + "</p></article>";
    }).join("");
  }

  function renderTable(list) {
    document.getElementById("borrower-count").textContent = list.length + " " + EquiFlowI18n.t("on_book");
    document.getElementById("borrower-body").innerHTML = list.map(function (b) {
      var active = selectedId === b.profile.id ? " active" : "";
      var avatar = b.profile.avatar
        ? '<img src="' + b.profile.avatar + '" class="w-9 h-9 rounded-full object-cover" alt="" />'
        : '<div class="w-9 h-9 rounded-full bg-mint"></div>';
      var isApproved = b.plan && b.plan.status === "approved";
      var badgeText = isApproved ? EquiFlowI18n.t("status_approved_badge") : EquiFlowI18n.t("status_pending_badge");
      var badgeClass = isApproved ? "text-[11px] text-leaf font-medium" : "text-[11px] text-amber-700";

      return '<tr class="borrower-row' + active + '" data-id="' + b.profile.id + '">' +
        '<td><div class="flex items-center gap-3">' + avatar +
        '<div><div class="font-semibold">' + b.profile.full_name + '</div>' +
        '<div class="text-xs opacity-60">' + (b.profile.occupation || "") + "</div></div></div></td>" +
        "<td>" + pill(b.analysis.status) + "</td>" +
        '<td class="font-semibold">' + formatINR(b.effectiveEMI) +
        '<div class="' + badgeClass + '">' + badgeText + '</div>' +
        "</td></tr>";
    }).join("");

    document.querySelectorAll(".borrower-row").forEach(function (row) {
      row.addEventListener("click", function () {
        selectedId = row.getAttribute("data-id");
        render();
        if (window.innerWidth < 1280) {
          document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function computeComparison(b) {
    var sorted = b.txns.slice().sort(function (x, y) { return new Date(x.txn_date) - new Date(y.txn_date); });
    var baseEmi = Number(b.loan.base_emi);
    var tradConsecutiveNeg = 0;
    var tradDefaultMonth = null;
    var totalRelief = 0;

    sorted.forEach(function (t, idx) {
      var net = Number(t.income) - Number(t.expenses);
      if (net - baseEmi < 0) {
        tradConsecutiveNeg++;
        if (tradConsecutiveNeg >= 2 && !tradDefaultMonth) {
          tradDefaultMonth = new Date(t.txn_date).toLocaleString("en-IN", { month: "short", year: "numeric" });
        }
      } else {
        tradConsecutiveNeg = 0;
      }

      var historyToDate = sorted.slice(0, idx + 1);
      var engineRes = EquiFlowEngine.analyzeCashFlow(historyToDate, baseEmi);
      var recEmi = engineRes.recommendedEMI;
      if (recEmi < baseEmi) {
        totalRelief += (baseEmi - recEmi);
      }
    });

    var tradStatus = tradDefaultMonth
      ? "Default risk in " + tradDefaultMonth + " under fixed EMI of " + formatINR(baseEmi)
      : "Household cash squeeze under fixed EMI of " + formatINR(baseEmi);
    var eqStatus = "On track — " + formatINR(totalRelief) + " total seasonal relief provided";

    return { tradStatus: tradStatus, eqStatus: eqStatus };
  }

  function renderDetail(b) {
    var el = document.getElementById("detail");
    if (!b) {
      el.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-center text-ink/50 py-16"><p class="font-display text-2xl text-ink" data-i18n="select_borrower_title">' + EquiFlowI18n.t("select_borrower_title") + '</p><p class="max-w-sm mt-2 text-xs opacity-70" data-i18n="select_borrower_sub">' + EquiFlowI18n.t("select_borrower_sub") + '</p></div>';
      return;
    }

    var lang = EquiFlowI18n ? EquiFlowI18n.getLang() : "en";
    var a = EquiFlowI18nEngine ? EquiFlowI18nEngine.localizeAnalysis(b.analysis, lang) : b.analysis;
    var approved = !!(b.plan && b.plan.status === "approved");
    var comp = computeComparison(b);
    var img = b.profile.avatar
      ? '<img src="' + b.profile.avatar + '" class="w-16 h-16 rounded-full object-cover" alt="" />'
      : "";

    var btnText = approved ? EquiFlowI18n.t("btn_already_approved") : EquiFlowI18n.t("btn_approve_plan");
    var noteText = approved ? EquiFlowI18n.t("approved_written_note") : EquiFlowI18n.t("one_click_write_note");

    el.innerHTML =
      '<div class="flex flex-wrap items-start justify-between gap-4 mb-5">' +
        '<div class="flex gap-4">' + img +
          '<div><h2 class="font-display text-2xl">' + b.profile.full_name + "</h2>" +
          '<p class="text-sm text-ink/60">' + (b.profile.occupation || "") +
          (b.profile.location ? " · " + b.profile.location : "") + "</p>" +
          '<div class="mt-2">' + pill(a.status) + "</div></div>" +
        "</div>" +
        '<div class="text-right"><p class="text-xs uppercase tracking-widest text-ink/45" data-i18n="collect_this_cycle">' + EquiFlowI18n.t("collect_this_cycle") + '</p>' +
        '<div class="num-xl text-4xl text-forest">' + formatINR(b.effectiveEMI) + "</div>" +
        '<p class="text-xs text-ink/50"><span data-i18n="base_emi_short">' + EquiFlowI18n.t("base_emi_short") + '</span> ' + formatINR(b.loan.base_emi) + "</p></div>" +
      "</div>" +
      '<div class="h-64 sm:h-56 mb-5"><canvas id="lenderChart"></canvas></div>' +
      '<div class="grid md:grid-cols-2 gap-4 mb-5">' +
        '<div class="p-4 rounded-2xl bg-white/50 border border-ink/5">' +
          '<p class="text-xs uppercase tracking-widest text-ink/45 mb-2" data-i18n="why_panel_header">' + EquiFlowI18n.t("why_panel_header") + '</p>' +
          '<p class="text-sm leading-relaxed text-ink/80">' + a.message + "</p></div>" +
        '<div class="p-4 rounded-2xl bg-forest text-cream">' +
          '<p class="text-xs uppercase tracking-widest text-gold mb-2" data-i18n="how_much_when">' + EquiFlowI18n.t("how_much_when") + '</p>' +
          '<p class="text-sm leading-relaxed">' + a.suggestedAction + "</p>" +
          (a.microPulse ? '<p class="mt-3 text-gold font-semibold">MicroPulse: ' + formatINR(a.microPulse) + " / week</p>" : "") +
        "</div>" +
      "</div>" +
      '<div class="mb-5 p-4 rounded-2xl bg-sand/30 border border-ink/10">' +
        '<div class="flex items-center justify-between mb-2.5">' +
          '<span class="text-xs uppercase tracking-widest text-ink/50 font-semibold flex items-center gap-1.5">' +
            '<i data-lucide="git-compare" class="w-3.5 h-3.5 text-forest"></i> <span data-i18n="without_equiflow_title">' + EquiFlowI18n.t("without_equiflow_title") + '</span>' +
          "</span>" +
          '<span class="text-[11px] text-ink/40" data-i18n="without_equiflow_sub">' + EquiFlowI18n.t("without_equiflow_sub") + '</span>' +
        "</div>" +
        '<div class="grid sm:grid-cols-2 gap-3 text-xs">' +
          '<div class="p-3 rounded-xl bg-clay/10 border border-clay/20">' +
            '<div class="font-semibold text-clay flex items-center gap-1">' +
              '<i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> <span data-i18n="trad_emi_title">' + EquiFlowI18n.t("trad_emi_title") + '</span>' +
            "</div>" +
            '<p class="mt-1 text-ink/80">' + comp.tradStatus + "</p>" +
          "</div>" +
          '<div class="p-3 rounded-xl bg-leaf/10 border border-leaf/20">' +
            '<div class="font-semibold text-forest flex items-center gap-1">' +
              '<i data-lucide="shield-check" class="w-3.5 h-3.5 text-leaf"></i> <span data-i18n="equiflow_flow_title">' + EquiFlowI18n.t("equiflow_flow_title") + '</span>' +
            "</div>" +
            '<p class="mt-1 text-ink/80">' + comp.eqStatus + "</p>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="flex flex-wrap items-center gap-3">' +
        '<button id="btn-approve" class="eq-btn eq-btn-primary px-6 py-3"' + (approved ? " disabled" : "") + ">" +
          btnText +
        "</button>" +
        (approved
          ? '<span class="text-sm text-leaf font-medium">' + noteText + '</span>'
          : '<span class="text-xs text-ink/45">' + noteText + '</span>') +
      "</div>";

    drawChart(b.txns);
    var btn = document.getElementById("btn-approve");
    if (btn && !approved) {
      btn.addEventListener("click", async function () {
        btn.disabled = true;
        await eq.approvePlan(b.loan, b.analysis);
        eq.toast(EquiFlowI18n.t("toast_plan_approved") + " " + b.profile.full_name);
        await render();
      });
    }
    if (window.lucide) lucide.createIcons();
  }

  async function render() {
    var profile = window.EQ_PROFILE;
    var asOf = eq.getAsOf();
    document.getElementById("hello").textContent = (EquiFlowI18n.t("portfolio_title") || "Portfolio");
    document.getElementById("asof-label").textContent = EquiFlowI18n.t("portfolio_cycle") + " · " + monthLabel(asOf);

    borrowers = await eq.getBorrowersForLender(profile.id);
    if (!borrowers.length) {
      borrowers = await eq.getBorrowersForLender(null);
    }
    renderKpis(borrowers);
    renderTable(borrowers);
    var selected = borrowers.filter(function (b) { return b.profile.id === selectedId; })[0] || null;
    if (!selected && borrowers.length && selectedId) selectedId = null;
    if (!selected && borrowers.length) selected = borrowers[0];
    renderDetail(selected);
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
      selectedId = null;
      eq.toast(EquiFlowI18n.t("toast_demo_reset"));
      await render();
    });

    document.addEventListener("i18n:changed", function () { render(); });
    eq.subscribe(function () { render(); });
    render();
  }

  document.addEventListener("eq:ready", start);
  if (window.EQ_PROFILE) start();
})();
