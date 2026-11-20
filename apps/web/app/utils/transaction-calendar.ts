export function createTransactionDayFormatter(timeZone: string) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        calendar: "gregory",
        numberingSystem: "latn",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return (value: Date | string) => {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return "";
        const parts = formatter.formatToParts(date);
        const year = parts.find(({ type }) => type === "year")?.value;
        const month = parts.find(({ type }) => type === "month")?.value;
        const day = parts.find(({ type }) => type === "day")?.value;
        return `${year}-${month}-${day}`;
    };
}

export function getVisibleSelection<T extends { id: number }>(
    items: T[],
    selected: ReadonlySet<number>,
) {
    return new Set(items.filter(({ id }) => selected.has(id)).map(({ id }) => id));
}

export function getTrailingMonthRange(today: string, months: number) {
    const current = new Date(today);
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth() - months;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const start = new Date(Date.UTC(year, month, Math.min(current.getUTCDate(), lastDay)));

    return { start: start.toISOString().slice(0, 10), end: today };
}
