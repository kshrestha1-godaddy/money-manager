const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}, globals = {}) {
    const source = fs.readFileSync(path.resolve(__dirname, "../../app", file), "utf8");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
        },
    });
    const exports = {};
    vm.runInNewContext(outputText, {
        ...globals,
        exports,
        require: (id) => id in dependencies ? dependencies[id] : require(id),
    });
    return exports;
}

const calendar = load("utils/transaction-calendar.ts");
const { createTransactionDayFormatter, getTrailingMonthRange, getVisibleSelection } = calendar;

test("calendar filters use the selected time zone through month and DST boundaries", () => {
    const losAngeles = createTransactionDayFormatter("America/Los_Angeles");
    const kathmandu = createTransactionDayFormatter("Asia/Kathmandu");
    assert.equal(losAngeles("2026-03-01T01:30:00Z"), "2026-02-28");
    assert.equal(kathmandu("2026-03-01T01:30:00Z"), "2026-03-01");
    assert.equal(losAngeles("2026-03-08T10:00:00Z"), "2026-03-08");
    assert.equal(losAngeles("invalid"), "");
    const { start, end } = getTrailingMonthRange("2026-03-31", 1);
    assert.equal(start, "2026-02-28");
    assert.equal(end, "2026-03-31");
    assert.equal(getTrailingMonthRange("2026-01-31", 3).start, "2025-10-31");
});

test("month and quarter totals use their respective prior-year periods in January", () => {
    const { getTransactionPeriodTotals } = load("utils/transaction-period-totals.ts");
    const totals = getTransactionPeriodTotals([
        { date: "2026-01-01T02:00:00Z", amount: 10 },
        { date: "2026-01-01T12:00:00Z", amount: 30 },
        { date: "2025-10-01T12:00:00Z", amount: 5 },
        { date: "2025-09-30T12:00:00Z", amount: 20 },
    ], createTransactionDayFormatter("America/Los_Angeles"), (item) => item.amount, 2026, 0);

    assert.equal(totals.currentMonth.amount, 30);
    assert.equal(totals.previousMonth.amount, 10);
    assert.equal(totals.currentQuarter.count, 1);
    assert.equal(totals.previousQuarter.amount, 15);
    assert.equal(totals.allTime.amount, 65);
});

test("bulk selection excludes transactions hidden by the current view", () => {
    assert.deepEqual([...getVisibleSelection([{ id: 4 }, { id: 8 }], new Set([4, 7, 8]))], [4, 8]);
});

test("expense breakdown keeps duplicate account labels separate and preserves zero and negative categories", () => {
    const { buildExpenseBreakdown } = load("(dashboard)/expenses/utils/expenseBreakdown.ts");
    const expense = (categoryId, name, amount, account) => ({ categoryId, category: { name }, amount, account });
    const firstAccount = { id: 1, nickname: "Daily", accountNumber: "00112233" };
    const secondAccount = { id: 2, nickname: "Daily", accountNumber: "00445566" };
    const breakdown = buildExpenseBreakdown([
        expense(1, "Others", 999, firstAccount),
        expense(2, "Small", 1, secondAccount),
        expense(3, "Transfers", 0, firstAccount),
        expense(4, "Refunds", -30, secondAccount),
    ], (item) => item.amount);

    assert.equal(breakdown.totalAmount, 970);
    assert.equal(breakdown.accountRows.length, 2);
    assert.equal(breakdown.accountRows[0].name, "Daily · ••2233");
    assert.equal(breakdown.accountRows[1].totalAmount, -29);
    assert.equal(breakdown.categoryRows.length, 4);
    const grouped = breakdown.displayedCategories.find((row) => row.key === "grouped-others");
    assert.equal(grouped.memberCategories[0].name, "Small");
    assert.equal(grouped.percentOfTotal, 0.1);
    assert.equal(breakdown.displayedCategories.filter((row) => row.name === "Others").length, 2);
    assert.equal(breakdown.displayedCategories.find((row) => row.name === "Refunds").percentOfTotal, 0);
    assert.equal(buildExpenseBreakdown([], (item) => item.amount).totalAmount, 0);
});

test("trend chart exports the same day and amount shown by a page date filter", () => {
    const ChartControls = () => null;
    const { FinancialAreaChart } = load("components/FinancialAreaChart.tsx", {
        react: { useMemo: (compute) => compute(), useState: (value) => [value, () => {}], useRef: () => ({ current: null }) },
        recharts: {},
        "../utils/currency": { formatCurrency: String },
        "../utils/chartUtils": { useChartExpansion: () => ({ isExpanded: false }) },
        "./ChartControls": { ChartControls },
        "../utils/currencyDisplay": { convertForDisplaySync: (amount) => amount },
        "../utils/transaction-calendar": calendar,
    });
    const chart = FinancialAreaChart({
        type: "expense",
        timezone: "America/Los_Angeles",
        hasPageFilters: true,
        pageStartDate: "2026-02-28",
        pageEndDate: "2026-02-28",
        data: [
            { date: "2026-03-01T01:30:00Z", amount: 25, title: "Included" },
            { date: "2026-03-01T12:00:00Z", amount: 100, title: "Excluded" },
        ],
    });
    const csv = chart.props.children.find((child) => child.type === ChartControls).props.csvData;
    assert.equal(csv.length, 2);
    assert.equal(csv[1].slice(0, 4).join(","), "2026-02-28,Feb 28,25,1");
});

test("expense bubble chart defaults to Table View and supports independent timeframes", () => {
    const state = [];
    let index = 0;
    const { useBubbleChart } = load("hooks/useBubbleChart.ts", {
        react: {
            useState(initial) {
                const slot = index++;
                if (!(slot in state)) state[slot] = initial;
                return [state[slot], (value) => { state[slot] = value; }];
            },
            useMemo: (compute) => compute(),
            useCallback: (callback) => callback,
            useEffect() {},
            useRef: (current) => ({ current }),
        },
        "../utils/transaction-calendar": calendar,
        "../utils/currencyDisplay": { convertForDisplaySync: (amount) => amount },
        "../utils/currency": { formatCurrency: String },
        "../utils/googleCharts": { loadGoogleCharts: async () => {} },
    });

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const transactions = [
        { categoryId: 1, category: { name: "This month" }, date: new Date(Date.UTC(year, month, 1)), amount: 50000 },
        { categoryId: 2, category: { name: "Earlier" }, date: new Date(Date.UTC(year, month - 1, 1)), amount: 1000 },
    ];
    function render() {
        index = 0;
        return useBubbleChart({
            transactions: transactions.slice(1), timeframeTransactions: transactions,
            currency: "USD", timezone: "UTC",
            config: { highValueThreshold: 20000 },
        });
    }
    const initial = render();
    assert.equal(initial.usesTableTimeframe, true);
    assert.equal(initial.visibleCategoryData.map(({ name }) => name).join(","), "Earlier");
    initial.setMonthToDate();
    const monthToDate = render();
    assert.equal(monthToDate.isMonthToDate, true);
    assert.equal(monthToDate.visibleCategoryData.map(({ name }) => name).join(","), "This month");
    monthToDate.clearTimeframeFilters();
    const allTime = render();
    assert.equal(allTime.visibleCategoryData.length, 2);
    allTime.setTableTimeframe();
    assert.equal(render().visibleCategoryData[0].name, "Earlier");
});

test("expense breakdown keeps both plots mounted when the result is empty", () => {
    const BarChart = () => null;
    const Pie = () => null;
    const { ExpenseFrequencyCharts } = load("(dashboard)/expenses/components/ExpenseFrequencyCharts.tsx", {
        react: { useMemo: (compute) => compute(), useCallback: (callback) => callback },
        recharts: { BarChart, Pie },
        "../utils/expenseBreakdown": load("(dashboard)/expenses/utils/expenseBreakdown.ts"),
        "../../../utils/currency": { formatCurrency: String },
        "../../../utils/currencyDisplay": { convertForDisplaySync: (amount) => amount },
        "../../../providers/CurrencyProvider": { useCurrency: () => ({ currency: "USD" }) },
    });
    function find(node, type) {
        if (Array.isArray(node)) return node.map((child) => find(child, type)).find(Boolean);
        if (!node?.props) return undefined;
        return node.type === type ? node : find(node.props.children, type);
    }
    const charts = ExpenseFrequencyCharts({ expenses: [] });
    assert.equal(find(charts, BarChart).props.data.length, 0);
    assert.equal(find(charts, Pie).props.data.length, 0);
});

test("Google Charts shares concurrent loads and retries after a failed script", async () => {
    const scripts = [];
    const loadedPackages = [];
    const callbacks = [];
    const window = {};
    const document = {
        createElement: () => ({ remove() { this.removed = true; } }),
        head: { appendChild: (script) => scripts.push(script) },
    };
    const { loadGoogleCharts } = load("utils/googleCharts.ts", {}, { window, document, setTimeout, clearTimeout });
    const failed = loadGoogleCharts(["corechart"]);
    const rejected = assert.rejects(failed, /Could not load the chart library/);
    scripts[0].onerror();
    await rejected;
    assert.equal(scripts[0].removed, true);

    const first = loadGoogleCharts(["corechart"]);
    const second = loadGoogleCharts(["corechart"]);
    assert.equal(scripts.length, 2);

    window.google = { charts: {
        load: (_version, { packages }) => loadedPackages.push(...packages),
        setOnLoadCallback: (callback) => callbacks.push(callback),
    } };
    scripts[1].onload();
    await new Promise(setImmediate);
    assert.deepEqual(loadedPackages, ["corechart"]);
    assert.equal(callbacks.length, 1);
    callbacks[0]();
    await Promise.all([first, second]);
    await loadGoogleCharts(["corechart"]);
    assert.deepEqual(loadedPackages, ["corechart"]);
});
