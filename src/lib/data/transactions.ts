import type { PaymentMethod } from "@/lib/domain/catalog";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import type { z } from "zod";
import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import { getUserCategoriesMap } from "./categories";
import { getUserGeneralTagsMap, getUserSpecificTagsMap } from "./tags";
import { getUserLocationsMap } from "./locations";
import { hasReimbursement } from "./entries";
import { monthEnd, monthStart, nextMonthStart } from "./month";
import { projectRecurrences, recurrenceListItem } from "./recurrences";
import { formatTransactionName, type TagInfo, type TransactionDetail, type TransactionEntryRecord, type TransactionListData, type TransactionListItem, type TransactionRecord } from "./types";

type TransactionRow = {
    id: string;
    name: string;
    description: string | null;
    amount_cents: number;
    reimbursed_amount_cents: number | null;
    purchase_date: string;
    payment_method: PaymentMethod;
    installment_count: number;
    category_id: string;
    general_tag_ids: string[];
    specific_tag_id: string | null;
    location_id: string | null;
    created_at: string;
    updated_at: string;
};

type EntryRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    reimbursed_amount_cents: number | null;
    competence_date: string;
    invoice_due_date: string | null;
};

function mapTransaction(row: TransactionRow, categoriesMap: Map<string, { id: string; name: string; color: string; icon: string }>, generalTagsMap: Map<string, { id: string; name: string; color: string; icon?: string | null }>, specificTagsMap: Map<string, { id: string; name: string; color: string; icon?: string | null }>, locationsMap: Map<string, { id: string; name: string }>): TransactionRecord {
    const cat = categoriesMap.get(row.category_id) ?? {
        id: row.category_id,
        name: "Categoria",
        color: "#94A3B8",
        icon: "Tag",
    };

    const generalTags: TagInfo[] = (row.general_tag_ids ?? [])
        .map((tagId) => generalTagsMap.get(tagId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon ?? null }));

    const spec = row.specific_tag_id ? specificTagsMap.get(row.specific_tag_id) : null;
    const specificTag: TagInfo | null = spec ? { id: spec.id, name: spec.name, color: spec.color, icon: spec.icon ?? null } : null;

    const loc = row.location_id ? (locationsMap.get(row.location_id) ?? null) : null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        amountCents: row.amount_cents,
        reimbursedAmountCents: row.reimbursed_amount_cents,
        purchaseDate: row.purchase_date,
        paymentMethod: row.payment_method,
        installmentCount: row.installment_count,
        categoryId: row.category_id,
        category: cat,
        generalTagIds: row.general_tag_ids ?? [],
        generalTags,
        specificTagId: row.specific_tag_id,
        specificTag,
        locationId: row.location_id,
        location: loc,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapEntry(row: EntryRow): TransactionEntryRecord {
    return {
        id: row.id,
        transactionId: row.transaction_id,
        installmentNumber: row.installment_number,
        installmentCount: row.installment_count,
        amountCents: row.amount_cents,
        reimbursedAmountCents: row.reimbursed_amount_cents,
        competenceDate: row.competence_date,
        invoiceDueDate: row.invoice_due_date,
    };
}

export async function getTransactions(filters: z.input<typeof transactionFiltersSchema> = {}): Promise<TransactionListData> {
    const parsed = transactionFiltersSchema.parse(filters);
    const { supabase, user } = await requireUser();
    const today = toSaoPauloCivilDate(new Date());

    let query = supabase.from("transactions").select("id, name, description, amount_cents, reimbursed_amount_cents, purchase_date, payment_method, installment_count, category_id, general_tag_ids, specific_tag_id, location_id, created_at, updated_at").order("purchase_date", { ascending: false }).order("created_at", { ascending: false });

    if (parsed.month) {
        query = query.gte("purchase_date", monthStart(parsed.month)).lt("purchase_date", nextMonthStart(parsed.month));
    }

    if (parsed.category) {
        query = query.eq("category_id", parsed.category);
    }

    if (parsed.paymentMethod) {
        query = query.eq("payment_method", parsed.paymentMethod);
    }

    if (parsed.generalTag) {
        query = query.contains("general_tag_ids", [parsed.generalTag]);
    }

    if (parsed.specificTag) {
        query = query.eq("specific_tag_id", parsed.specificTag);
    }

    const month = parsed.month;
    const [result, projected, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([query, month ? projectRecurrences(monthStart(month), monthEnd(month), today) : projectRecurrences("1970-01-01", today, today), getUserCategoriesMap(supabase, user.id), getUserGeneralTagsMap(supabase, user.id), getUserSpecificTagsMap(supabase, user.id), getUserLocationsMap(supabase, user.id)]);

    if (result.error) {
        throw new Error("Não foi possível carregar as transações");
    }

    const standalones: TransactionListItem[] = (result.data as TransactionRow[])
        .map((row) => mapTransaction(row, categoriesMap, generalTagsMap, specificTagsMap, locationsMap))
        .filter((transaction) => {
            if (parsed.includeReimbursements) return true;
            if (transaction.reimbursedAmountCents && transaction.reimbursedAmountCents > 0) return true;
            return !hasReimbursement(transaction.generalTags);
        })
        .map((transaction) => {
            const hasPartial = !parsed.includeReimbursements && Boolean(transaction.reimbursedAmountCents && transaction.reimbursedAmountCents > 0);
            const effectiveAmountCents = hasPartial
                ? Math.max(0, transaction.amountCents - transaction.reimbursedAmountCents!)
                : transaction.amountCents;

            return {
                key: transaction.id,
                name: formatTransactionName(transaction.name, transaction.location),
                description: transaction.description,
                amountCents: effectiveAmountCents,
                grossAmountCents: hasPartial ? transaction.amountCents : null,
                reimbursedAmountCents: transaction.reimbursedAmountCents,
                purchaseDate: transaction.purchaseDate,
                paymentMethod: transaction.paymentMethod,
                installmentCount: transaction.installmentCount,
                categoryId: transaction.categoryId,
                category: transaction.category,
                generalTagIds: transaction.generalTagIds,
                generalTags: transaction.generalTags,
                specificTagId: transaction.specificTagId,
                specificTag: transaction.specificTag,
                locationId: transaction.locationId,
                location: transaction.location,
                isRecurring: false,
                isForecast: false,
                editHref: `/transactions/${transaction.id}/edit`,
                deleteKind: "transaction" as const,
                deleteId: transaction.id,
            };
        });

    const recurrences = projected
        .filter((occurrence) => {
            if (parsed.category && occurrence.categoryId !== parsed.category) {
                return false;
            }

            if (parsed.paymentMethod && occurrence.paymentMethod !== parsed.paymentMethod) {
                return false;
            }

            if (parsed.generalTag && !occurrence.generalTagIds.includes(parsed.generalTag)) {
                return false;
            }

            if (parsed.specificTag && occurrence.specificTagId !== parsed.specificTag) {
                return false;
            }

            const generalTagObjects = occurrence.generalTagIds.map((id) => generalTagsMap.get(id)).filter(Boolean);

            return parsed.includeReimbursements || !hasReimbursement(generalTagObjects as Array<{ name?: string }>);
        })
        .map((occurrence) => recurrenceListItem(occurrence, categoriesMap, generalTagsMap, specificTagsMap));

    function normalizeSearchText(text: string) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    let items = [...standalones, ...recurrences];

    if (parsed.search) {
        const query = normalizeSearchText(parsed.search);
        items = items.filter((item) => {
            const nameMatch = normalizeSearchText(item.name).includes(query);
            const descMatch = item.description ? normalizeSearchText(item.description).includes(query) : false;
            const catMatch = normalizeSearchText(item.category.name).includes(query);
            return nameMatch || descMatch || catMatch;
        });
    }

    const sort = parsed.sort ?? "date_desc";
    items.sort((a, b) => {
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

    return {
        items,
    };
}

export async function getTransaction(id: string): Promise<TransactionDetail | null> {
    const { supabase, user } = await requireUser();
    const [{ data: transaction, error: transactionError }, { data: entries, error: entriesError }, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([
        supabase.from("transactions").select("id, name, description, amount_cents, reimbursed_amount_cents, purchase_date, payment_method, installment_count, category_id, general_tag_ids, specific_tag_id, location_id, created_at, updated_at").eq("id", id).maybeSingle(),
        supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, reimbursed_amount_cents, competence_date, invoice_due_date").eq("transaction_id", id).order("installment_number", { ascending: true }),
        getUserCategoriesMap(supabase, user.id),
        getUserGeneralTagsMap(supabase, user.id),
        getUserSpecificTagsMap(supabase, user.id),
        getUserLocationsMap(supabase, user.id),
    ]);

    if (transactionError || entriesError) {
        throw new Error("Não foi possível carregar a transação");
    }

    if (!transaction) {
        return null;
    }

    return {
        ...mapTransaction(transaction as TransactionRow, categoriesMap, generalTagsMap, specificTagsMap, locationsMap),
        entries: (entries as EntryRow[]).map(mapEntry),
    };
}

export { getTransactions as listTransactions };
