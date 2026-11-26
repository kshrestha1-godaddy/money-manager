export function getTransactionPeriodTotals<T extends { date: Date | string }>(
    items: T[],
    getDay: (date: Date | string) => string,
    getAmount: (item: T) => number,
    year: number,
    month: number,
    shouldCount: (item: T) => boolean = () => true,
) {
    const currentMonthIndex = year * 12 + month;
    const currentQuarterIndex = Math.floor(currentMonthIndex / 3);
    const totals = {
        currentMonth: { amount: 0, count: 0 },
        previousMonth: { amount: 0, count: 0 },
        currentQuarter: { amount: 0, count: 0 },
        previousQuarter: { amount: 0, count: 0 },
        allTime: { amount: 0, count: 0 },
    };

    for (const item of items) {
        const amount = getAmount(item);
        const counts = shouldCount(item);
        totals.allTime.amount += amount;
        if (counts) totals.allTime.count += 1;

        const day = getDay(item.date);
        if (!day) continue;

        const monthIndex = Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
        const quarterIndex = Math.floor(monthIndex / 3);
        const monthTotal = monthIndex === currentMonthIndex ? totals.currentMonth
            : monthIndex === currentMonthIndex - 1 ? totals.previousMonth : null;
        const quarterTotal = quarterIndex === currentQuarterIndex ? totals.currentQuarter
            : quarterIndex === currentQuarterIndex - 1 ? totals.previousQuarter : null;

        for (const period of [monthTotal, quarterTotal]) {
            if (!period) continue;
            period.amount += amount;
            if (counts) period.count += 1;
        }
    }

    return totals;
}
