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
    vm.runInNewContext(compiled, { exports, Date, require: () => load('interestCalculation') });
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
