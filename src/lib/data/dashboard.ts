import type { z } from "zod";
import type { PaymentMethod } from "@/lib/domain/catalog";
import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import { occurrenceEditHref, occurrenceKey } from "@/lib/domain/recurrence";
import { requireUser } from "@/lib/supabase/server";
import { getUserCategoriesMap } from "./categories";
import { getUserGeneralTagsMap, getUserSpecificTagsMap } from "./tags";
import { hasReimbursement } from "./entries";
import { currentMonth, monthEnd, monthStart, shiftCalendarMonth } from "./month";
import { earliestSeriesStart, loadRecurrenceStateFrom, projectLoadedRecurrences } from "./recurrences";
import { getSettings } from "./settings";
import type { DashboardCategoryTotal, DashboardData, DashboardEntryItem, TagInfo } from "./types";

function normalizeSearchText(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

type EntryRow = {
    amount_cents: number;
    competence_date: string;
    transactions: {
        category_id: string;
        general_tag_ids: string[];
    } | null;
};

type DetailedEntryRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    competence_date: string;
    invoice_due_date: string | null;
    transactions: {
        id: string;
        name: string;
        description: string | null;
        category_id: string;
        specific_tag_id: string | null;
        general_tag_ids: string[];
        purchase_date: string;
        payment_method: PaymentMethod;
    } | null;
};

type DashboardLine = {
    amountCents: number;
    competenceDate: string;
    categoryId: string | undefined;
    generalTagIds: string[];
    isForecast: boolean;
};

export async function getDashboard(params: z.input<typeof transactionFiltersSchema> = {}): Promise<DashboardData> {
    const parsed = transactionFiltersSchema.parse(params);
    const month = parsed.month ?? currentMonth();
    const prevMonth = shiftCalendarMonth(month, -1);
    const includeReimbursements = parsed.includeReimbursements;
    const competence = monthStart(month);
    const prevCompetence = monthStart(prevMonth);
    const today = toSaoPauloCivilDate(new Date());
    const { supabase, user } = await requireUser();

    const [settings, entriesResult, detailedEntriesResult, recurrence, categoriesMap, generalTagsMap, specificTagsMap] = await Promise.all([
        getSettings(),
        supabase
            .from("transaction_entries")
            .select("amount_cents, competence_date, transactions!inner(category_id, general_tag_ids)")
            .order("competence_date", { ascending: true }),
        supabase
            .from("transaction_entries")
            .select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date, transactions!inner(id, name, description, category_id, specific_tag_id, general_tag_ids, purchase_date, payment_method)")
            .eq("competence_date", competence)
            .order("competence_date", { ascending: false }),
        loadRecurrenceStateFrom(supabase),
        getUserCategoriesMap(supabase, user.id),
        getUserGeneralTagsMap(supabase, user.id),
        getUserSpecificTagsMap(supabase, user.id),
    ]);

    if (entriesResult.error || detailedEntriesResult.error) {
        throw new Error("Não foi possível carregar o resumo");
    }

    const origin = earliestSeriesStart(recurrence) ?? prevCompetence;
    const projected = projectLoadedRecurrences(recurrence, origin, monthEnd(month), today, settings);

    const lines: DashboardLine[] = [
        ...(entriesResult.data as EntryRow[]).map((row) => ({
            amountCents: row.amount_cents,
            competenceDate: row.competence_date,
            categoryId: row.transactions?.category_id,
            generalTagIds: row.transactions?.general_tag_ids ?? [],
            isForecast: false,
        })),
        ...projected.map((occurrence) => ({
            amountCents: occurrence.entry.amountCents,
            competenceDate: occurrence.entry.competenceDate,
            categoryId: occurrence.categoryId,
            generalTagIds: occurrence.generalTagIds ?? [],
            isForecast: occurrence.isForecast,
        })),
    ].filter((line) => {
        if (includeReimbursements) return true;
        const tags = line.generalTagIds.map((id) => generalTagsMap.get(id)).filter(Boolean);
        return !hasReimbursement(tags as Array<{ name?: string }>);
    });

    const monthRows = lines.filter((line) => line.competenceDate === competence);
    const prevMonthRows = lines.filter((line) => line.competenceDate === prevCompetence);
    const byCategoryMap = new Map<string, number>();
    const historyMap = new Map<string, number>();

    for (const row of monthRows) {
        if (!row.categoryId) {
            continue;
        }

        byCategoryMap.set(row.categoryId, (byCategoryMap.get(row.categoryId) ?? 0) + row.amountCents);
    }

    for (const row of lines) {
        if (row.isForecast && row.competenceDate > competence) {
            continue;
        }

        const key = row.competenceDate.slice(0, 7);
        historyMap.set(key, (historyMap.get(key) ?? 0) + row.amountCents);
    }

    const byCategory: DashboardCategoryTotal[] = [...byCategoryMap.entries()]
        .map(([categoryId, amountCents]) => {
            const cat = categoriesMap.get(categoryId);
            return {
                categoryId,
                name: cat?.name ?? "Outros",
                color: cat?.color ?? "#94A3B8",
                icon: cat?.icon ?? "Tag",
                amountCents,
            };
        })
        .sort((a, b) => b.amountCents - a.amountCents);

    const realEntries: DashboardEntryItem[] = (detailedEntriesResult.data as DetailedEntryRow[])
        .filter((row) => {
            if (!row.transactions) return false;
            if (includeReimbursements) return true;
            const tags = (row.transactions.general_tag_ids ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            return !hasReimbursement(tags as Array<{ name?: string }>);
        })
        .map((row) => {
            const tx = row.transactions!;
            const cat = categoriesMap.get(tx.category_id) ?? {
                id: tx.category_id,
                name: "Categoria",
                color: "#94A3B8",
                icon: "Tag",
            };

            const generalTags: TagInfo[] = (tx.general_tag_ids ?? [])
                .map((tagId) => generalTagsMap.get(tagId))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

            const spec = tx.specific_tag_id ? specificTagsMap.get(tx.specific_tag_id) : null;
            const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;

            return {
                id: row.id,
                transactionId: tx.id,
                name: tx.name,
                description: tx.description,
                amountCents: row.amount_cents,
                purchaseDate: tx.purchase_date,
                competenceDate: row.competence_date,
                paymentMethod: tx.payment_method,
                installmentNumber: row.installment_number,
                installmentCount: row.installment_count,
                categoryId: tx.category_id,
                category: cat,
                specificTagId: tx.specific_tag_id,
                specificTag,
                generalTagIds: tx.general_tag_ids ?? [],
                generalTags,
                isRecurring: false,
                isForecast: false,
                editHref: `/transactions/${tx.id}/edit`,
            };
        });

    const projectedEntries: DashboardEntryItem[] = projected
        .filter((occurrence) => occurrence.entry.competenceDate === competence)
        .filter((occurrence) => {
            if (includeReimbursements) return true;
            const tags = (occurrence.generalTagIds ?? []).map((id) => generalTagsMap.get(id)).filter(Boolean);
            return !hasReimbursement(tags as Array<{ name?: string }>);
        })
        .map((occurrence) => {
            const cat = categoriesMap.get(occurrence.categoryId) ?? {
                id: occurrence.categoryId,
                name: "Categoria",
                color: "#94A3B8",
                icon: "Tag",
            };

            const generalTags: TagInfo[] = (occurrence.generalTagIds ?? [])
                .map((tagId) => generalTagsMap.get(tagId))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
                .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

            const spec = occurrence.specificTagId ? specificTagsMap.get(occurrence.specificTagId) : null;
            const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;

            return {
                id: occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate),
                transactionId: occurrence.seriesId,
                name: occurrence.name,
                description: occurrence.description,
                amountCents: occurrence.entry.amountCents,
                purchaseDate: occurrence.occurrenceDate,
                competenceDate: occurrence.entry.competenceDate,
                paymentMethod: occurrence.paymentMethod,
                installmentNumber: 1,
                installmentCount: 1,
                categoryId: occurrence.categoryId,
                category: cat,
                specificTagId: occurrence.specificTagId,
                specificTag,
                generalTagIds: occurrence.generalTagIds ?? [],
                generalTags,
                isRecurring: true,
                isForecast: occurrence.isForecast,
                editHref: occurrenceEditHref(occurrence.seriesId, occurrence.occurrenceDate),
            };
        });

    const allMonthEntries = [...realEntries, ...projectedEntries];

    let filteredEntries = [...allMonthEntries];

    if (parsed.category) {
        filteredEntries = filteredEntries.filter((entry) => entry.categoryId === parsed.category);
    }

    if (parsed.paymentMethod) {
        filteredEntries = filteredEntries.filter((entry) => entry.paymentMethod === parsed.paymentMethod);
    }

    if (parsed.generalTag) {
        filteredEntries = filteredEntries.filter((entry) => entry.generalTagIds.includes(parsed.generalTag!));
    }

    if (parsed.specificTag) {
        filteredEntries = filteredEntries.filter((entry) => entry.specificTagId === parsed.specificTag);
    }

    if (parsed.search) {
        const query = normalizeSearchText(parsed.search);
        filteredEntries = filteredEntries.filter((entry) => {
            const nameMatch = normalizeSearchText(entry.name).includes(query);
            const descMatch = entry.description ? normalizeSearchText(entry.description).includes(query) : false;
            const catMatch = normalizeSearchText(entry.category.name).includes(query);
            const specMatch = entry.specificTag ? normalizeSearchText(entry.specificTag.name).includes(query) : false;
            const generalMatch = entry.generalTags.some((tag) => normalizeSearchText(tag.name).includes(query));
            return nameMatch || descMatch || catMatch || specMatch || generalMatch;
        });
    }

    const sort = parsed.sort ?? "date_desc";
    filteredEntries.sort((a, b) => {
        switch (sort) {
            case "date_asc":
                return a.purchaseDate.localeCompare(b.purchaseDate) || a.name.localeCompare(b.name);
            case "amount_desc":
                return b.amountCents - a.amountCents || b.purchaseDate.localeCompare(a.purchaseDate);
            case "amount_asc":
                return a.amountCents - b.amountCents || b.purchaseDate.localeCompare(a.purchaseDate);
            case "date_desc":
            default:
                return b.purchaseDate.localeCompare(a.purchaseDate) || a.name.localeCompare(b.name);
        }
    });

    const filteredTotalCents = filteredEntries.reduce((sum, entry) => sum + entry.amountCents, 0);

    return {
        month,
        includeReimbursements,
        totalCents: monthRows.reduce((sum, row) => sum + row.amountCents, 0),
        previousMonthTotalCents: prevMonthRows.reduce((sum, row) => sum + row.amountCents, 0),
        filteredTotalCents,
        entries: filteredEntries,
        byCategory,
        history: [...historyMap.entries()]
            .map(([historyMonth, amountCents]) => ({ month: historyMonth, amountCents }))
            .filter((item) => item.month <= month)
            .sort((a, b) => a.month.localeCompare(b.month)),
        settings,
    };
}
