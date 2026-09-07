(function (global) {
  var DB_KEY = "equiflow_db_v1";
  var SESSION_KEY = "equiflow_session_v1";
  var listeners = [];
  var bc = null;

  try { bc = new BroadcastChannel("equiflow"); } catch (e) { bc = null; }

  global.EQUIFLOW_CONFIG = {
    useMock: true,
    supabaseUrl: "YOUR_SUPABASE_URL",
    supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
  };

  function eqUrl(rel) {
    var path = global.location.pathname;
    var root;
    if (/\/farmer\/|\/lender\//.test(path)) {
      root = path.replace(/\/(farmer|lender)\/[^/]*$/, "/");
    } else {
      root = path.replace(/[^/]+$/, "");
    }
    if (!root) root = "/";
    if (root.charAt(root.length - 1) !== "/") root += "/";
    return root + String(rel).replace(/^\//, "");
  }

  function uid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function loadDb() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var seed = EquiFlowMock.generateSeed();
    saveDb(seed);
    return seed;
  }

  function saveDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function emit(payload) {
    listeners.forEach(function (fn) {
      try { fn(payload); } catch (e) {}
    });
    if (bc) {
      try { bc.postMessage(payload); } catch (e) {}
    }
  }

  if (bc) {
    bc.onmessage = function (ev) {
      listeners.forEach(function (fn) {
        try { fn(ev.data); } catch (e) {}
      });
    };
  }

  global.addEventListener("storage", function (ev) {
    if (ev.key === DB_KEY) emit({ type: "storage" });
  });

  function getSessionSync() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function matches(row, filters) {
    return filters.every(function (f) { return String(row[f.k]) === String(f.v); });
  }

  function createQuery(table) {
    var state = { table: table, action: "select", filters: [], payload: null, single: false };
    var api = {
      select: function () { return api; },
      insert: function (row) { state.action = "insert"; state.payload = row; return api; },
      update: function (row) { state.action = "update"; state.payload = row; return api; },
      eq: function (k, v) { state.filters.push({ k: k, v: v }); return api; },
      order: function () { return api; },
      limit: function () { return api; },
      single: function () { state.single = true; return api; },
      then: function (resolve, reject) {
        return execute(state).then(resolve, reject);
      }
    };
    return api;
  }

  function execute(state) {
    return new Promise(function (resolve) {
      var db = loadDb();
      var table = db[state.table];
      if (!table) table = db[state.table] = [];

      if (state.action === "select") {
        var rows = table.filter(function (r) { return matches(r, state.filters); });
        if (state.single) resolve({ data: rows[0] || null, error: rows[0] ? null : { message: "not found" } });
        else resolve({ data: rows, error: null });
        return;
      }

      if (state.action === "insert") {
        var payload = Array.isArray(state.payload) ? state.payload : [state.payload];
        var inserted = payload.map(function (row) {
          var copy = Object.assign({ id: row.id || uid(), created_at: new Date().toISOString() }, row);
          table.push(copy);
          return copy;
        });
        saveDb(db);
        emit({ type: "insert", table: state.table });
        resolve({ data: inserted.length === 1 ? inserted[0] : inserted, error: null });
        return;
      }

      if (state.action === "update") {
        var updated = [];
        table.forEach(function (r, i) {
          if (matches(r, state.filters)) {
            table[i] = Object.assign({}, r, state.payload);
            updated.push(table[i]);
          }
        });
        saveDb(db);
        emit({ type: "update", table: state.table });
        resolve({ data: updated, error: null });
        return;
      }

      resolve({ data: null, error: { message: "unknown action" } });
    });
  }

  function asOfDate(db) {
    return db.as_of || EquiFlowMock.AS_OF_START;
  }

  function visibleTxns(db, farmerId) {
    var asOf = asOfDate(db);
    return db.transactions.filter(function (t) {
      return t.farmer_id === farmerId && t.txn_date <= asOf;
    }).sort(function (a, b) { return a.txn_date.localeCompare(b.txn_date); });
  }

  function monthKeyFromDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function latestPlanForLoan(db, loanId, asOf) {
    var month = monthKeyFromDate(asOf);
    var plans = db.repayment_plans.filter(function (p) {
      return p.loan_id === loanId;
    }).sort(function (a, b) { return (b.created_at || "").localeCompare(a.created_at || ""); });
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].for_month === month || monthKeyFromDate(plans[i].created_at) === month) return plans[i];
    }
    return null;
  }

  var eq = {
    url: eqUrl,
    uid: uid,
    formatINR: function (n) { return global.formatINR ? global.formatINR(n) : "₹" + Math.round(n); },

    loadDb: loadDb,
    saveDb: saveDb,

    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (x) { return x !== fn; });
      };
    },

    async getSession() {
      return { data: { session: getSessionSync() }, error: null };
    },

    async signIn(email, password) {
      var db = loadDb();
      var user = db.users.find(function (u) {
        return u.email.toLowerCase() === String(email).toLowerCase() && u.password === password;
      });
      if (!user) return { data: { user: null, session: null }, error: { message: "Invalid email or password." } };
      var profile = db.profiles.find(function (p) { return p.id === user.id; });
      var session = {
        user: { id: user.id, email: user.email },
        profile: profile,
        access_token: "mock-" + user.id
      };
      setSession(session);
      return { data: { user: session.user, session: session }, error: null };
    },

    async signUp(email, password, fullName, role) {
      var db = loadDb();
      var exists = db.users.find(function (u) { return u.email.toLowerCase() === String(email).toLowerCase(); });
      if (exists) return { data: null, error: { message: "An account with that email already exists." } };
      var id = uid();
      var user = { id: id, email: email, password: password, created_at: new Date().toISOString() };
      var profile = {
        id: id,
        full_name: fullName || email.split("@")[0],
        role: role === "lender" ? "lender" : "farmer",
        occupation: role === "lender" ? "Microfinance partner" : "Borrower",
        location: "",
        avatar: "",
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      db.profiles.push(profile);
      saveDb(db);
      var session = { user: { id: id, email: email }, profile: profile, access_token: "mock-" + id };
      setSession(session);
      return { data: { user: session.user, session: session }, error: null };
    },

    async signOut() {
      setSession(null);
      return { error: null };
    },

    async getProfile(id) {
      var db = loadDb();
      return db.profiles.find(function (p) { return p.id === id; }) || null;
    },

    getAsOf: function () {
      return asOfDate(loadDb());
    },

    async getLoanForFarmer(farmerId) {
      var db = loadDb();
      return db.loans.find(function (l) { return l.farmer_id === farmerId; }) || null;
    },

    async getTransactions(farmerId) {
      return visibleTxns(loadDb(), farmerId);
    },

    async getNotifications(farmerId) {
      var db = loadDb();
      return db.notifications
        .filter(function (n) { return n.farmer_id === farmerId; })
        .sort(function (a, b) { return (b.created_at || "").localeCompare(a.created_at || ""); });
    },

    async getPayments(farmerId) {
      var db = loadDb();
      return (db.payments || []).filter(function (p) { return p.farmer_id === farmerId; })
        .sort(function (a, b) { return (b.paid_at || "").localeCompare(a.paid_at || ""); });
    },

    async getBorrowersForLender(lenderId) {
      var db = loadDb();
      var loans = db.loans.filter(function (l) { return !lenderId || l.lender_id === lenderId; });
      return loans.map(function (loan) {
        var profile = db.profiles.find(function (p) { return p.id === loan.farmer_id; });
        var txns = visibleTxns(db, loan.farmer_id);
        var analysis = EquiFlowEngine.analyzeCashFlow(txns, loan.base_emi);
        var plan = latestPlanForLoan(db, loan.id, asOfDate(db));
        return {
          profile: profile,
          loan: loan,
          analysis: analysis,
          plan: plan,
          effectiveEMI: plan && plan.status === "approved" ? Number(plan.recommended_emi) : analysis.recommendedEMI,
          txns: txns
        };
      });
    },

    latestPlan: function (loanId) {
      var db = loadDb();
      return latestPlanForLoan(db, loanId, asOfDate(db));
    },

    async addNotification(farmerId, title, body) {
      var db = loadDb();
      db.notifications.unshift({
        id: uid(),
        farmer_id: farmerId,
        title: title,
        body: body,
        created_at: new Date().toISOString(),
        read: false
      });
      saveDb(db);
      emit({ type: "notification", farmer_id: farmerId });
    },

    async recordPayment(farmerId, loanId, amount) {
      var db = loadDb();
      var payment = {
        id: uid(),
        loan_id: loanId,
        farmer_id: farmerId,
        amount: Number(amount),
        paid_at: new Date().toISOString(),
        simulated: true,
        for_month: monthKeyFromDate(asOfDate(db))
      };
      db.payments = db.payments || [];
      db.payments.push(payment);
      db.loans.forEach(function (l) {
        if (l.id === loanId) l.outstanding = Math.max(0, Number(l.outstanding) - Number(amount));
      });
      saveDb(db);
      await eq.addNotification(
        farmerId,
        "Simulated payment recorded",
        "A simulated payment of " + eq.formatINR(amount) + " was logged. No real money moved."
      );
      emit({ type: "payment", farmer_id: farmerId });
      return payment;
    },

    async approvePlan(loan, analysis) {
      var db = loadDb();
      var asOf = asOfDate(db);
      var plan = {
        id: uid(),
        loan_id: loan.id,
        status: "approved",
        risk_level: analysis.riskLevel,
        recommended_emi: analysis.recommendedEMI,
        message: analysis.message,
        suggested_action: analysis.suggestedAction,
        created_at: new Date().toISOString(),
        for_month: monthKeyFromDate(asOf),
        cashflow_status: analysis.status
      };
      db.repayment_plans.push(plan);
      saveDb(db);
      await eq.addNotification(
        loan.farmer_id,
        "Lender approved a new plan",
        "Your due amount this cycle is now " + eq.formatINR(analysis.recommendedEMI) + ". " +
          (analysis.microPulse ? "MicroPulse option: " + eq.formatINR(analysis.microPulse) + " / week." : "")
      );
      emit({ type: "plan-approved", loan_id: loan.id, farmer_id: loan.farmer_id });
      return plan;
    },

    async simulateNextMonth() {
      var db = loadDb();
      var parts = asOfDate(db).split("-");
      var y = Number(parts[0]);
      var m = Number(parts[1]) + 1;
      if (m > 12) { m = 1; y += 1; }
      var iso = y + "-" + String(m).padStart(2, "0") + "-28";
      if (iso > EquiFlowMock.AS_OF_MAX) {
        return { ok: false, message: "End of the seeded timeline (June 2026). Reset demo data to start again." };
      }
      db.as_of = iso;
      saveDb(db);

      db.loans.forEach(function (loan) {
        var txns = visibleTxns(db, loan.farmer_id);
        var analysis = EquiFlowEngine.analyzeCashFlow(txns, loan.base_emi);
        var body;
        if (analysis.status === "Stable") {
          body = "Cash flow recovered. Your recommended payment is back to " + eq.formatINR(analysis.recommendedEMI) + ".";
        } else if (analysis.status.indexOf("Seasonal") === 0) {
          body = "We noticed higher farming expenses this month — your payment has been lowered to " + eq.formatINR(analysis.recommendedEMI) + ".";
        } else {
          body = "Income is tight this month. Your payment has been lowered to " + eq.formatINR(analysis.recommendedEMI) + ".";
        }
        db.notifications.unshift({
          id: uid(),
          farmer_id: loan.farmer_id,
          title: "Auto-adjust · " + analysis.status,
          body: body,
          created_at: new Date().toISOString(),
          read: false
        });
      });
      saveDb(db);
      emit({ type: "simulate", as_of: iso });
      return { ok: true, as_of: iso };
    },

    async resetDemo() {
      var seed = EquiFlowMock.generateSeed();
      saveDb(seed);
      emit({ type: "reset" });
      return seed;
    },

    toast: function (message, kind) {
      var stack = document.querySelector(".toast-stack");
      if (!stack) {
        stack = document.createElement("div");
        stack.className = "toast-stack";
        document.body.appendChild(stack);
      }
      var el = document.createElement("div");
      el.className = "eq-toast " + (kind || "ok");
      el.textContent = message;
      stack.appendChild(el);
      setTimeout(function () { el.remove(); }, 3200);
    }
  };

  var mockClient = {
    auth: {
      signInWithPassword: function (creds) { return eq.signIn(creds.email, creds.password); },
      signUp: function (creds) { return eq.signUp(creds.email, creds.password, creds.options && creds.options.data && creds.options.data.full_name, creds.options && creds.options.data && creds.options.data.role); },
      getSession: function () { return eq.getSession(); },
      signOut: function () { return eq.signOut(); }
    },
    from: createQuery,
    channel: function () {
      return {
        on: function (_e, _f, cb) { eq.subscribe(cb); return this; },
        subscribe: function () { return this; }
      };
    }
  };

  if (!global.EQUIFLOW_CONFIG.useMock && global.supabase && global.supabase.createClient &&
      global.EQUIFLOW_CONFIG.supabaseUrl.indexOf("http") === 0) {
    global.sb = global.supabase.createClient(global.EQUIFLOW_CONFIG.supabaseUrl, global.EQUIFLOW_CONFIG.supabaseAnonKey);
  } else {
    global.sb = mockClient;
  }

  global.eq = eq;
  global.eqUrl = eqUrl;

  if (!localStorage.getItem(DB_KEY)) loadDb();
})(window);
