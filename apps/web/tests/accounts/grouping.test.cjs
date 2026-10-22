const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../../app/(dashboard)/accounts/utils/accountGrouping.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject });
const { groupAccounts } = exportsObject;
const accounts = [
    { id: 1, nickname: ' Family ', accountType: 'Savings' },
    { id: 2, nickname: 'family', accountType: 'Current' },
    { id: 3, nickname: ' ', accountType: 'Savings' },
    { id: 4, nickname: 'Travel', accountType: 'Current' },
];
test('nickname groups normalize whitespace and case, keep sorted row order, and put missing names last', () => {
    const groups = groupAccounts(accounts, 'nickname', {});
    assert.equal(groups.map(g => g.label).join(','), 'Family,Travel,No nickname');
    assert.equal(groups[0].accounts.map(a => a.id).join(','), '1,2');
    assert.equal(accounts[0].nickname, ' Family ');
});
test('account type groups contain every account once', () => {
    const groups = groupAccounts(accounts, 'accountType', {});
    assert.equal(groups.map(g => g.label).join(','), 'Current,Savings');
    assert.equal(groups.flatMap(g => g.accounts).map(a => a.id).sort().join(','), '1,2,3,4');
});
test('withheld grouping uses linked positions including zero-value positions', () => {
    const groups = groupAccounts(accounts, 'withheld', { 1: [{ amount: 0 }], 4: [{ amount: 100 }], 2: [] });
    assert.equal(groups[0].key, 'withheld');
    assert.equal(groups[0].accounts.map(a => a.id).join(','), '1,4');
    assert.equal(groups[1].accounts.map(a => a.id).join(','), '2,3');
});
test('no grouping preserves row order; empty input produces no sections', () => {
    assert.equal(groupAccounts(accounts, 'none', {})[0].accounts, accounts);
    assert.equal(groupAccounts([], 'nickname', {}).length, 0);
});
