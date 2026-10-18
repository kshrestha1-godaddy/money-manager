const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relative, dependencies) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../app', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, console, Date,
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function setup({ failNext = false, loseClaim = false, accountId = 2, scheduledAt = new Date('2026-01-01'), recurringFrequency = 'MONTHLY', timezone = 'UTC', categoryOwned = true, accountOwned = true } = {}) {
  let state = { writes: 0, createdPayment: null, resolution: null, expenses: [], balance: 1000, next: 0, nextDates: [], editedPayment: { description: "Imported rent details", tags: ["housing", "imported"] } };
  let queue = Promise.resolve();
  const enums = { ScheduledPaymentResolution: { ACCEPTED: 'ACCEPTED', REJECTED: 'REJECTED' }, ActivityAction: { CREATE: 'CREATE' }, ActivityCategory: { TRANSACTION: 'TRANSACTION' }, ActivityEntityType: { EXPENSE: 'EXPENSE' } };
  const { createExpenseInTransaction } = load('utils/createExpenseInTransaction.ts', {
    '@prisma/client': enums,
    './currencyDisplayServer': { convertForDisplayWithDbRates: async amount => amount },
    './accountActivityLog': { logAccountBalanceFromTransaction: async () => {} },
  });
  const prisma = {
    scheduledPayment: {
      create: async ({ data }) => {
        state.writes++;
        state.createdPayment = data;
        return { id: 1, resolution: null, account: null, category: { id: 3 }, createdAt: new Date(), updatedAt: new Date(), ...data };
      },
      findFirst: async () => ({ id: 1, userId: 1, resolution: null, ...state.editedPayment }),
      update: async ({ data }) => {
        state.writes++;
        state.editedPayment = { ...state.editedPayment, ...data };
        return { id: 1, userId: 1, resolution: null, account: null, category: { id: 3 }, createdAt: new Date(), updatedAt: new Date(), ...state.editedPayment };
      },
    },
    category: { findFirst: async () => categoryOwned ? { id: 3 } : null },
    account: { findFirst: async () => accountOwned ? { id: 2 } : null },
    // Model transaction isolation and rollback without a live database.
    $transaction(work) {
      const result = queue.then(async () => {
        const draft = structuredClone(state);
        const tx = {
          scheduledPayment: {
            findFirst: async () => ({ id: 1, userId: 1, title: 'Rent', amount: 100, currency: 'USD', scheduledAt, categoryId: 3, category: { id: 3 }, accountId, tags: [], notes: null, description: null, isRecurring: true, recurringFrequency, resolution: draft.resolution }),
            updateMany: async ({ data }) => {
              if (loseClaim || draft.resolution !== null) return { count: 0 };
              draft.resolution = data.resolution;
              return { count: 1 };
            },
            update: async () => {},
            create: async ({ data }) => {
              if (failNext) throw new Error('Next occurrence failed');
              draft.next++;
              draft.nextDates.push(data.scheduledAt);
            },
          },
          user: { findUnique: async () => ({ currency: 'USD', timezone }) },
          expense: { create: async ({ data }) => {
            draft.expenses.push(data);
            return { id: 5, account: accountId ? { bankName: 'Bank', holderName: 'User' } : null };
          } },
          account: { update: async ({ data }) => { draft.balance -= data.balance.decrement; } },
        };
        const value = await work(tx);
        state = draft;
        return value;
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  const actions = load('(dashboard)/scheduled-payments/actions/scheduled-payments.ts', {
    'next/cache': { revalidatePath() {} },
    'next-auth': { getServerSession: async () => ({ user: { id: '1' } }) },
    '@repo/db/client': { default: prisma },
    '@prisma/client': enums,
    '../../../utils/currency': { SUPPORTED_CURRENCIES: ['USD', 'INR', 'NPR'] },
    '../../../utils/scheduledPaymentTime': load('utils/scheduledPaymentTime.ts', {}),
    '../../../lib/auth': { authOptions: {} },
    '../../../utils/auth': { getUserIdFromSession: () => 1 },
    '../../../utils/createExpenseInTransaction': { createExpenseInTransaction },
    '../../../utils/autoBookmarkUtils': { autoBookmarkHighValueTransaction: async () => {} },
    '../../../lib/security/app-lock-password': {},
    '../../../actions/notifications': { generateNotificationsForUser: async () => {} },
  });
  return { ...actions, state: () => state };
}

test('concurrent accepts create one expense, one deduction and one next occurrence', async () => {
  const app = setup();
  const results = await Promise.allSettled([app.acceptScheduledPayment(1), app.acceptScheduledPayment(1)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(app.state().expenses.length, 1);
  assert.equal(app.state().balance, 900);
  assert.equal(app.state().next, 1);
});

test('a lost conditional claim cannot create an expense or recurrence', async () => {
  const app = setup({ loseClaim: true });
  await assert.rejects(app.acceptScheduledPayment(1), /already resolved/);
  assert.equal(app.state().expenses.length, 0);
  assert.equal(app.state().balance, 1000);
  assert.equal(app.state().next, 0);
});

for (const action of ['acceptScheduledPayment', 'rejectScheduledPayment']) {
  test(`${action} rolls back resolution and financial changes if recurrence creation fails`, async () => {
    const app = setup({ failNext: true });
    await assert.rejects(app[action](1), /Next occurrence failed/);
    assert.equal(app.state().resolution, null);
    assert.equal(app.state().expenses.length, 0);
    assert.equal(app.state().balance, 1000);
    assert.equal(app.state().next, 0);
  });
}

test('accept and reject racing resolve the occurrence only once', async () => {
  const app = setup();
  const results = await Promise.allSettled([app.rejectScheduledPayment(1), app.acceptScheduledPayment(1)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(app.state().resolution, 'REJECTED');
  assert.equal(app.state().expenses.length, 0);
  assert.equal(app.state().balance, 1000);
  assert.equal(app.state().next, 1);
});

test('cash acceptance creates an expense without changing a bank balance', async () => {
  const app = setup({ accountId: null });
  await app.acceptScheduledPayment(1);
  assert.equal(app.state().resolution, 'ACCEPTED');
  assert.equal(app.state().expenses.length, 1);
  assert.equal(app.state().balance, 1000);
  assert.equal(app.state().next, 1);
});

const recurrenceCases = [
  ['January 31 in a common year', '2025-01-31', 'MONTHLY', '2025-02-28'],
  ['January 31 in a leap year', '2024-01-31', 'MONTHLY', '2024-02-29'],
  ['January 30', '2025-01-30', 'MONTHLY', '2025-02-28'],
  ['March 31', '2025-03-31', 'MONTHLY', '2025-04-30'],
  ['ordinary monthly date', '2025-04-15', 'MONTHLY', '2025-05-15'],
  ['December rollover', '2024-12-31', 'MONTHLY', '2025-01-31'],
  ['February 29 yearly', '2024-02-29', 'YEARLY', '2025-02-28'],
  ['ordinary yearly date', '2024-06-15', 'YEARLY', '2025-06-15'],
  ['daily year rollover', '2024-12-31', 'DAILY', '2025-01-01'],
  ['weekly month rollover', '2025-01-28', 'WEEKLY', '2025-02-04'],
];

for (const action of ['acceptScheduledPayment', 'rejectScheduledPayment']) {
  for (const [label, from, frequency, expected] of recurrenceCases) {
    test(`${action}: ${label} stays in the correct period and preserves time`, async () => {
      // UTC is the saved user timezone for these calendar boundary cases.
      const scheduledAt = new Date(`${from}T09:35:21.123Z`);
      const originalTime = scheduledAt.getTime();
      const app = setup({ scheduledAt, recurringFrequency: frequency });
      await app[action](1);
      assert.equal(app.state().nextDates.length, 1);
      assert.equal(app.state().nextDates[0].getTime(), new Date(`${expected}T09:35:21.123Z`).getTime());
      assert.equal(scheduledAt.getTime(), originalTime);
    });
  }
}

for (const action of ['acceptScheduledPayment', 'rejectScheduledPayment']) {
  for (const [frequency, from, expected] of [
    ['DAILY', '2025-03-08T14:00:00.123Z', '2025-03-09T13:00:00.123Z'],
    ['WEEKLY', '2025-03-02T14:00:00.123Z', '2025-03-09T13:00:00.123Z'],
    ['MONTHLY', '2025-02-09T14:00:00.123Z', '2025-03-09T13:00:00.123Z'],
    ['YEARLY', '2024-03-09T14:00:00.123Z', '2025-03-09T13:00:00.123Z'],
    ['DAILY', '2025-11-01T13:00:00.123Z', '2025-11-02T14:00:00.123Z'],
  ]) {
    test(`${action}: ${frequency} preserves New York wall-clock time across DST from ${from}`, async () => {
      const app = setup({ scheduledAt: new Date(from), recurringFrequency: frequency, timezone: 'America/New_York' });
      await app[action](1);
      assert.equal(app.state().nextDates[0].toISOString(), expected);
    });
  }
}

const time = load('utils/scheduledPaymentTime.ts', {});

test('Nepal scheduling and editing round-trip in the saved timezone', () => {
  const instant = time.parseDatetimeLocalInTimezone('2025-01-31T09:00', 'Asia/Kathmandu');
  assert.equal(instant.toISOString(), '2025-01-31T03:15:00.000Z');
  assert.equal(time.toDatetimeLocalValue(instant, 'Asia/Kathmandu'), '2025-01-31T09:00');
});

test('midnight is formatted as 00, without changing its date', () => {
  const instant = time.parseDatetimeLocalInTimezone('2025-01-31T00:00', 'Asia/Kathmandu');
  assert.equal(instant.toISOString(), '2025-01-30T18:15:00.000Z');
  assert.equal(time.toDatetimeLocalValue(instant, 'Asia/Kathmandu'), '2025-01-31T00:00');
});

test('invalid dates and nonexistent DST times are rejected', () => {
  for (const value of ['2025-02-30T09:00', '2025-13-01T09:00', '2025-01-01T24:00', '2025-03-09T02:30']) {
    assert.equal(time.parseDatetimeLocalInTimezone(value, 'America/New_York'), null);
  }
});

test('recurrence advances a skipped DST time by the clock-change gap', () => {
  assert.equal(time.computeNextScheduledAt(new Date('2025-03-08T07:30:00.123Z'), 'DAILY', 'America/New_York').toISOString(), '2025-03-09T07:30:00.123Z');
});

test('a repeated DST time chooses the earlier occurrence deterministically', () => {
  assert.equal(time.parseDatetimeLocalInTimezone('2025-11-02T01:30', 'America/New_York').toISOString(), '2025-11-02T05:30:00.000Z');
});

test('monthly recurrence clamps according to the saved timezone calendar', () => {
  // January 31 in Kathmandu is still January 30 in UTC.
  assert.equal(time.computeNextScheduledAt(new Date('2025-01-30T18:30:00.123Z'), 'MONTHLY', 'Asia/Kathmandu').toISOString(), '2025-02-27T18:30:00.123Z');
});

const editPayload = {
  id: 1, title: 'Updated rent', amount: 150, currency: 'USD',
  scheduledAt: new Date('2026-01-31T09:00:00Z'), categoryId: 3, accountId: null,
};

test('editing other payment fields preserves omitted description and tags', async () => {
  const app = setup();
  const result = await app.updateScheduledPayment(editPayload);
  assert.equal(result.title, 'Updated rent');
  assert.equal(result.amount, 150);
  assert.equal(result.description, 'Imported rent details');
  assert.deepEqual(result.tags, ['housing', 'imported']);
});

test('explicit undefined description and tags also preserve saved metadata', async () => {
  const app = setup();
  const result = await app.updateScheduledPayment({ ...editPayload, description: undefined, tags: undefined });
  assert.equal(result.description, 'Imported rent details');
  assert.deepEqual(result.tags, ['housing', 'imported']);
});

test('explicit description and tags replace the saved metadata', async () => {
  const app = setup();
  const result = await app.updateScheduledPayment({ ...editPayload, description: '  New details  ', tags: ['updated'] });
  assert.equal(result.description, 'New details');
  assert.deepEqual(result.tags, ['updated']);
});

test('explicit empty description and tags clear the saved metadata', async () => {
  const app = setup();
  const result = await app.updateScheduledPayment({ ...editPayload, description: '  ', tags: [] });
  assert.equal(result.description, null);
  assert.deepEqual(result.tags, []);
});

const invalidPayments = [
  ['blank title', { title: '   ' }, /Title is required/],
  ['non-string title', { title: 123 }, /Title is required/],
  ['zero amount', { amount: 0 }, /positive finite/],
  ['negative amount', { amount: -10 }, /positive finite/],
  ['NaN amount', { amount: NaN }, /positive finite/],
  ['infinite amount', { amount: Infinity }, /positive finite/],
  ['negative infinite amount', { amount: -Infinity }, /positive finite/],
  ['string amount', { amount: '100' }, /positive finite/],
  ['unsupported currency', { currency: 'EUR' }, /Unsupported currency/],
  ['missing currency', { currency: undefined }, /Unsupported currency/],
  ['invalid date', { scheduledAt: new Date(NaN) }, /Invalid scheduled date/],
  ['string date', { scheduledAt: '2026-01-01' }, /Invalid scheduled date/],
  ['missing date', { scheduledAt: undefined }, /Invalid scheduled date/],
  ['zero category', { categoryId: 0 }, /Invalid expense category/],
  ['fractional category', { categoryId: 1.5 }, /Invalid expense category/],
  ['string category', { categoryId: '3' }, /Invalid expense category/],
  ['unsafe category', { categoryId: Number.MAX_SAFE_INTEGER + 1 }, /Invalid expense category/],
  ['zero account', { accountId: 0 }, /Invalid account/],
  ['negative account', { accountId: -1 }, /Invalid account/],
  ['fractional account', { accountId: 1.5 }, /Invalid account/],
  ['string account', { accountId: '2' }, /Invalid account/],
  ['missing recurring frequency', { isRecurring: true }, /valid recurring frequency/],
  ['unknown recurring frequency', { isRecurring: true, recurringFrequency: 'HOURLY' }, /valid recurring frequency/],
  ['invalid unused frequency', { isRecurring: false, recurringFrequency: 'HOURLY' }, /valid recurring frequency/],
  ['non-boolean recurrence', { isRecurring: 'false' }, /Invalid recurring setting/],
  ['non-string description', { description: 123 }, /Invalid description/],
  ['non-string notes', { notes: {} }, /Invalid notes/],
  ['non-array tags', { tags: 'rent' }, /list of strings/],
  ['non-string tag', { tags: ['rent', 123] }, /list of strings/],
];

for (const action of ['createScheduledPayment', 'updateScheduledPayment']) {
  for (const [label, patch, error] of invalidPayments) {
    test(`${action} rejects ${label} without writing`, async () => {
      const app = setup();
      await assert.rejects(app[action]({ ...editPayload, ...patch }), error);
      assert.equal(app.state().writes, 0);
    });
  }
  test(`${action} rejects a null payload without writing`, async () => {
    const app = setup();
    await assert.rejects(app[action](null), /Invalid scheduled payment/);
    assert.equal(app.state().writes, 0);
  });
  for (const currency of ['USD', 'INR', 'NPR']) {
    test(`${action} accepts valid ${currency} cash payments`, async () => {
      const app = setup();
      const result = await app[action]({ ...editPayload, title: '  Rent  ', currency });
      assert.equal(result.currency, currency);
      assert.equal(result.title, 'Rent');
      assert.equal(result.isRecurring, false);
      assert.equal(result.recurringFrequency, null);
      assert.equal(app.state().writes, 1);
    });
  }
  for (const recurringFrequency of ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']) {
    test(`${action} accepts ${recurringFrequency} payments from a valid account`, async () => {
      const app = setup();
      const result = await app[action]({ ...editPayload, accountId: 2, isRecurring: true, recurringFrequency });
      assert.equal(result.accountId, 2);
      assert.equal(result.isRecurring, true);
      assert.equal(result.recurringFrequency, recurringFrequency);
    });
  }
  test(`${action} still rejects a category not owned by the user`, async () => {
    const app = setup({ categoryOwned: false });
    await assert.rejects(app[action](editPayload), /Invalid expense category/);
    assert.equal(app.state().writes, 0);
  });
  test(`${action} still rejects an account not owned by the user`, async () => {
    const app = setup({ accountOwned: false });
    await assert.rejects(app[action]({ ...editPayload, accountId: 2 }), /Invalid account/);
    assert.equal(app.state().writes, 0);
  });
}

for (const id of [0, -1, 1.5, '1', undefined]) {
  test(`update rejects invalid payment ID ${id} without writing`, async () => {
    const app = setup();
    await assert.rejects(app.updateScheduledPayment({ ...editPayload, id }), /Invalid scheduled payment ID/);
    assert.equal(app.state().writes, 0);
  });
}
