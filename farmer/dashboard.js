(function () {
  var chart;
  var state = {
    loan: null,
    analysis: null,
    effectiveEMI: 0,
    plan: null,
    paidThisCycle: false
  };

  function pillClass(status) {
    if (status === "Stable") return "status-stable";
    if (status.indexOf("Seasonal") === 0) return "status-seasonal";
    if (status === "Critical") return "status-critical";
    return "status-stress";
  }

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

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Income",
            data: txns.map(function (t) { return t.income; }),
            borderColor: "#2f7a52",
            backgroundColor: g1,
            fill: true,
            tension: 0.38,
            pointRadius: 3,
            borderWidth: 2.4
          },
          {
            label: "Expenses",
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
      el.innerHTML = '<p class="text-sm text-ink/50">No adjustments yet.</p>';
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
    document.getElementById("hello").textContent = "Namaste, " + (profile.full_name.split(" ")[0]) + ".";
    document.getElementById("subhello").textContent =
      (profile.occupation || "Borrower") + (profile.location ? " · " + profile.location : "");
    document.getElementById("asof-label").textContent = "Showing cash flow through " + monthLabel(asOf);

    if (!loan) {
      document.getElementById("health-status").textContent = "No loan yet";
      document.getElementById("why-message").textContent =
        "This account has no seeded loan. Use Reset demo on a judge account (farmer@equiflow.demo) to explore the full story.";
      return;
    }

    var txns = await eq.getTransactions(profile.id);
    var analysis = EquiFlowEngine.analyzeCashFlow(txns, loan.base_emi);
    var plan = eq.latestPlan(loan.id);
    var approved = !!(plan && plan.status === "approved");
    var effective = approved ? Number(plan.recommended_emi) : analysis.recommendedEMI;

    state.loan = loan;
    state.analysis = analysis;
    state.effectiveEMI = effective;
    state.plan = plan;

    document.getElementById("health-status").textContent = analysis.status;
    document.getElementById("risk-label").textContent = analysis.riskLevel + " risk";
    var traffic = document.getElementById("traffic");
    traffic.className = "traffic traffic-" + analysis.riskLevel;
    var battery = document.getElementById("battery");
    if (battery) battery.setAttribute("data-level", analysis.riskLevel);

    // Segmented 3-bar battery visual updates
    var seg1 = document.getElementById("seg-1");
    var seg2 = document.getElementById("seg-2");
    var seg3 = document.getElementById("seg-3");
    var capLabel = document.getElementById("capacity-label");

    if (analysis.riskLevel === "Normal") {
      seg1.className = "segment bg-leaf";
      seg2.className = "segment bg-leaf";
      seg3.className = "segment bg-leaf";
      if (capLabel) { capLabel.textContent = "Full Buffer (100%)"; capLabel.className = "font-semibold text-leaf"; }
    } else if (analysis.riskLevel === "Low") {
      seg1.className = "segment bg-gold";
      seg2.className = "segment bg-gold";
      seg3.className = "segment bg-gold/30";
      if (capLabel) { capLabel.textContent = "Seasonal Protection (75%)"; capLabel.className = "font-semibold text-gold"; }
    } else if (analysis.riskLevel === "Medium") {
      seg1.className = "segment bg-amber-600";
      seg2.className = "segment bg-amber-600";
      seg3.className = "segment bg-amber-600/25";
      if (capLabel) { capLabel.textContent = "Tight Cash (50%)"; capLabel.className = "font-semibold text-amber-700"; }
    } else {
      seg1.className = "segment bg-clay";
      seg2.className = "segment bg-clay/30";
      seg3.className = "segment bg-clay/20";
      if (capLabel) { capLabel.textContent = "Stress Alert (25%)"; capLabel.className = "font-semibold text-clay"; }
    }

    var hints = {
      Normal: "Green band — income is inside your usual range.",
      Low: "Gold band — a seasonal investment dip, not distress.",
      Medium: "Amber — genuine squeeze. Payment is halved this cycle.",
      High: "Red — persistent stress. A restructuring talk is due."
    };
    document.getElementById("health-hint").textContent = hints[analysis.riskLevel] || "";

    document.getElementById("emi-amount").textContent = formatINR(effective);
    document.getElementById("base-emi").textContent = formatINR(loan.base_emi);
    document.getElementById("emi-note").textContent = approved
      ? "approved by your lender"
      : (effective < loan.base_emi ? "auto-adjusted down" : "on schedule");
    document.getElementById("approved-banner").classList.toggle("hidden", !approved);

    document.getElementById("loan-product").textContent = loan.product || "Microloan";
    document.getElementById("outstanding").textContent = formatINR(loan.outstanding);
    document.getElementById("principal").textContent = formatINR(loan.principal);

    var mp = document.getElementById("micropulse");
    if (analysis.microPulse) {
      mp.classList.remove("hidden");
      document.getElementById("micropulse-text").textContent =
        "Pay " + formatINR(analysis.microPulse) + " each week (~12% of a typical week’s income) instead of a lump EMI. Low pressure, keeps the loan healthy.";
    } else {
      mp.classList.add("hidden");
    }

    document.getElementById("why-message").textContent = analysis.message;
    document.getElementById("why-action").textContent = "For your lender: " + analysis.suggestedAction;

    var payments = await eq.getPayments(profile.id);
    var ck = cycleKey(asOf);
    state.paidThisCycle = payments.some(function (p) { return p.for_month === ck; });
    document.getElementById("paid-flag").classList.toggle("hidden", !state.paidThisCycle);
    document.getElementById("btn-pay").disabled = state.paidThisCycle;
    if (state.paidThisCycle) document.getElementById("btn-pay").classList.add("opacity-50");
    else document.getElementById("btn-pay").classList.remove("opacity-50");

    drawChart(txns);
    renderFeed(await eq.getNotifications(profile.id));
    lucide.createIcons();
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
      eq.toast("Advanced to " + monthLabel(res.as_of));
      await render();
    });

    document.getElementById("btn-reset").addEventListener("click", async function () {
      await eq.resetDemo();
      eq.toast("Demo data reset to February 2026");
      await render();
    });

    document.getElementById("btn-pay").addEventListener("click", openPay);
    document.getElementById("pay-cancel").addEventListener("click", function () {
      document.getElementById("pay-modal").classList.add("hidden");
    });
    document.getElementById("pay-confirm").addEventListener("click", async function () {
      document.getElementById("pay-modal").classList.add("hidden");
      await eq.recordPayment(window.EQ_PROFILE.id, state.loan.id, state.effectiveEMI);
      eq.toast("Simulated payment of " + formatINR(state.effectiveEMI) + " recorded");
      await render();
    });

    eq.subscribe(function () { render(); });
    render();
  }
  document.addEventListener("eq:ready", start);
  if (window.EQ_PROFILE) start();
})();
