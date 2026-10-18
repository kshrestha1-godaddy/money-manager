const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name) {
    const source = fs.readFileSync(path.resolve(__dirname, '../../app/utils', `${name}.ts`), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, Date, require: (name) => load(path.basename(name)) });
    return exports;
}
const { calculateDebtRecovery } = load('debtRecovery');
const debt = (changes = {}) => ({ amount: 100, interestRate: 0, lentDate: '2026-01-01', dueDate: '2027-01-01', status: 'ACTIVE', repayments: [], ...changes });

test('uses computed groups despite stale statuses and reconciles all repayments', () => {
    const result = calculateDebtRecovery([
        debt({ status: 'PARTIALLY_PAID' }),
        debt({ repayments: [{ amount: 40 }] }),
        debt({ status: 'PARTIALLY_PAID', repayments: [{ amount: 100 }] }),
        debt({ status: 'FULLY_PAID' }),
    ]);
    assert.equal(result.counts.active, 1);
    assert.equal(result.counts.partial, 1);
    assert.equal(result.counts.full, 2);
    assert.equal(result.activeAmount, 100);
    assert.equal(result.partialRemainingAmount, 60);
    assert.equal(result.partialRepaidAmount, 40);
    assert.equal(result.fullyPaidAmount, 200);
    assert.equal(result.totalWithInterest, 400);
    assert.equal(result.totalWithInterest, result.fullyPaidAmount + result.partialRepaidAmount + result.partialRemainingAmount + result.activeAmount);
});

test('includes term interest and handles overpaid loans without negative balances', () => {
    const result = calculateDebtRecovery([
        debt({ interestRate: 10, repayments: [{ amount: 40 }] }),
        debt({ repayments: [{ amount: 150 }] }),
    ]);
    assert.equal(result.totalWithInterest, 210);
    assert.equal(result.partialRemainingAmount, 70);
    assert.equal(result.partialRepaidAmount, 40);
    assert.equal(result.fullyPaidAmount, 100);
});

test('empty debt list returns zero totals', () => {
    const result = calculateDebtRecovery([]);
    assert.equal(result.totalWithInterest, 0);
    assert.equal(result.counts.total, 0);
});

const { groupLendings } = load('lendingDebtGrouping');
const { calculateRemainingWithInterest } = load('interestCalculation');

test('table sections, row balances, and summary reconcile with timestamped due dates', () => {
    const debts = [
        debt({ amount: 62500, interestRate: 11, lentDate: new Date('2026-09-16T10:00:00Z'), dueDate: new Date('2026-10-30T10:00:00Z') }),
        debt({ amount: 145000, interestRate: 11, lentDate: new Date('2026-09-16T10:00:00Z'), dueDate: new Date('2026-10-31T10:00:00Z') }),
        debt({ amount: 65000, repayments: [{ amount: 50000 }] }),
        debt({ status: 'FULLY_PAID' }),
    ];
    const summary = calculateDebtRecovery(debts);
    const sections = groupLendings(debts, ['status']);
    const active = sections.find(section => section.key === 'status:ACTIVE');
    assert.equal(active.totalRemaining, summary.activeAmount);
    assert.equal(sections.reduce((sum, section) => sum + section.totalRemaining, 0), summary.totalOutstanding);
    assert.equal(summary.totalRepaid + summary.totalOutstanding, summary.totalWithInterest);
    assert.equal(summary.totalPrincipal + summary.totalInterest, summary.totalWithInterest);
    assert.equal(active.totalRemaining, active.debts.reduce((sum, item) => sum + calculateRemainingWithInterest(
        item.amount, item.interestRate, item.lentDate, item.dueDate, item.repayments, new Date(), item.status
    ).remainingAmount, 0));
    assert.equal(debts[0].dueDate.toISOString(), '2026-10-30T10:00:00.000Z');
});
