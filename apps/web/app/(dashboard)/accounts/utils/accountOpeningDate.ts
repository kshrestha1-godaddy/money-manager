/** Local calendar YYYY-MM-DD (matches activity date filters; avoids UTC day shift). */
export function accountOpeningDay(value: Date | string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatAccountOpeningDate(value: Date | string): string {
    const day = accountOpeningDay(value);
    if (!day) return "—";
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year!, (month ?? 1) - 1, date ?? 1).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
