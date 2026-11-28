const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadAction(name, dependencies) {
    const source = fs.readFileSync(path.join(__dirname, '../../app/(dashboard)/investments/actions', name), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        console: { info() {}, error() {} },
        require: name => dependencies[name] ?? {},
    });
    return exports;
}

test('single and bulk investment deletion remove open reminders before deleting positions and recalculate inside the transaction', async () => {
    const calls = [];
    const tx = {
        investment: {
            findMany: async ({ where }) => where.id.in.map(() => ({ investmentTargetId: 7 })),
            deleteMany: async ({ where }) => {
                calls.push('investments');
                return { count: where.id.in.length };
            },
        },
        scheduledPayment: {
            deleteMany: async ({ where }) => {
                assert.equal(where.userId, 3);
                assert.equal(where.resolution, null);
                calls.push(`reminders:${where.investmentId.in.join(',')}`);
            },
        },
    };
    const { deleteInvestment, bulkDeleteInvestments } = loadAction('investments.ts', {
        '@repo/db/client': { default: { $transaction: callback => callback(tx) } },
        'next/cache': { revalidatePath() {} },
        '../../../lib/security/require-app-lock-password': { requireAppLockPassword: async () => 3 },
        '../../../utils/ledgerCurrency': { getLockedLedgerCurrency: async () => 'USD' },
        './schedule-investment': {
            recalcOpenContributionSchedulesForTarget: async (userId, targetId, transaction) => {
                assert.equal(userId, 3);
                assert.equal(targetId, 7);
                assert.equal(transaction, tx);
                calls.push('recalculate');
            },
        },
    });

    await deleteInvestment(1, 'password');
    const result = await bulkDeleteInvestments([2, 3], 'password');
    assert.equal(result.deletedCount, 2);
    assert.deepEqual(calls, [
        'reminders:1', 'investments', 'recalculate',
        'reminders:2,3', 'investments', 'recalculate',
    ]);
});

test('target deletion cancels unresolved reminders while the target links still exist', async () => {
    const calls = [];
    const tx = {
        scheduledPayment: {
            deleteMany: async ({ where }) => {
                assert.equal(where.resolution, null);
                assert.equal(where.investment.investmentTarget.is.userId, 3);
                assert.equal(where.investment.investmentTarget.is.id, 7);
                calls.push('reminders');
            },
        },
        investmentTarget: {
            deleteMany: async ({ where }) => {
                assert.equal(where.userId, 3);
                assert.equal(where.id, 7);
                calls.push('target');
                return { count: 1 };
            },
        },
    };
    const { deleteInvestmentTarget } = loadAction('investment-targets.ts', {
        '@repo/db/client': { default: { $transaction: callback => callback(tx) } },
        'next/cache': { revalidatePath() {} },
        '../../../lib/security/require-app-lock-password': { requireAppLockPassword: async () => 3 },
        '../../../utils/ledgerCurrency': { getLockedLedgerCurrency: async () => 'USD' },
    });
    await deleteInvestmentTarget(7, 'password');
    assert.deepEqual(calls, ['reminders', 'target']);
});
