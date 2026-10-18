"use client";

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, ChevronDown, Target } from 'lucide-react';
import { getBudgetRangeSummary, type BudgetRangeCategory } from '../../../actions/budget-targets';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { formatCurrency } from '../../../utils/currency';

type Preset = '1' | '3' | '6' | '12' | 'all' | 'custom' | `year-${number}`;
const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function CategoryBudgetSummary({ month, year, period, refreshKey }: {
  month: number; year: number; period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; refreshKey: unknown;
}) {
  const { currency } = useCurrency();
  const [preset, setPreset] = useState<Preset>('6');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [customStart, setCustomStart] = useState(dateInput(new Date(year, month, 1)));
  const [customEnd, setCustomEnd] = useState(dateInput(new Date(year, month + 1, 0)));
  const [customRange, setCustomRange] = useState({ start: customStart, end: customEnd });
  const [data, setData] = useState<BudgetRangeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const range = useMemo(() => {
    if (preset === 'custom') return customRange;
    if (preset === 'all') return { start: 'all', end: dateInput(new Date(year, month + 1, 0)) };
    if (preset.startsWith('year-')) {
      const selectedYear = Number(preset.slice(5));
      return { start: dateInput(new Date(selectedYear, 0, 1)), end: dateInput(new Date(selectedYear, 12, 0)) };
    }
    return { start: dateInput(new Date(year, month - Number(preset) + 1, 1)), end: dateInput(new Date(year, month + 1, 0)) };
  }, [preset, customRange, month, year]);

  useEffect(() => {
    if (preset !== 'custom') {
      setCustomStart(range.start === 'all' ? '' : range.start);
      setCustomEnd(range.end);
    }
  }, [preset, range]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getBudgetRangeSummary(range.start, range.end, period).then(result => {
      if (cancelled) return;
      setData(result.data || []);
      setError(result.error || '');
    }).catch(() => {
      if (!cancelled) setError('Unable to load the budget summary. Please try again.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, period, refreshKey, retry, currency]);

  const rows = data.filter(row => row.categoryType === type).sort((a, b) => {
    const score = (row: BudgetRangeCategory) => row.target > 0 ? row.actual / row.target : row.actual > 0 ? Infinity : -1;
    return score(b) - score(a) || a.categoryName.localeCompare(b.categoryName);
  });
  const budgeted = rows.filter(row => row.target > 0);
  const healthy = budgeted.filter(row => type === 'EXPENSE' ? row.actual <= row.target : row.actual >= row.target).length;
  const actual = rows.reduce((sum, row) => sum + row.actual, 0);
  const target = rows.reduce((sum, row) => sum + row.target, 0);
  const scale = Math.max(125, ...budgeted.map(row => row.actual / row.target * 100));
  const invalidCustom = !!customStart && !!customEnd && customStart > customEnd;
  const selectCustomDate = (field: 'start' | 'end', value: string) => {
    const start = field === 'start' ? value : customStart;
    const end = field === 'end' ? value : customEnd;
    setCustomStart(start);
    setCustomEnd(end);
    if (start && end && start <= end) {
      setCustomRange({ start, end });
      setPreset('custom');
    }
  };
  const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);
  const presetButton = (value: Preset, label: string) => <button key={value} type="button" aria-pressed={preset === value} onClick={() => setPreset(value)} className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${preset === value ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}>{label}</button>;
  const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const money = (value: number) => formatCurrency(value, currency);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby="budget-pulse-title">
      <div className="border-b border-gray-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600"><Target className="h-4 w-4" /> The bigger picture</div>
            <h2 id="budget-pulse-title" className="text-xl font-bold text-gray-900">Category budget pulse</h2>
            <p className="mt-1 text-sm text-gray-600">See where you have room, and where your budget needs attention.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 p-3" aria-label="Summary time period">
          {([['1', 'Last Month'], ['3', 'Last 3 Months'], ['6', 'Last 6 Months'], ['12', 'Last 12 Months'], ['all', 'All Time']] as const).map(([value, label]) => presetButton(value, label))}
          <span aria-hidden="true" className="mx-1 h-5 border-l border-gray-300" />
          {years.map(value => presetButton(`year-${value}`, String(value)))}
          <span aria-hidden="true" className="mx-1 h-5 border-l border-gray-300" />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Custom date range">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">From:<input type="date" value={customStart} max={customEnd || undefined} onChange={event => selectCustomDate('start', event.target.value)} className="min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900" /></label>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">to<input type="date" value={customEnd} min={customStart || undefined} onChange={event => selectCustomDate('end', event.target.value)} className="min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900" /></label>
          </div>
          {invalidCustom && <p role="alert" className="w-full text-xs text-red-600">Choose an end date on or after the start date.</p>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-gray-500"><CalendarDays className="h-4 w-4" />{range.start === 'all' ? 'All time' : dateLabel(range.start)} – {dateLabel(range.end)}</p>
          <div className="flex gap-1" aria-label="Category type">{(['EXPENSE', 'INCOME'] as const).map(value => <button type="button" key={value} aria-pressed={type === value} onClick={() => setType(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${type === value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{value === 'EXPENSE' ? 'Expenses' : 'Income'}</button>)}</div>
        </div>
      </div>
      <div className="p-5 sm:p-6" aria-busy={loading}>
        {loading ? <div role="status" className="animate-pulse space-y-5 py-6"><p className="text-sm text-gray-500">Loading category budgets…</p>{[1, 2, 3].map(key => <div key={key} className="h-9 rounded-lg bg-gray-100" />)}</div>
          : error ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-3 font-semibold underline">Retry</button></div>
          : rows.length === 0 ? <p className="py-12 text-center text-sm text-gray-500">No {type === 'EXPENSE' ? 'expense' : 'income'} categories included in budget tracking. Add a category to see its budget pulse.</p>
          : <>
            <div className="mb-7 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
              <div><p className="text-xs font-medium text-gray-500">{type === 'EXPENSE' ? 'Within budget' : 'Target reached'}</p><p className="mt-1 text-2xl font-bold text-gray-900">{healthy}<span className="text-sm font-normal text-gray-500"> / {budgeted.length} categories</span></p></div>
              <div><p className="text-xs font-medium text-gray-500">{type === 'EXPENSE' ? 'Total spent' : 'Total earned'}</p><p className="mt-1 text-xl font-bold text-gray-900">{money(actual)}</p></div>
              <div><p className="text-xs font-medium text-gray-500">Period budget target</p><p className="mt-1 text-xl font-bold text-indigo-600">{money(target)}</p></div>
            </div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500"><span>Category progress · % of target</span><span className="flex items-center gap-2"><span className="h-3 border-l-2 border-dashed border-gray-500" />100% budget marker · shared scale</span></div>
            <div className="space-y-6">
              {rows.map(row => {
                const monthlyScale = Math.max(100, ...row.months.map(item => item.target > 0 ? item.actual / item.target * 100 : 0));
                const percent = row.target > 0 ? row.actual / row.target * 100 : 0;
                const good = type === 'EXPENSE' ? row.actual <= row.target : row.actual >= row.target;
                const near = type === 'EXPENSE' && percent >= 90 && percent <= 100;
                const color = row.target <= 0 ? 'bg-slate-400' : near ? 'bg-amber-400' : good ? 'bg-emerald-500' : 'bg-rose-500';
                const status = row.target <= 0 ? 'No target' : type === 'EXPENSE' ? percent > 100 ? 'Over budget' : near ? 'Near limit' : 'Within budget' : good ? 'Target reached' : 'Below target';
                return <details key={row.categoryId} className="group rounded-xl border border-gray-100 p-3 open:bg-slate-50">
                  <summary className="list-none cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-gray-800"><ChevronDown className="mr-2 inline h-4 w-4 transition-transform group-open:rotate-180" />{row.categoryName}</span><span className="text-xs text-gray-500">{money(row.actual)} <span className="text-gray-400">/ {money(row.target)}</span></span></div>
                  <div className="relative h-5 rounded-md bg-slate-100" role="img" aria-label={`${row.categoryName}: ${money(row.actual)} of ${money(row.target)}. ${status}${row.target > 0 ? `, ${percent.toFixed(1)} percent` : ''}`}>
                    <div className={`h-full rounded-md ${color} transition-all duration-500 motion-reduce:transition-none`} style={{ width: `${row.target > 0 ? Math.min(100, Math.max(0, percent / scale * 100)) : 0}%` }} />
                    <span className="absolute -bottom-1 -top-1 border-l-2 border-dashed border-slate-500" style={{ left: `${100 / scale * 100}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs"><span className={`flex items-center gap-1 ${row.target <= 0 ? 'text-gray-500' : near ? 'text-amber-700' : good ? 'text-emerald-700' : 'text-rose-600'}`}>{row.target > 0 && !good && <ArrowUpRight className="h-3 w-3" />}{status}{row.target > 0 && ` · ${percent.toFixed(1)}%`}</span><span className="text-gray-500">{row.target > 0 ? `${money(Math.abs(row.target - row.actual))} ${type === 'EXPENSE' ? row.actual > row.target ? 'over budget' : 'remaining' : row.actual >= row.target ? 'above target' : 'to target'}` : 'Set a target to compare'}</span></div>
                  </summary>
                  <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Monthly utilization</p>
                    {row.months.map(point => {
                      const utilization = point.target > 0 ? point.actual / point.target * 100 : null;
                      const isHealthy = type === 'EXPENSE' ? point.actual <= point.target : point.actual >= point.target;
                      const label = new Date(`${point.month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                      return <div key={point.month} className="grid items-center gap-2 sm:grid-cols-[6rem_1fr_12rem]">
                        <span className="text-xs font-medium text-gray-700">{label}</span>
                        <div className="relative h-3 rounded bg-gray-200" role="img" aria-label={`${label}: ${money(point.actual)} of ${money(point.target)}, ${utilization === null ? 'no target' : `${utilization.toFixed(1)}% utilized`}`}>
                          <div className={`h-full rounded ${utilization === null ? 'bg-slate-400' : isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${utilization === null ? 0 : Math.max(0, utilization) / monthlyScale * 100}%` }} />
                          <span className="absolute -bottom-1 -top-1 border-l border-dashed border-gray-500" style={{ left: `${100 / monthlyScale * 100}%` }} />
                        </div>
                        <div className="text-xs sm:text-right"><span className="font-semibold text-gray-800">{utilization === null ? 'No target' : `${utilization.toFixed(1)}%`}</span><span className="mt-0.5 block text-gray-500">{money(point.actual)} / {money(point.target)}</span></div>
                      </div>;
                    })}
                    <p className="text-xs text-gray-500">Actual / budget target. Partial months use prorated targets.</p>
                  </div>
                </details>;
              })}
            </div>
          </>}
        <p className="mt-7 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">Uses your current {period.toLowerCase()} targets and account timezone. Targets are prorated by calendar days for partial months; historical target changes are not stored. Categories hidden from budget tracking are excluded. Future dates show the planned budget against transactions recorded so far.</p>
      </div>
    </section>
  );
}
