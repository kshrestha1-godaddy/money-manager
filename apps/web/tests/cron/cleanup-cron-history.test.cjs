const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name, dependencies) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../app/services/cron', name), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Date, console, process,
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

const now = new Date('2026-10-18T09:00:00.000Z');
const cutoff = new Date('2026-10-11T09:00:00.000Z');

function setup(deleteMany) {
  return load('cleanup-cron-history.ts', {
    '@repo/db/client': { default: { cronBatchRun: { deleteMany } } },
    './cron-log-types': load('cron-log-types.ts', {}),
  });
}

test('deletes only batches strictly older than seven days using one atomic delete', async () => {
  let calls = 0;
  let batches = [
    { id: 1, startedAt: new Date(cutoff.getTime() - 1) },
    { id: 2, startedAt: cutoff },
    { id: 3, startedAt: new Date(cutoff.getTime() + 1) },
    { id: 4, startedAt: now },
  ];
  const { cleanupCronHistory } = setup(async ({ where }) => {
    calls++;
    assert.equal(Object.keys(where).join(), 'startedAt');
    assert.equal(Object.keys(where.startedAt).join(), 'lt');
    assert.equal(where.startedAt.lt.toISOString(), cutoff.toISOString());
    const expired = batches.filter(batch => batch.startedAt < where.startedAt.lt);
    batches = batches.filter(batch => batch.startedAt >= where.startedAt.lt);
    return { count: expired.length };
  });
  const result = await cleanupCronHistory(now);
  assert.equal(calls, 1);
  assert.deepEqual(batches.map(batch => batch.id), [2, 3, 4]);
  assert.equal(result.deletedBatchRuns, 1);
  assert.equal(result.retentionDays, 7);
  assert.equal(result.cutoff, cutoff.toISOString());
  assert.equal(result.successCount, 1);
  assert.equal(result.errorCount, 0);
  assert.equal(result.logs[0].level, 'success');
});

test('cleanup is repeatable and reports zero when there is no expired history', async () => {
  const { cleanupCronHistory } = setup(async () => ({ count: 0 }));
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await cleanupCronHistory(now);
    assert.equal(result.deletedBatchRuns, 0);
    assert.equal(result.processedCount, 0);
    assert.equal(result.errorCount, 0);
  }
});

test('database failures propagate so the orchestrator records a failed job', async () => {
  const { cleanupCronHistory } = setup(async () => { throw new Error('Database unavailable'); });
  await assert.rejects(cleanupCronHistory(now), /Database unavailable/);
});

test('invalid cleanup dates cannot issue a delete', async () => {
  const { cleanupCronHistory } = setup(async () => { assert.fail('Must not delete'); });
  await assert.rejects(cleanupCronHistory(new Date(NaN)), /Invalid cleanup date/);
});

test('retention is exactly seven elapsed days across timezone and DST boundaries', async () => {
  const { cleanupCronHistory } = setup(async ({ where }) => {
    assert.equal(where.startedAt.lt.toISOString(), '2026-10-26T14:00:00.000Z');
    return { count: 0 };
  });
  await cleanupCronHistory(new Date('2026-11-02T09:00:00-05:00'));
});

test('cleanup is registered, included in the daily bundle and reports deletion counters', async () => {
  let calls = 0;
  const registryModule = load('cron-registry.ts', {
    '@repo/db/client': { default: {} },
    './cleanup-cron-history': {
      async cleanupCronHistory() {
        calls++;
        return { deletedBatchRuns: 3, eligibleCount: 3, processedCount: 3, successCount: 3, skippedCount: 0, errorCount: 0 };
      },
    },
  });
  assert.ok(registryModule.DAILY_CRON_JOB_SLUGS.includes('cron_history_cleanup'));
  assert.ok(registryModule.getAllCronJobSlugs().includes('cron_history_cleanup'));
  const job = registryModule.getCronRegistry().cron_history_cleanup;
  const result = job.normalizeResult(await job.run());
  assert.equal(calls, 1);
  assert.equal(result.counters.processedCount, 3);
  assert.equal(result.counters.successCount, 3);
  assert.equal(result.counters.errorCount, 0);
  assert.equal(result.errorMessage, undefined);
});
