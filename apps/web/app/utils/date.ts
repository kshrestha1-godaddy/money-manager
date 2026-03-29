export function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', options);
}

/** e.g. "2026 March 3" — year, full month name, day (no leading zero). */
export function formatDateYearMonthDay(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = d.getDate();
    return `${year} ${month} ${day}`;
}