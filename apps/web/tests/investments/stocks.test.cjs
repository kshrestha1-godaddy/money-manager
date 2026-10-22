const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies = {}) {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../app/(dashboard)/investments", file),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) =>
      dependencies[name] ??
      (name === "./expense-portfolios"
        ? load("actions/expense-portfolios.ts", dependencies)
        : {}),
  });
  return exports;
}
const { monthlyStockPurchases } = load("utils/stockPurchases.ts");
const purchase = (date, amount) => ({ id: 1, title: "Stocks", date, amount });
test("monthly purchases aggregate entries, fill gaps and calculate consecutive MoM changes", () => {
  const rows = monthlyStockPurchases(
    [
      purchase("2026-03-31T23:00:00Z", 150),
      purchase("2026-01-02T00:00:00Z", 100),
      purchase("2026-01-20T00:00:00Z", 50),
      purchase("2026-04-01T00:00:00Z", 300),
    ],
    "2026-05",
  );
  assert.equal(
    rows.map((r) => r.month).join(","),
    "2026-01,2026-02,2026-03,2026-04,2026-05",
  );
  assert.equal(rows.map((r) => r.amount).join(","), "150,0,150,300,0");
  assert.equal(rows.map((r) => r.change).join(","), ",-100,,100,-100");
  assert.equal(
    rows.reduce((sum, r) => sum + r.amount, 0),
    600,
  );
  assert.equal(monthlyStockPurchases([], "2026-05").length, 0);
});
test("monthly purchases cross years without merging different Januarys", () => {
  const rows = monthlyStockPurchases(
    [purchase("2025-12-01", 10), purchase("2026-01-01", 20)],
    "2026-01",
  );
  assert.equal(rows.map((r) => r.month).join(","), "2025-12,2026-01");
  assert.equal(rows[1].change, 100);
});
const { resolvePurchasePriceForInvestmentDisplay } = load(
  "utils/stocksExpenseBasis.ts",
  { "./investmentTypeUi": { getInvestmentTypeLabel: () => "Stocks" } },
);
test("Stocks cost always comes from expenses, including zero after deleting purchases", () => {
  const stock = { type: "STOCKS", quantity: 2, purchasePrice: 500 };
  assert.equal(resolvePurchasePriceForInvestmentDisplay(stock, 600, 1), 300);
  assert.equal(resolvePurchasePriceForInvestmentDisplay(stock, 600, 2), 150);
  assert.equal(resolvePurchasePriceForInvestmentDisplay(stock, 0, 1), 0);
  assert.equal(
    resolvePurchasePriceForInvestmentDisplay(
      { ...stock, type: "GOLD" },
      600,
      1,
    ),
    500,
  );
});

function actions({
  positions = [],
  session = { user: { id: "7" } },
  type = "STOCKS",
} = {}) {
  const writes = [];
  const tx = {
    user: { findUnique: async () => ({ currency: "USD" }) },
    investment: {
      findMany: async (args) => {
        assert.equal(args.where.userId, 7);
        assert.equal(args.where.type, type);
        return positions;
      },
      create: async (args) => writes.push(args),
      update: async (args) => writes.push(args),
    },
  };
  const api = load(type === "SIP" ? "actions/sip.ts" : "actions/stocks.ts", {
    "@repo/db/client": {
      default: { $transaction: async (callback) => callback(tx) },
    },
    "next-auth": { getServerSession: async () => session },
    "../../../utils/auth": { getUserIdFromSession: Number },
    "next/cache": { revalidatePath: () => {} },
  });
  return { ...api, writes };
}
test("first valuation creates a portfolio without an account deduction", async () => {
  const api = actions();
  await api.saveStocksCurrentValue(250, "USD");
  assert.equal(api.writes.length, 1);
  assert.equal(api.writes[0].data.currentPrice, 250);
  assert.equal(api.writes[0].data.quantity, 1);
  assert.equal(api.writes[0].data.deductFromAccount, false);
  assert.equal(api.writes[0].data.userId, 7);
});
test("legacy positions retain quantities and links while total current value reconciles", async () => {
  const positions = [
    { id: 1, quantity: 2, currentPrice: 50 },
    { id: 2, quantity: 5, currentPrice: 60 },
  ];
  const api = actions({ positions });
  await api.saveStocksCurrentValue(800, "USD");
  assert.equal(
    api.writes.reduce(
      (sum, w, i) => sum + w.data.currentPrice * positions[i].quantity,
      0,
    ),
    800,
  );
  assert.equal(
    api.writes.every((w) => Object.keys(w.data).join(",") === "currentPrice"),
    true,
  );
});
test("valuation rejects invalid input, changed currency and unauthenticated access", async () => {
  for (const value of [-1, NaN, Infinity, 1e16])
    await assert.rejects(actions().saveStocksCurrentValue(value, "USD"));
  await assert.rejects(
    actions().saveStocksCurrentValue(1, "NPR"),
    /currency changed/,
  );
  await assert.rejects(
    actions({ session: null }).saveStocksCurrentValue(1, "USD"),
    /Unauthorized/,
  );
});

test("stock purchase details retain original cost, expense metadata and converted value", async () => {
  const recorded = new Date("2026-10-20T12:00:00Z");
  let query;
  const api = load("actions/stocks.ts", {
    "@repo/db/client": {
      default: {
        user: { findUnique: async () => ({ currency: "NPR" }) },
        expense: {
          findMany: async (args) => {
            query = args;
            return [
              {
                id: 9,
                title: "Share purchase",
                amount: "125.50",
                currency: "USD",
                date: recorded,
                description: "Broker purchase",
                category: { name: "Stocks" },
                account: {
                  bankName: "Bank",
                  holderName: "Owner",
                  nickname: "Trading",
                  accountNumber: "1234",
                },
                tags: ["long term"],
                location: ["Kathmandu"],
                transactionLocation: { latitude: "27.7", longitude: "85.3" },
                notes: "Includes fees",
                receipt: "https://example.com/receipt",
                isRecurring: false,
                recurringFrequency: null,
                createdAt: recorded,
                updatedAt: recorded,
              },
            ];
          },
        },
      },
    },
    "next-auth": { getServerSession: async () => ({ user: { id: "7" } }) },
    "../../../utils/auth": { getUserIdFromSession: Number },
    "../../../data/currency-rate-config": {
      getCurrencyRateConfigQuery: async () => ({ matrix: {} }),
    },
    "../../../utils/currencyConversion": {
      convertCurrencySync: (amount, from, to) => {
        assert.equal(from, "USD");
        assert.equal(to, "NPR");
        return amount * 100;
      },
    },
  });
  const result = await api.getStockPurchases();
  assert.equal(query.where.userId, 7);
  assert.equal(query.where.category.name.equals, "Stocks");
  assert.equal(query.orderBy.date, "desc");
  assert.equal(query.select.account.select.appPassword, undefined);
  const purchase = result.purchases[0];
  assert.equal(purchase.originalAmount, 125.5);
  assert.equal(purchase.amount, 12550);
  assert.equal(purchase.currency, "USD");
  assert.equal(purchase.description, "Broker purchase");
  assert.equal(purchase.notes, "Includes fees");
  assert.equal(purchase.coordinates.latitude, 27.7);
  assert.equal(purchase.coordinates.longitude, 85.3);
  assert.equal(purchase.receipt, "https://example.com/receipt");
  assert.equal(purchase.createdAt, recorded.toISOString());
  assert.equal(purchase.tags[0], "long term");
  assert.doesNotThrow(() => JSON.stringify(result));
});

const { stockDateRange, filterStockPurchases } = load(
  "../stocks/purchaseFilters.ts",
);
test("stock periods use rolling calendar months, clamp month ends and support YTD", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  for (const [period, start] of [
    ["1M", "2026-09-22"],
    ["3M", "2026-07-22"],
    ["6M", "2026-04-22"],
    ["1Y", "2025-10-22"],
    ["YTD", "2026-01-01"],
  ]) {
    const range = stockDateRange(period, "", "", now);
    assert.equal(range.start, start);
    assert.equal(range.end, "2026-10-22");
  }
  assert.equal(
    stockDateRange("1M", "", "", new Date("2024-03-31T00:00:00Z")).start,
    "2024-02-29",
  );
  assert.equal(stockDateRange("ALL", "", "", now).start, "");
  assert.equal(
    stockDateRange("CUSTOM", "2025-01-01", "2025-06-30", now).end,
    "2025-06-30",
  );
});
test("purchase search combines metadata matching with inclusive date boundaries", () => {
  const purchases = [
    {
      id: 992,
      title: "Broker purchase",
      date: "2026-09-22T00:00:00Z",
      notes: "Long term",
      tags: ["Technology"],
      account: { bankName: "Trading Bank" },
    },
    {
      id: 993,
      title: "Shares",
      date: "2026-10-22T23:59:59Z",
      description: "Technology",
      location: ["Kathmandu"],
    },
    {
      id: 994,
      title: "Old purchase",
      date: "2026-09-21T23:59:59Z",
      tags: ["Technology"],
    },
  ];
  const range = { start: "2026-09-22", end: "2026-10-22" };
  assert.equal(
    filterStockPurchases(purchases, " technology ", range).length,
    2,
  );
  assert.equal(filterStockPurchases(purchases, "#992", range)[0].id, 992);
  assert.equal(
    filterStockPurchases(purchases, "TRADING BANK", range)[0].id,
    992,
  );
  assert.equal(filterStockPurchases(purchases, "Kathmandu", range)[0].id, 993);
  assert.equal(filterStockPurchases(purchases, "", range).length, 2);
  assert.equal(
    filterStockPurchases(purchases, "", {
      start: "2026-11-01",
      end: "2026-01-01",
    }).length,
    0,
  );
});

test("SIP valuation is separate from Stocks and does not deduct the expense twice", async () => {
  const api = actions({ type: "SIP" });
  await api.saveSIPCurrentValue(1500, "USD");
  assert.equal(api.writes[0].data.type, "SIP");
  assert.equal(api.writes[0].data.name, "SIP portfolio");
  assert.equal(api.writes[0].data.quantity, 1);
  assert.equal(api.writes[0].data.currentPrice, 1500);
  assert.equal(api.writes[0].data.deductFromAccount, false);
  const existing = actions({
    type: "SIP",
    positions: [{ id: 12, quantity: 2, currentPrice: 400 }],
  });
  await existing.saveSIPCurrentValue(1200, "USD");
  assert.equal(existing.writes[0].where.id, 12);
  assert.equal(existing.writes[0].data.currentPrice, 600);
});
test("SIP purchases query only the signed-in user and SIP expense category", async () => {
  let query;
  const api = load("actions/sip.ts", {
    "@repo/db/client": {
      default: {
        user: { findUnique: async () => ({ currency: "NPR" }) },
        expense: {
          findMany: async (args) => {
            query = args;
            return [];
          },
        },
      },
    },
    "next-auth": { getServerSession: async () => ({ user: { id: "7" } }) },
    "../../../utils/auth": { getUserIdFromSession: Number },
    "../../../data/currency-rate-config": {
      getCurrencyRateConfigQuery: async () => ({ matrix: {} }),
    },
  });
  const result = await api.getSIPPurchases();
  assert.equal(query.where.userId, 7);
  assert.equal(query.where.category.type, "EXPENSE");
  assert.equal(query.where.category.name.equals, "SIP");
  assert.equal(query.where.category.name.mode, "insensitive");
  assert.equal(result.currency, "NPR");
  assert.equal(result.purchases.length, 0);
});
test("SIP cost basis follows SIP expenses, including zero, without affecting other types", () => {
  const { resolvePurchasePriceForInvestmentDisplay } = load(
    "utils/stocksExpenseBasis.ts",
    { "./investmentTypeUi": { getInvestmentTypeLabel: () => "Stocks" } },
  );
  const sip = { type: "SIP", quantity: 5, purchasePrice: 900 };
  assert.equal(resolvePurchasePriceForInvestmentDisplay(sip, 500, 1), 100);
  assert.equal(resolvePurchasePriceForInvestmentDisplay(sip, 0, 1), 0);
});
test("portfolio actions reject unsupported types before making database changes", async () => {
  const api = load("actions/expense-portfolios.ts");
  await assert.rejects(
    api.getExpensePortfolioPurchases("OTHER"),
    /Invalid portfolio type/,
  );
  await assert.rejects(
    api.saveExpensePortfolioCurrentValue("OTHER", 1, "USD"),
    /Invalid portfolio type/,
  );
});

const { materializeExpensePortfolio } = load('utils/materializeExpensePortfolio.ts');
test('editing a SIP preview preserves expense cost and target without another account debit', () => {
  const source = { id: -2, type: 'SIP', name: 'SIP portfolio', quantity: 1, purchasePrice: 62594.38, currentPrice: 0, purchaseDate: new Date('2025-01-02'), deductFromAccount: false };
  const result = materializeExpensePortfolio(source, { investmentTargetId: 28, currentPrice: 70000, quantity: 2, accountId: 3, deductFromAccount: true, purchasePrice: 1, type: 'OTHER' });
  assert.equal(result.type, 'SIP');
  assert.equal(result.investmentTargetId, 28);
  assert.equal(result.quantity * result.purchasePrice, 62594.38);
  assert.equal(result.quantity * result.currentPrice, 140000);
  assert.equal(result.deductFromAccount, false);
  assert.equal(result.accountId, 3);
  assert.equal(result.id, undefined);
  assert.equal(result.userId, undefined);
});
test('expense preview edits support clearing a target and reject saved or unrelated positions', () => {
  const source = { id: -1, type: 'STOCKS', name: 'Stocks', quantity: 1, purchasePrice: 100, currentPrice: 120, investmentTargetId: 9 };
  assert.equal(materializeExpensePortfolio(source, { investmentTargetId: null }).investmentTargetId, null);
  assert.throws(() => materializeExpensePortfolio({ ...source, id: 1 }, {}));
  assert.throws(() => materializeExpensePortfolio({ ...source, type: 'GOLD' }, {}));
  assert.throws(() => materializeExpensePortfolio(source, { quantity: 0 }));
});
