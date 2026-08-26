import { toSaoPauloCivilDate, occurrenceDateInMonth, type CivilDate } from "@/lib/domain/billing-cycle";

export function currentMonth(now = new Date()): string {
    return toSaoPauloCivilDate(now).slice(0, 7);
}

export function monthStart(month: string): CivilDate {
    return `${month}-01` as CivilDate;
}

export function nextMonthStart(month: string): CivilDate {
    return `${shiftCalendarMonth(month, 1)}-01` as CivilDate;
}

export function shiftCalendarMonth(month: string, delta: number): string {
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    const absolute = year * 12 + monthNumber - 1 + delta;
    const nextYear = Math.floor(absolute / 12);
    const nextMonth = (absolute % 12) + 1;

    return `${nextYear.toString().padStart(4, "0")}-${nextMonth.toString().padStart(2, "0")}`;
}

export function monthEnd(month: string): CivilDate {
    const [yearText, monthText] = month.split("-");
    return occurrenceDateInMonth(Number(yearText), Number(monthText), 31);
}

export function currentCompetenceStart(now = new Date()): CivilDate {
    return monthStart(currentMonth(now));
}

export function dueDateForMonth(month: string, dueDay: number): CivilDate {
    return `${month}-${dueDay.toString().padStart(2, "0")}` as CivilDate;
}
