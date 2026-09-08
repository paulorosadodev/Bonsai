import type { PaymentMethod } from "@/lib/domain/catalog";
import { toSaoPauloCivilDate, type CivilDate } from "@/lib/domain/billing-cycle";
import { occurrenceEditHref, occurrenceKey, projectSeriesOccurrences, type RecurringOccurrence, type RecurringSeriesRecord, type RecurringVersionRecord, type SettingsHistoryRecord } from "@/lib/domain/recurrence";
import { requireUser } from "@/lib/supabase/server";
import { defaultSettings } from "./entries";
import { getSettings } from "./settings";
import { getUserCategoriesMap } from "./categories";
import { getUserGeneralTagsMap, getUserSpecificTagsMap } from "./tags";
import type { RecurringOccurrenceDetail, TagInfo, TransactionListItem } from "./types";

type SeriesRow = {
    id: string;
    starts_on: string;
    ends_before: string | null;
};

type VersionRow = {
    series_id: string;
    effective_from: string;
    monthly_day: number;
    name: string;
    description: string | null;
    amount_cents: number;
    payment_method: PaymentMethod;
    category_id: string;
    general_tag_ids: string[];
    specific_tag_id: string | null;
};

type HistoryRow = {
    effective_from: string;
    closing_day: number;
    due_day: number;
};

export type RecurrenceState = {
    series: RecurringSeriesRecord[];
    versions: RecurringVersionRecord[];
    settingsHistory: SettingsHistoryRecord[];
};

function mapSeries(row: SeriesRow): RecurringSeriesRecord {
    return {
        id: row.id,
        startsOn: row.starts_on as CivilDate,
        endsBefore: row.ends_before as CivilDate | null,
    };
}

function mapVersion(row: VersionRow): RecurringVersionRecord {
    return {
        seriesId: row.series_id,
        effectiveFrom: row.effective_from as CivilDate,
        monthlyDay: row.monthly_day,
        name: row.name,
        description: row.description,
        amountCents: row.amount_cents,
        paymentMethod: row.payment_method,
        categoryId: row.category_id,
        generalTagIds: row.general_tag_ids ?? [],
        specificTagId: row.specific_tag_id,
    };
}

export async function loadRecurrenceState(): Promise<RecurrenceState> {
    const { supabase } = await requireUser();
    return loadRecurrenceStateFrom(supabase);
}

export async function loadRecurrenceStateFrom(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]): Promise<RecurrenceState> {
    const [seriesResult, versionsResult, historyResult] = await Promise.all([supabase.from("recurring_series").select("id, starts_on, ends_before"), supabase.from("recurring_versions").select("series_id, effective_from, monthly_day, name, description, amount_cents, payment_method, category_id, general_tag_ids, specific_tag_id"), supabase.from("user_settings_history").select("effective_from, closing_day, due_day").order("effective_from", { ascending: true })]);

    if (seriesResult.error || versionsResult.error || historyResult.error) {
        throw new Error("Não foi possível carregar as recorrências");
    }

    return {
        series: ((seriesResult.data ?? []) as SeriesRow[]).map(mapSeries),
        versions: ((versionsResult.data ?? []) as VersionRow[]).map(mapVersion),
        settingsHistory: ((historyResult.data ?? []) as HistoryRow[]).map((row) => ({
            effectiveFrom: row.effective_from,
            closingDay: row.closing_day,
            dueDay: row.due_day,
        })),
    };
}

export async function projectRecurrences(from: CivilDate, to: CivilDate, today = toSaoPauloCivilDate(new Date())): Promise<RecurringOccurrence[]> {
    const [state, settings] = await Promise.all([loadRecurrenceState(), getSettings()]);
    return projectLoadedRecurrences(state, from, to, today, settings);
}

export function projectLoadedRecurrences(state: RecurrenceState, from: CivilDate, to: CivilDate, today: CivilDate, fallback = defaultSettings): RecurringOccurrence[] {
    return state.series.flatMap((series) => projectSeriesOccurrences(series, state.versions, state.settingsHistory, from, to, today, fallback));
}

export async function getRecurringOccurrence(seriesId: string, occurrenceDate: string): Promise<RecurringOccurrenceDetail | null> {
    const today = toSaoPauloCivilDate(new Date());
    const civil = occurrenceDate as CivilDate;
    const { supabase, user } = await requireUser();
    const [state, settings, categoriesMap, generalTagsMap, specificTagsMap] = await Promise.all([loadRecurrenceStateFrom(supabase), getSettings(), getUserCategoriesMap(supabase, user.id), getUserGeneralTagsMap(supabase, user.id), getUserSpecificTagsMap(supabase, user.id)]);
    const series = state.series.find((item) => item.id === seriesId);

    if (!series) {
        return null;
    }

    const [occurrence] = projectSeriesOccurrences(series, state.versions, state.settingsHistory, civil, civil, today, settings);

    if (!occurrence) {
        return null;
    }

    const cat = categoriesMap.get(occurrence.categoryId) ?? {
        id: occurrence.categoryId,
        name: "Categoria",
        color: "#94A3B8",
        icon: "Tag",
    };

    const generalTags: TagInfo[] = occurrence.generalTagIds
        .map((tagId) => generalTagsMap.get(tagId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

    const spec = occurrence.specificTagId ? specificTagsMap.get(occurrence.specificTagId) : null;
    const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null, categoryId: spec.category_id } : null;

    return {
        seriesId: occurrence.seriesId,
        occurrenceDate: occurrence.occurrenceDate,
        startsOn: series.startsOn,
        endsBefore: series.endsBefore,
        monthlyDay: occurrence.monthlyDay,
        effectFrom: occurrence.occurrenceDate,
        name: occurrence.name,
        description: occurrence.description,
        amountCents: occurrence.amountCents,
        paymentMethod: occurrence.paymentMethod,
        categoryId: occurrence.categoryId,
        category: cat,
        generalTagIds: occurrence.generalTagIds,
        generalTags,
        specificTagId: occurrence.specificTagId,
        specificTag,
        isForecast: occurrence.isForecast,
    };
}

export function recurrenceListItem(occurrence: RecurringOccurrence, categoriesMap?: Map<string, { id: string; name: string; color: string; icon: string }>, generalTagsMap?: Map<string, { id: string; name: string; color: string; icon?: string | null }>, specificTagsMap?: Map<string, { id: string; name: string; color: string; icon?: string | null; category_id?: string }>): TransactionListItem {
    const cat = categoriesMap?.get(occurrence.categoryId) ?? {
        id: occurrence.categoryId,
        name: "Categoria",
        color: "#94A3B8",
        icon: "Tag",
    };

    const generalTags: TagInfo[] = (occurrence.generalTagIds ?? [])
        .map((tagId) => generalTagsMap?.get(tagId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

    const spec = occurrence.specificTagId ? specificTagsMap?.get(occurrence.specificTagId) : null;
    const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;

    return {
        key: occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate),
        name: occurrence.name,
        description: occurrence.description,
        amountCents: occurrence.amountCents,
        purchaseDate: occurrence.occurrenceDate,
        paymentMethod: occurrence.paymentMethod,
        installmentCount: 1,
        categoryId: occurrence.categoryId,
        category: cat,
        generalTagIds: occurrence.generalTagIds ?? [],
        generalTags,
        specificTagId: occurrence.specificTagId,
        specificTag,
        isRecurring: true,
        isForecast: occurrence.isForecast,
        editHref: occurrenceEditHref(occurrence.seriesId, occurrence.occurrenceDate),
        deleteKind: "recurrence" as const,
        deleteId: occurrence.seriesId,
        occurrenceDate: occurrence.occurrenceDate,
    };
}

export function earliestSeriesStart(state: RecurrenceState): CivilDate | null {
    let earliest: CivilDate | null = null;

    for (const series of state.series) {
        if (!earliest || series.startsOn < earliest) {
            earliest = series.startsOn;
        }
    }

    return earliest;
}

export async function getRealizedRecurrences(from?: string, to?: string) {
    const today = toSaoPauloCivilDate(new Date());
    const [state, settings] = await Promise.all([loadRecurrenceState(), getSettings()]);
    const start = (from as CivilDate | undefined) ?? earliestSeriesStart(state) ?? today;
    const end = (to && to < today ? to : today) as CivilDate;
    return projectLoadedRecurrences(state, start, end, today, settings).filter((occurrence) => occurrence.occurrenceDate <= today);
}
