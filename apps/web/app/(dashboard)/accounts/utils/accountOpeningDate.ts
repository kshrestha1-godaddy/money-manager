export function accountOpeningDay(value: Date | string): string {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

export function formatAccountOpeningDate(value: Date | string): string {
    const day = accountOpeningDay(value);
    return day
        ? new Date(day).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
        : "—";
}
