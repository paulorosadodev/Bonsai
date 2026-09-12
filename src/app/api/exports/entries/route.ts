import type { PaymentMethod } from "@/lib/domain/catalog";
import { exportParametersSchema } from "@/lib/domain/schemas";
import { occurrenceKey } from "@/lib/domain/recurrence";
import { amountBrl, csvResponse, serializeTags, toCsv } from "@/lib/data/csv";
import { getRealizedRecurrences } from "@/lib/data/recurrences";
import { getUserCategoriesMap } from "@/lib/data/categories";
import { getUserGeneralTagsMap, getUserSpecificTagsMap } from "@/lib/data/tags";
import { getUserLocationsMap } from "@/lib/data/locations";
import { formatTransactionName } from "@/lib/data/types";
import { getUserClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const headers = ["entry_id", "transaction_id", "name", "installment_number", "installment_count", "gross_amount_cents", "gross_amount_brl", "reimbursed_amount_cents", "reimbursed_amount_brl", "net_amount_cents", "net_amount_brl", "competence_date", "invoice_due_date", "purchase_date", "payment_method", "category", "specific_tag", "general_tags", "location"];

type EntryRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    reimbursed_amount_cents: number | null;
    competence_date: string;
    invoice_due_date: string | null;
    transactions: {
        name: string;
        purchase_date: string;
        payment_method: PaymentMethod;
        category_id: string;
        specific_tag_id: string | null;
        general_tag_ids: string[];
        location_id: string | null;
    } | null;
};

export async function GET(request: NextRequest) {
    const { supabase, user } = await getUserClient();

    if (!user) {
        return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const url = new URL(request.url);
    const parsed = exportParametersSchema.safeParse({
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
        category: url.searchParams.get("category") || undefined,
        paymentMethod: url.searchParams.get("paymentMethod") || undefined,
        includeReimbursements: url.searchParams.get("includeReimbursements") || undefined,
    });

    if (!parsed.success) {
        return new Response("Bad Request", { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const filters = parsed.data;

    let query = supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, reimbursed_amount_cents, competence_date, invoice_due_date, transactions!inner(name, purchase_date, payment_method, category_id, specific_tag_id, general_tag_ids, location_id)").order("competence_date", { ascending: true }).order("installment_number", { ascending: true });

    if (filters.from) {
        query = query.gte("competence_date", filters.from);
    }

    if (filters.to) {
        query = query.lte("competence_date", filters.to);
    }

    const [{ data, error }, recurring, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([query, getRealizedRecurrences(), getUserCategoriesMap(supabase, user.id), getUserGeneralTagsMap(supabase, user.id), getUserSpecificTagsMap(supabase, user.id), getUserLocationsMap(supabase, user.id)]);

    if (error) {
        return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const isReimbursementTag = (id: string) => {
        const tag = generalTagsMap.get(id);
        return tag?.name.toLowerCase() === "reembolso" || tag?.name.toLowerCase() === "reimbursement";
    };

    function matchesFilters(categoryId: string, paymentMethod: PaymentMethod, tagIds: string[], reimbursedAmountCents?: number | null, entryAmountCents?: number) {
        if (filters.category && categoryId !== filters.category) {
            return false;
        }

        if (filters.paymentMethod && paymentMethod !== filters.paymentMethod) {
            return false;
        }

        if (filters.includeReimbursements) {
            return true;
        }

        const isReimbursed = tagIds.some(isReimbursementTag);
        if (!isReimbursed) {
            return true;
        }

        return reimbursedAmountCents !== undefined && reimbursedAmountCents !== null && entryAmountCents !== undefined && reimbursedAmountCents > 0 && reimbursedAmountCents < entryAmountCents;
    }

    const getCatName = (id: string) => categoriesMap.get(id)?.name ?? id;
    const getSpecName = (id: string | null) => (id ? (specificTagsMap.get(id)?.name ?? id) : null);
    const getGenNames = (ids: string[]) => ids.map((id) => generalTagsMap.get(id)?.name ?? id);
    const getLocName = (id: string | null) => (id ? (locationsMap.get(id)?.name ?? null) : null);

    const standalones = ((data ?? []) as EntryRow[]).flatMap((row) => {
        const transaction = row.transactions;

        if (!transaction || !matchesFilters(transaction.category_id, transaction.payment_method, transaction.general_tag_ids ?? [], row.reimbursed_amount_cents, row.amount_cents)) {
            return [];
        }

        const locName = getLocName(transaction.location_id);
        const hasReimbursement = (transaction.general_tag_ids ?? []).some(isReimbursementTag);
        const grossCents = row.amount_cents;
        const reimbursedCents = hasReimbursement ? (row.reimbursed_amount_cents ?? grossCents) : 0;
        const netCents = Math.max(0, grossCents - reimbursedCents);

        return [
            [
                row.id,
                row.transaction_id,
                formatTransactionName(transaction.name, locName ? { name: locName } : null),
                row.installment_number,
                row.installment_count,
                grossCents,
                amountBrl(grossCents),
                reimbursedCents,
                amountBrl(reimbursedCents),
                netCents,
                amountBrl(netCents),
                row.competence_date,
                row.invoice_due_date,
                transaction.purchase_date,
                transaction.payment_method,
                getCatName(transaction.category_id),
                getSpecName(transaction.specific_tag_id),
                serializeTags(getGenNames(transaction.general_tag_ids ?? [])),
                locName,
            ] as Array<string | number | null>,
        ];
    });

    const recurrences = recurring.flatMap((occurrence) => {
        if (filters.from && occurrence.entry.competenceDate < filters.from) {
            return [];
        }

        if (filters.to && occurrence.entry.competenceDate > filters.to) {
            return [];
        }

        if (!matchesFilters(occurrence.categoryId, occurrence.paymentMethod, occurrence.generalTagIds ?? [])) {
            return [];
        }

        const key = occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate);
        const hasReimbursement = (occurrence.generalTagIds ?? []).some(isReimbursementTag);
        const grossCents = occurrence.entry.amountCents;
        const reimbursedCents = hasReimbursement ? grossCents : 0;
        const netCents = hasReimbursement ? 0 : grossCents;

        return [[key, occurrence.seriesId, occurrence.name, 1, 1, grossCents, amountBrl(grossCents), reimbursedCents, amountBrl(reimbursedCents), netCents, amountBrl(netCents), occurrence.entry.competenceDate, occurrence.entry.invoiceDueDate, occurrence.occurrenceDate, occurrence.paymentMethod, getCatName(occurrence.categoryId), getSpecName(occurrence.specificTagId), serializeTags(getGenNames(occurrence.generalTagIds ?? [])), null] as Array<string | number | null>];
    });

    const rows = [...standalones, ...recurrences].sort((a, b) => String(a[11]).localeCompare(String(b[11])) || Number(a[3]) - Number(b[3]));

    return csvResponse("bonsai-lancamentos.csv", toCsv(headers, rows));
}
