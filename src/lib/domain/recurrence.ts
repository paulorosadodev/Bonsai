import type { PaymentMethod } from "./catalog";
import { addMonths, civilMonth, createBillingEntries, occurrenceDateInMonth, parseCivilDate, startOfCivilDate, type BillingEntry, type CivilDate } from "./billing-cycle";

type CycleSettings = {
    closingDay: number;
    dueDay: number;
};

export type RecurringSeriesRecord = {
    id: string;
    startsOn: CivilDate;
    endsBefore: CivilDate | null;
};

export type RecurringVersionRecord = {
    seriesId: string;
    effectiveFrom: CivilDate;
    monthlyDay: number;
    name: string;
    description: string | null;
    amountCents: number;
    paymentMethod: PaymentMethod;
    categoryId: string;
    generalTagIds: string[];
    specificTagId: string | null;
};

export type SettingsHistoryRecord = {
    effectiveFrom: string;
    closingDay: number;
    dueDay: number;
};

export type RecurringOccurrence = {
    seriesId: string;
    occurrenceDate: CivilDate;
    monthlyDay: number;
    name: string;
    description: string | null;
    amountCents: number;
    paymentMethod: PaymentMethod;
    categoryId: string;
    generalTagIds: string[];
    specificTagId: string | null;
    isForecast: boolean;
    entry: BillingEntry;
};

export function isEligibleForRecurrence(paymentMethod: PaymentMethod, installmentCount: number) {
    return installmentCount === 1 && (paymentMethod === "pix" || paymentMethod === "credit");
}

export function occurrenceKey(seriesId: string, occurrenceDate: CivilDate) {
    return `recurrence:${seriesId}:${occurrenceDate}`;
}

export function occurrenceEditHref(seriesId: string, occurrenceDate: CivilDate) {
    return `/transactions/recurring/${seriesId}/${occurrenceDate}/edit`;
}

export function versionAt(versions: RecurringVersionRecord[], month: string): RecurringVersionRecord | null {
    let selected: RecurringVersionRecord | null = null;

    for (const version of versions) {
        if (civilMonth(version.effectiveFrom) > month) {
            continue;
        }

        if (!selected || version.effectiveFrom > selected.effectiveFrom) {
            selected = version;
        }
    }

    return selected;
}

export function settingsAt(history: SettingsHistoryRecord[], occurrenceDate: CivilDate, fallback: CycleSettings): CycleSettings {
    const asOf = startOfCivilDate(occurrenceDate).getTime();
    let selected: SettingsHistoryRecord | null = null;

    for (const version of history) {
        const effective = new Date(version.effectiveFrom).getTime();

        if (Number.isNaN(effective) || effective > asOf) {
            continue;
        }

        if (!selected || effective > new Date(selected.effectiveFrom).getTime()) {
            selected = version;
        }
    }

    if (!selected) {
        return fallback;
    }

    return { closingDay: selected.closingDay, dueDay: selected.dueDay };
}

export function nextEditableEffectiveFrom(today: CivilDate, oldMonthlyDay: number, newMonthlyDay: number): CivilDate {
    const todayParts = parseCivilDate(today);
    const oldThisMonth = occurrenceDateInMonth(todayParts.year, todayParts.month, oldMonthlyDay);
    const newThisMonth = occurrenceDateInMonth(todayParts.year, todayParts.month, newMonthlyDay);

    if (oldThisMonth > today && newThisMonth > today) {
        return newThisMonth;
    }

    let year = todayParts.year;
    let month = todayParts.month;

    for (let offset = 0; offset < 14; offset += 1) {
        const candidate = occurrenceDateInMonth(year, month, newMonthlyDay);

        if (candidate > today) {
            return candidate;
        }

        const next = addMonths(year, month, 1);
        year = next.year;
        month = next.month;
    }

    throw new Error("Não foi possível calcular a próxima ocorrência");
}

export function nextUnrealizedOccurrence(today: CivilDate, monthlyDay: number, from: CivilDate = today): CivilDate {
    const fromParts = parseCivilDate(from);
    let year = fromParts.year;
    let month = fromParts.month;

    for (let offset = 0; offset < 14; offset += 1) {
        const candidate = occurrenceDateInMonth(year, month, monthlyDay);

        if (candidate > today && candidate >= from) {
            return candidate;
        }

        const next = addMonths(year, month, 1);
        year = next.year;
        month = next.month;
    }

    throw new Error("Não foi possível calcular a próxima ocorrência");
}

export function projectSeriesOccurrences(
    series: RecurringSeriesRecord,
    versions: RecurringVersionRecord[],
    history: SettingsHistoryRecord[],
    from: CivilDate,
    to: CivilDate,
    today: CivilDate,
    fallbackSettings: CycleSettings
): RecurringOccurrence[] {
    const seriesVersions = versions.filter((version) => version.seriesId === series.id).toSorted((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

    if (seriesVersions.length === 0 || series.startsOn > to || (series.endsBefore !== null && series.endsBefore <= from)) {
        return [];
    }

    const start = parseCivilDate(from < series.startsOn ? series.startsOn : from);
    const finish = parseCivilDate(series.endsBefore && series.endsBefore <= to ? previousCivilDate(series.endsBefore) : to);

    if (createMonthDate(start.year, start.month) > createMonthDate(finish.year, finish.month) && !(start.year === finish.year && start.month === finish.month)) {
        return [];
    }

    const occurrences: RecurringOccurrence[] = [];
    let year = start.year;
    let month = start.month;

    while (year < finish.year || (year === finish.year && month <= finish.month)) {
        const monthKey = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
        const version = versionAt(seriesVersions, monthKey);

        if (version) {
            const occurrenceDate = occurrenceDateInMonth(year, month, version.monthlyDay);
            const inRange = occurrenceDate >= series.startsOn && occurrenceDate >= from && occurrenceDate <= to && (series.endsBefore === null || occurrenceDate < series.endsBefore);

            if (inRange) {
                const settings = settingsAt(history, occurrenceDate, fallbackSettings);
                const [entry] = createBillingEntries({
                    purchaseDate: occurrenceDate,
                    paymentMethod: version.paymentMethod,
                    amountCents: version.amountCents,
                    installmentCount: 1,
                    closingDay: settings.closingDay,
                    dueDay: settings.dueDay,
                });

                occurrences.push({
                    seriesId: series.id,
                    occurrenceDate,
                    monthlyDay: version.monthlyDay,
                    name: version.name,
                    description: version.description,
                    amountCents: version.amountCents,
                    paymentMethod: version.paymentMethod,
                    categoryId: version.categoryId,
                    generalTagIds: version.generalTagIds,
                    specificTagId: version.specificTagId,
                    isForecast: occurrenceDate > today,
                    entry,
                });
            }
        }

        const next = addMonths(year, month, 1);
        year = next.year;
        month = next.month;
    }

    return occurrences;
}

export function previousCivilDate(value: CivilDate): CivilDate {
    const { year, month, day } = parseCivilDate(value);
    const utc = Date.UTC(year, month - 1, day - 1);
    const date = new Date(utc);
    return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}` as CivilDate;
}

export function nextCivilDate(value: CivilDate): CivilDate {
    const { year, month, day } = parseCivilDate(value);
    const utc = Date.UTC(year, month - 1, day + 1);
    const date = new Date(utc);
    return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}` as CivilDate;
}

function createMonthDate(year: number, month: number) {
    return year * 12 + month;
}

