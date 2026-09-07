(function (global) {
  var IDS = {
    ramesh: "11111111-1111-1111-1111-111111111111",
    priya: "22222222-2222-2222-2222-222222222222",
    meera: "33333333-3333-3333-3333-333333333333",
    loanRamesh: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    loanPriya: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
  };

  var DEMO_ACCOUNTS = [
    {
      email: "farmer@equiflow.demo",
      password: "Demo@1234",
      full_name: "Ramesh Patel",
      role: "farmer",
      id: IDS.ramesh
    },
    {
      email: "lender@equiflow.demo",
      password: "Demo@1234",
      full_name: "Meera Iyer",
      role: "lender",
      id: IDS.meera
    }
  ];

  var RAMESH_MONTHS = [
    ["2025-01-28", 9200, 11800, 1200, "lean"],
    ["2025-02-28", 8800, 12100, 1400, "lean"],
    ["2025-03-28", 11200, 16800, 10200, "planting"],
    ["2025-04-28", 58400, 19200, 4500, "harvest"],
    ["2025-05-28", 21400, 14200, 3200, "regular"],
    ["2025-06-28", 9800, 12400, 1600, "lean"],
    ["2025-07-28", 10200, 13100, 1800, "lean"],
    ["2025-08-28", 19800, 13900, 3400, "regular"],
    ["2025-09-28", 10800, 17200, 11000, "planting"],
    ["2025-10-28", 49200, 18100, 4100, "harvest"],
    ["2025-11-28", 22600, 14500, 2800, "regular"],
    ["2025-12-28", 15400, 16200, 2100, "regular"],
    ["2026-01-28", 8900, 11900, 1300, "lean"],
    ["2026-02-28", 9100, 12300, 1500, "lean"],
    ["2026-03-28", 11500, 17100, 10800, "planting"],
    ["2026-04-28", 61200, 20500, 4800, "harvest"],
    ["2026-05-28", 22100, 14800, 3100, "regular"],
    ["2026-06-28", 9400, 12600, 1700, "lean"]
  ];

  var PRIYA_MONTHS = [
    ["2025-01-28", 16800, 14200, 0, "regular"],
    ["2025-02-28", 17200, 13800, 0, "regular"],
    ["2025-03-28", 18100, 14500, 0, "regular"],
    ["2025-04-28", 19400, 15100, 0, "wedding"],
    ["2025-05-28", 17600, 14000, 0, "regular"],
    ["2025-06-28", 12100, 13900, 0, "monsoon"],
    ["2025-07-28", 11400, 14100, 0, "monsoon"],
    ["2025-08-28", 15800, 13600, 0, "regular"],
    ["2025-09-28", 18900, 14800, 0, "regular"],
    ["2025-10-28", 28600, 17200, 0, "festival"],
    ["2025-11-28", 31200, 19100, 0, "festival"],
    ["2025-12-28", 24800, 18500, 0, "holiday"],
    ["2026-01-28", 16400, 15200, 0, "regular"],
    ["2026-02-28", 17800, 14100, 0, "regular"],
    ["2026-03-28", 18400, 14600, 0, "regular"],
    ["2026-04-28", 20100, 15300, 0, "wedding"],
    ["2026-05-28", 18800, 14400, 0, "regular"],
    ["2026-06-28", 11900, 13800, 0, "monsoon"]
  ];

  function txns(farmerId, rows, prefix) {
    return rows.map(function (r, i) {
      return {
        id: prefix + "-" + String(i + 1).padStart(3, "0"),
        farmer_id: farmerId,
        txn_date: r[0],
        income: r[1],
        expenses: r[2],
        farming_expenses: r[3],
        category: r[4]
      };
    });
  }

  function generateSeed() {
    var now = new Date().toISOString();
    return {
      users: [
        { id: IDS.ramesh, email: "farmer@equiflow.demo", password: "Demo@1234", created_at: "2025-01-04T00:00:00.000Z" },
        { id: IDS.priya, email: "priya@equiflow.demo", password: "Demo@1234", created_at: "2025-01-06T00:00:00.000Z" },
        { id: IDS.meera, email: "lender@equiflow.demo", password: "Demo@1234", created_at: "2025-01-02T00:00:00.000Z" }
      ],
      profiles: [
        {
          id: IDS.ramesh,
          full_name: "Ramesh Patel",
          role: "farmer",
          occupation: "Sugarcane & onion farmer",
          location: "Niphad, Nashik",
          acres: 4.2,
          phone: "+91 98765 41021",
          avatar: "https://images.pexels.com/photos/20458058/pexels-photo-20458058.jpeg?auto=compress&cs=tinysrgb&w=400",
          created_at: "2025-01-04T00:00:00.000Z"
        },
        {
          id: IDS.priya,
          full_name: "Priya Sharma",
          role: "farmer",
          occupation: "Gig delivery + weekend stall",
          location: "Kothrud, Pune",
          acres: null,
          phone: "+91 98230 11844",
          avatar: "https://images.pexels.com/photos/13431763/pexels-photo-13431763.jpeg?auto=compress&cs=tinysrgb&w=400",
          created_at: "2025-01-06T00:00:00.000Z"
        },
        {
          id: IDS.meera,
          full_name: "Meera Iyer",
          role: "lender",
          occupation: "Field officer, Grameen Trust",
          location: "Pune circle",
          acres: null,
          phone: "+91 99400 22119",
          avatar: "https://images.pexels.com/photos/6076115/pexels-photo-6076115.jpeg?auto=compress&cs=tinysrgb&w=400",
          created_at: "2025-01-02T00:00:00.000Z"
        }
      ],
      loans: [
        {
          id: IDS.loanRamesh,
          farmer_id: IDS.ramesh,
          lender_id: IDS.meera,
          principal: 80000,
          outstanding: 54400,
          base_emi: 4800,
          start_date: "2025-01-10",
          status: "active",
          product: "Kisan flexi-crop"
        },
        {
          id: IDS.loanPriya,
          farmer_id: IDS.priya,
          lender_id: IDS.meera,
          principal: 45000,
          outstanding: 31200,
          base_emi: 2600,
          start_date: "2025-01-15",
          status: "active",
          product: "Gig-worker flexi"
        }
      ],
      transactions: txns(IDS.ramesh, RAMESH_MONTHS, "txn-r").concat(txns(IDS.priya, PRIYA_MONTHS, "txn-p")),
      repayment_plans: (function () {
        var priyaTxnsToDate = txns(IDS.priya, PRIYA_MONTHS, "txn-p")
          .filter(function (t) { return t.txn_date <= "2026-02-28"; });
        var priyaAnalysis = EquiFlowEngine.analyzeCashFlow(priyaTxnsToDate, 2600);
        return [
          {
            id: "plan-priya-001",
            loan_id: IDS.loanPriya,
            status: "approved",
            risk_level: priyaAnalysis.riskLevel,
            recommended_emi: priyaAnalysis.recommendedEMI,
            message: priyaAnalysis.message,
            suggested_action: priyaAnalysis.suggestedAction,
            created_at: "2026-02-01T00:00:00.000Z",
            for_month: "2026-02",
            cashflow_status: priyaAnalysis.status
          }
        ];
      })(),
      payments: [],
      notifications: [
        {
          id: "ntf-0001",
          farmer_id: IDS.ramesh,
          title: "Welcome to EquiFlow",
          body: "Your repayment will now flex with harvest and lean months — never a blind EMI.",
          created_at: "2025-01-10T10:00:00.000Z",
          read: true
        }
      ],
      as_of: "2026-02-28",
      seeded_at: now
    };
  }

  global.EquiFlowMock = {
    IDS: IDS,
    DEMO_ACCOUNTS: DEMO_ACCOUNTS,
    AS_OF_START: "2026-02-28",
    AS_OF_MAX: "2026-06-28",
    generateSeed: generateSeed
  };
})(window);
