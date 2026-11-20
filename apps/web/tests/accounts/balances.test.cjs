const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadAccountModule(file, dependencies = {}) {
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
        exports,
        require: (id) => id in dependencies ? dependencies[id] : require(id),
    });
    return exports;
}

const { getAccountBalanceTotals, sumAccountWithheld } =
    loadAccountModule("(dashboard)/accounts/utils/accountWithheld.ts");

test("a filtered account only subtracts investments linked to that account", () => {
    const accounts = [
        { id: 1, bankName: "Same Bank", balance: 30 },
        { id: 2, bankName: "Same Bank", balance: 100 },
    ];
    const withheld = sumAccountWithheld({
        1: [{ amount: 10 }, { amount: 30 }],
        2: [{ amount: 25 }],
        3: [{ amount: 200 }],
    });

    const filtered = getAccountBalanceTotals(accounts.slice(0, 1), withheld);
    assert.equal(filtered.balance, 30);
    assert.equal(filtered.withheld, 40);
    assert.equal(filtered.free, -10);

    const all = getAccountBalanceTotals(accounts, withheld);
    assert.equal(all.balance, 130);
    assert.equal(all.withheld, 65);
    assert.equal(all.free, 65);
    assert.equal(getAccountBalanceTotals([], withheld).free, 0);
});

test("account opening dates use the stored calendar day and tolerate invalid dates", () => {
    const { accountOpeningDay, formatAccountOpeningDate } =
        loadAccountModule("(dashboard)/accounts/utils/accountOpeningDate.ts");
    assert.equal(accountOpeningDay("2026-03-01T00:00:00.000Z"), "2026-03-01");
    assert.equal(formatAccountOpeningDate("2026-03-01T00:00:00.000Z"), "March 1, 2026");
    assert.equal(accountOpeningDay("invalid"), "");
    assert.equal(formatAccountOpeningDate("invalid"), "—");
});

test("bulk deletion omits selected accounts that are no longer in the result", async () => {
    const deleted = [];
    const { accountOpeningDay } =
        loadAccountModule("(dashboard)/accounts/utils/accountOpeningDate.ts");
    const accounts = [
        { id: 1, bankName: "First Bank" },
        { id: 2, bankName: "Second Bank" },
    ];
    const { useOptimizedAccounts } = loadAccountModule("hooks/useOptimizedAccounts.ts", {
        react: {
            useState(initial) {
                const value = initial?.constructor?.name === "Set" ? new Set([1, 2]) : initial;
                return [value, () => {}];
            },
            useMemo: (compute) => compute(),
            useCallback: (callback) => callback,
        },
        "@tanstack/react-query": {
            useQueryClient: () => ({}),
            useQuery: () => ({ data: accounts }),
            useMutation: ({ mutationFn }) => ({ mutateAsync: mutationFn }),
        },
        "../(dashboard)/accounts/utils/accountOpeningDate": { accountOpeningDay },
        "../(dashboard)/accounts/actions/accounts": {
            bulkDeleteAccounts: async (ids) => deleted.push(...ids),
        },
        "./useTotalBalance": {},
        "../utils/csv": {},
    });
    // Simulate an account disappearing from the query after selection.
    accounts.pop();
    const state = useOptimizedAccounts();
    assert.deepEqual([...state.selectedAccounts], [1]);
    await state.handleBulkDelete();
    assert.deepEqual(deleted, [1]);
});

test("CSV import reports the server's saved count and rejected rows after saving", async () => {
    const state = [];
    let index = 0;
    let finishSave;
    const save = new Promise((resolve) => { finishSave = resolve; });
    const rows = [{ holderName: "First" }, { holderName: "Second" }];

    const { ImportAccountModal } = loadAccountModule("(dashboard)/accounts/components/ImportAccountModal.tsx", {
        react: {
            useState(initial) {
                const slot = index++;
                if (!(slot in state)) state[slot] = initial;
                return [state[slot], (value) => { state[slot] = value; }];
            },
        },
        "../../../utils/csv": {
            processAccountImport: async () => ({
                success: true,
                data: rows,
                validatedData: rows,
                totalRows: 2,
                validRows: 2,
                errors: [],
                warnings: [],
            }),
        },
    });
    function render() {
        index = 0;
        return ImportAccountModal({ isOpen: true, onClose() {}, onImport: () => save });
    }
    function find(node, predicate) {
        if (Array.isArray(node)) return node.map((item) => find(item, predicate)).find(Boolean);
        if (!node?.props) return undefined;
        return predicate(node) ? node : find(node.props.children, predicate);
    }
    const fileInput = find(render(), (node) => node.type === "input" && node.props.type === "file");
    fileInput.props.onChange({ target: { files: [{ name: "accounts.csv", type: "text/csv" }] } });
    const importButton = find(render(), (node) => node.type === "button" && node.props.children === "Import Accounts");
    const pending = importButton.props.onClick();
    assert.equal(find(render(), (node) => node.type === "button" && node.props.children === "Processing...").props.disabled, true);

    finishSave({ data: [{ id: 1 }], errors: ["Second account already exists"] });
    await pending;
    const complete = render();
    assert.ok(find(complete, (node) => node.props.children === "1 account imported"));
    assert.ok(find(complete, (node) => node.props.children === "Second account already exists"));
});
