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

const headers = ["id", "name", "description", "amount_cents", "amount_brl", "purchase_date", "payment_method", "installment_count", "category", "specific_tag", "general_tags", "location", "created_at", "updated_at"];

type TransactionRow = {
    id: string;
    name: string;
    description: string | null;
    amount_cents: number;
    purchase_date: string;
    payment_method: PaymentMethod;
    installment_count: number;
    category_id: string;
    specific_tag_id: string | null;
    general_tag_ids: string[];
    location_id: string | null;
    created_at: string;
    updated_at: string;
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

    let query = supabase.from("transactions").select("id, name, description, amount_cents, purchase_date, payment_method, installment_count, category_id, specific_tag_id, general_tag_ids, location_id, created_at, updated_at").order("purchase_date", { ascending: true }).order("created_at", { ascending: true });

    if (parsed.data.from) {
        query = query.gte("purchase_date", parsed.data.from);
    }

    if (parsed.data.to) {
        query = query.lte("purchase_date", parsed.data.to);
    }

    if (parsed.data.category) {
        query = query.eq("category_id", parsed.data.category);
    }

    if (parsed.data.paymentMethod) {
        query = query.eq("payment_method", parsed.data.paymentMethod);
    }

    const [{ data, error }, recurring, categoriesMap, generalTagsMap, specificTagsMap, locationsMap] = await Promise.all([query, getRealizedRecurrences(parsed.data.from, parsed.data.to), getUserCategoriesMap(supabase, user.id), getUserGeneralTagsMap(supabase, user.id), getUserSpecificTagsMap(supabase, user.id), getUserLocationsMap(supabase, user.id)]);

    if (error) {
        return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const isReimbursementTag = (id: string) => {
        const tag = generalTagsMap.get(id);
        return tag?.name.toLowerCase() === "reembolso" || tag?.name.toLowerCase() === "reimbursement";
    };

    const standalones = ((data ?? []) as TransactionRow[]).filter((row) => parsed.data.includeReimbursements || !(row.general_tag_ids ?? []).some(isReimbursementTag));

    const recurrences = recurring.filter((occurrence) => {
        if (parsed.data.from && occurrence.occurrenceDate < parsed.data.from) {
            return false;
        }

        if (parsed.data.to && occurrence.occurrenceDate > parsed.data.to) {
            return false;
        }

        if (parsed.data.category && occurrence.categoryId !== parsed.data.category) {
            return false;
        }

        if (parsed.data.paymentMethod && occurrence.paymentMethod !== parsed.data.paymentMethod) {
            return false;
        }

        return parsed.data.includeReimbursements || !(occurrence.generalTagIds ?? []).some(isReimbursementTag);
    });

    const getCatName = (id: string) => categoriesMap.get(id)?.name ?? id;
    const getSpecName = (id: string | null) => (id ? (specificTagsMap.get(id)?.name ?? id) : null);
    const getGenNames = (ids: string[]) => ids.map((id) => generalTagsMap.get(id)?.name ?? id);
    const getLocName = (id: string | null) => (id ? (locationsMap.get(id)?.name ?? null) : null);

    const rows = [
        ...standalones.map((row) => {
            const locName = getLocName(row.location_id);
            return [row.id, formatTransactionName(row.name, locName ? { name: locName } : null), row.description, row.amount_cents, amountBrl(row.amount_cents), row.purchase_date, row.payment_method, row.installment_count, getCatName(row.category_id), getSpecName(row.specific_tag_id), serializeTags(getGenNames(row.general_tag_ids ?? [])), locName, row.created_at, row.updated_at] as Array<string | number | null>;
        }),
        ...recurrences.map((occurrence) => [occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate), occurrence.name, occurrence.description, occurrence.amountCents, amountBrl(occurrence.amountCents), occurrence.occurrenceDate, occurrence.paymentMethod, 1, getCatName(occurrence.categoryId), getSpecName(occurrence.specificTagId), serializeTags(getGenNames(occurrence.generalTagIds ?? [])), null, occurrence.occurrenceDate, occurrence.occurrenceDate] as Array<string | number | null>),
    ].sort((a, b) => String(a[5]).localeCompare(String(b[5])) || String(a[1]).localeCompare(String(b[1])));

    return csvResponse("bonsai-transacoes.csv", toCsv(headers, rows));
}
