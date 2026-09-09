import type { z } from "zod";
import { getOpenInvoiceMonth, toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import { occurrenceKey } from "@/lib/domain/recurrence";
import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import { dueDateForMonth, monthEnd, monthStart, shiftCalendarMonth } from "./month";
import { getSettings } from "./settings";
import { getUserCategoriesMap } from "./categories";
import { getUserGeneralTagsMap, getUserSpecificTagsMap } from "./tags";
import { getUserLocationsMap } from "./locations";
import { hasReimbursement } from "./entries";
import { earliestSeriesStart, loadRecurrenceStateFrom, projectLoadedRecurrences } from "./recurrences";
import { formatTransactionName, type DashboardHistoryPoint, type InvoiceData, type InvoiceListItem, type TagInfo } from "./types";
import type { CivilDate } from "@/lib/domain/billing-cycle";

function normalizeSearchText(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

type InvoiceRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    competence_date: string;
    invoice_due_date: string | null;
    transactions: {
        name: string;
        category_id: string;
        specific_tag_id: string | null;
        general_tag_ids: string[];
        location_id: string | null;
        purchase_date: string;
        payment_method: string;
    } | null;
};

type HistoryEntryRow = {
    amount_cents: number;
    competence_date: string;
    transactions: {
        general_tag_ids: string[];
    } | null;
};

export async function getInvoice(filters: z.input<typeof transactionFiltersSchema> = {}): Promise<InvoiceData> {
    const parsed = transactionFiltersSchema.parse(filters);
    const today = toSaoPauloCivilDate(new Date());
    const { supabase, user } = await requireUser();
    const settingsPromise = getSettings();
    const recurrencePromise = loadRecurrenceStateFrom(supabase);
    const categoriesPromise = getUserCategoriesMap(supabase, user.id);
    const generalTagsPromise = getUserGeneralTagsMap(supabase, user.id);
    const specificTagsPromise = getUserSpecificTagsMap(supabase, user.id);
    const locationsPromise = getUserLocationsMap(supabase, user.id);

    const month = parsed.month ?? getOpenInvoiceMonth(today, (await settingsPromise).closingDay, (await settingsPromise).dueDay);
    const prevMonth = shiftCalendarMonth(month, -1);
    const competence = monthStart(month);
    const prevCompetence = monthStart(prevMonth);

    const [settings, entriesResult, historyEntriesResult, recurrence, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([
        settingsPromise,
        supabase
            .from("transaction_entries")
            .select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date, transactions!inner(name, category_id, specific_tag_id, general_tag_ids, location_id, purchase_date, payment_method)")
            .in("competence_date", [prevCompetence, competence])
            .not("invoice_due_date", "is", null)
            .order("invoice_due_date", { ascending: true }),
        supabase
            .from("transaction_entries")
            .select("amount_cents, competence_date, transactions!inner(general_tag_ids)")
            .gte("competence_date", monthStart(shiftCalendarMonth(month, -36)))
            .lte("competence_date", monthStart(shiftCalendarMonth(month, 3)))
            .not("invoice_due_date", "is", null)
            .order("competence_date", { ascending: true }),
        recurrencePromise,
        categoriesPromise,
        generalTagsPromise,
        specificTagsPromise,
        locationsPromise,
    ]);

    if (entriesResult.error || historyEntriesResult.error) {
        throw new Error("Não foi possível carregar a fatura");
    }

    const earliest = earliestSeriesStart(recurrence);
    const fallbackOrigin = monthStart(shiftCalendarMonth(month, -3)) as CivilDate;
    const origin = (earliest && earliest < fallbackOrigin ? earliest : fallbackOrigin) as CivilDate;
    const currentMonthStr = today.slice(0, 7);
    const baseMonth = month > currentMonthStr ? month : currentMonthStr;
    const horizonMonth = shiftCalendarMonth(baseMonth, 3);
    const recurrenceEnd = monthEnd(horizonMonth) as CivilDate;

    const allProjected = projectLoadedRecurrences(recurrence, origin, recurrenceEnd, today, settings).filter((occurrence) => occurrence.paymentMethod === "credit" && occurrence.entry.invoiceDueDate);

    const projected: InvoiceListItem[] = allProjected
        .filter((occurrence) => occurrence.entry.competenceDate === competence || occurrence.entry.competenceDate === prevCompetence)
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
                categoryId: occurrence.categoryId,
                category: cat,
                specificTagId: occurrence.specificTagId,
                specificTag,
                generalTagIds: occurrence.generalTagIds ?? [],
                generalTags,
                installmentNumber: 1,
                installmentCount: 1,
                amountCents: occurrence.entry.amountCents,
                competenceDate: occurrence.entry.competenceDate,
                invoiceDueDate: occurrence.entry.invoiceDueDate!,
                purchaseDate: occurrence.occurrenceDate,
                isRecurring: true,
                isForecast: occurrence.isForecast,
            };
        });

    const allEntries: InvoiceListItem[] = [
        ...(entriesResult.data as InvoiceRow[])
            .filter((row) => {
                if (!row.transactions) return false;
                if (parsed.includeReimbursements) return true;
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
                const loc = tx.location_id ? (locationsMap.get(tx.location_id) ?? null) : null;

                return {
                    id: row.id,
                    transactionId: row.transaction_id,
                    name: formatTransactionName(tx.name, loc),
                    categoryId: tx.category_id,
                    category: cat,
                    specificTagId: tx.specific_tag_id,
                    specificTag,
                    generalTagIds: tx.general_tag_ids ?? [],
                    generalTags,
                    locationId: tx.location_id,
                    location: loc,
                    installmentNumber: row.installment_number,
                    installmentCount: row.installment_count,
                    amountCents: row.amount_cents,
                    competenceDate: row.competence_date,
                    invoiceDueDate: row.invoice_due_date!,
                    purchaseDate: tx.purchase_date,
                    isRecurring: false,
                    isForecast: false,
                };
            }),
        ...projected.filter((entry) => parsed.includeReimbursements || !hasReimbursement(entry.generalTags)),
    ];

    const currentEntries = allEntries.filter((entry) => entry.competenceDate === competence);
    const previousEntries = allEntries.filter((entry) => entry.competenceDate === prevCompetence);

    const totalCents = currentEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
    const previousMonthTotalCents = previousEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
    const invoiceDueDate = currentEntries[0]?.invoiceDueDate ?? dueDateForMonth(month, settings.dueDay);

    let filteredEntries = [...currentEntries];

    if (parsed.category) {
        filteredEntries = filteredEntries.filter((entry) => entry.categoryId === parsed.category);
    }

    if (parsed.paymentMethod) {
        filteredEntries = filteredEntries.filter(() => parsed.paymentMethod === "credit");
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
            const catMatch = normalizeSearchText(entry.category.name).includes(query);
            const specMatch = entry.specificTag ? normalizeSearchText(entry.specificTag.name).includes(query) : false;
            const generalMatch = entry.generalTags.some((tag) => normalizeSearchText(tag.name).includes(query));
            return nameMatch || catMatch || specMatch || generalMatch;
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

    const historyLines = [
        ...((historyEntriesResult.data as HistoryEntryRow[] | null) ?? []).map((row) => ({
            amountCents: row.amount_cents,
            competenceDate: row.competence_date,
            generalTagIds: row.transactions?.general_tag_ids ?? [],
            isForecast: false,
        })),
        ...allProjected.map((occurrence) => ({
            amountCents: occurrence.entry.amountCents,
            competenceDate: occurrence.entry.competenceDate,
            generalTagIds: occurrence.generalTagIds ?? [],
            isForecast: occurrence.isForecast,
        })),
    ].filter((line) => {
        if (parsed.includeReimbursements) return true;
        const tags = line.generalTagIds.map((id) => generalTagsMap.get(id)).filter(Boolean);
        return !hasReimbursement(tags as Array<{ name?: string }>);
    });

    const maxForecastCompetence = monthStart(shiftCalendarMonth(month, 3));
    const historyMap = new Map<string, number>();
    for (const row of historyLines) {
        if (row.isForecast && row.competenceDate > maxForecastCompetence) {
            continue;
        }

        const key = row.competenceDate.slice(0, 7);
        historyMap.set(key, (historyMap.get(key) ?? 0) + row.amountCents);
    }

    const history: DashboardHistoryPoint[] = [...historyMap.entries()].map(([historyMonth, amountCents]) => ({ month: historyMonth, amountCents })).sort((a, b) => a.month.localeCompare(b.month));

    return {
        month,
        invoiceDueDate,
        totalCents,
        previousMonthTotalCents,
        filteredTotalCents,
        entries: filteredEntries,
        settings,
        history,
    };
}
