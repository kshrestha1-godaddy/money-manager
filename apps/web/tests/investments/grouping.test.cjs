const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name) {
    const source = fs.readFileSync(path.resolve(__dirname, '../../app/(dashboard)/investments/utils', `${name}.ts`), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: name => load(path.basename(name)) });
    return exports;
}
const { groupInvestments, isInvestmentGrouping } = load('investmentGrouping');
const position = (id, changes = {}) => ({ id, type: 'STOCKS', quantity: 2, purchasePrice: 100, currentPrice: 110, ...changes });

test('default performance sections preserve order and reconcile totals without mutating input', () => {
    const items = [position(1), position(2, { currentPrice: 100 }), position(3, { currentPrice: 90 })];
    const sections = groupInvestments(items, 'performance');
    assert.equal(sections.map(s => s.key).join(','), 'gainers,break-even,losers');
    assert.equal(sections.reduce((sum, s) => sum + s.totalInvested, 0), 600);
    assert.equal(sections.reduce((sum, s) => sum + s.currentValue, 0), 600);
    assert.equal(items.map(i => i.id).join(','), '1,2,3');
    assert.equal(groupInvestments([], 'performance').length, 0);
});

test('bank, type, target and withheld groups include unlinked positions exactly once', () => {
    const target = { id: 1, nickname: 'Home', investmentType: 'STOCKS', targetAmount: 1000, fulfilledAmount: 100 };
    const items = [
        position(1, { accountId: 1, account: { bankName: 'Bank A' }, deductFromAccount: true, investmentTargetId: 1, investmentTarget: target }),
        position(2, { accountId: 1, account: { bankName: 'bank a' }, deductFromAccount: false, investmentTargetId: 2, investmentTarget: { ...target, id: 2 } }),
        position(3, { type: 'GOLD', deductFromAccount: true }),
    ];
    for (const mode of ['bank', 'type', 'target', 'withheld']) {
        const sections = groupInvestments(items, mode);
        assert.equal(sections.reduce((sum, s) => sum + s.count, 0), items.length);
        assert.equal(sections.reduce((sum, s) => sum + s.gainLoss, 0), 60);
    }
    assert.equal(groupInvestments(items, 'bank').find(s => s.key === 'bank:bank a').count, 2);
    assert.equal(groupInvestments(items, 'target').length, 3);
    assert.equal(groupInvestments(items, 'withheld').find(s => s.key === 'withheld').count, 1);
});

test('profit margins use only three groups including zero cost and zero quantity', () => {
    const prices = [89, 90, 99, 100, 101, 110, 125, 150];
    const sections = groupInvestments([
        ...prices.map((currentPrice, id) => position(id, { currentPrice })),
        position(99, { purchasePrice: 0 }),
        position(100, { quantity: 0 }),
    ], 'profitMargin');
    assert.equal(sections.map(s => s.count).join(','), '3,2,5');
    assert.equal(sections.map(s => s.title).join(','), 'Loser (3),Breakeven (2),Gainer (5)');
    assert.equal(sections.every(s => Number.isFinite(s.gainLossPercentage)), true);
});

test('only supported saved grouping values are accepted', () => {
    for (const value of ['performance', 'bank', 'type', 'target', 'withheld', 'profitMargin']) {
        assert.equal(isInvestmentGrouping(value), true);
    }
    for (const value of [null, undefined, '', 'unknown', {}, ['bank']]) {
        assert.equal(isInvestmentGrouping(value), false);
    }
});
