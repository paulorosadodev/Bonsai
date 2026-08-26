import type { Category, GeneralTag, PaymentMethod, SpecificTag } from "@/lib/domain/catalog";
import { exportParametersSchema } from "@/lib/domain/schemas";
import { occurrenceKey } from "@/lib/domain/recurrence";
import { amountBrl, csvResponse, serializeTags, toCsv } from "@/lib/data/csv";
import { getRealizedRecurrences } from "@/lib/data/recurrences";
import { getUserClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const headers = ["id", "name", "description", "amount_cents", "amount_brl", "purchase_date", "payment_method", "installment_count", "category", "specific_tag", "general_tags", "created_at", "updated_at"];

type TransactionRow = {
    id: string;
    name: string;
    description: string | null;
    amount_cents: number;
    purchase_date: string;
    payment_method: PaymentMethod;
    installment_count: number;
    category: Category;
    specific_tag: SpecificTag | null;
    general_tags: GeneralTag[];
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

    let query = supabase.from("transactions").select("id, name, description, amount_cents, purchase_date, payment_method, installment_count, category, specific_tag, general_tags, created_at, updated_at").order("purchase_date", { ascending: true }).order("created_at", { ascending: true });

    if (parsed.data.from) {
        query = query.gte("purchase_date", parsed.data.from);
    }

    if (parsed.data.to) {
        query = query.lte("purchase_date", parsed.data.to);
    }

    if (parsed.data.category) {
        query = query.eq("category", parsed.data.category);
    }

    if (parsed.data.paymentMethod) {
        query = query.eq("payment_method", parsed.data.paymentMethod);
    }

    const [{ data, error }, recurring] = await Promise.all([query, getRealizedRecurrences(parsed.data.from, parsed.data.to)]);

    if (error) {
        return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const standalones = ((data ?? []) as TransactionRow[]).filter((row) => parsed.data.includeReimbursements || !row.general_tags.includes("reimbursement"));
    const recurrences = recurring.filter((occurrence) => {
        if (parsed.data.from && occurrence.occurrenceDate < parsed.data.from) {
            return false;
        }

        if (parsed.data.to && occurrence.occurrenceDate > parsed.data.to) {
            return false;
        }

        if (parsed.data.category && occurrence.category !== parsed.data.category) {
            return false;
        }

        if (parsed.data.paymentMethod && occurrence.paymentMethod !== parsed.data.paymentMethod) {
            return false;
        }

        return parsed.data.includeReimbursements || !occurrence.generalTags.includes("reimbursement");
    });

    const rows = [
        ...standalones.map((row) => [row.id, row.name, row.description, row.amount_cents, amountBrl(row.amount_cents), row.purchase_date, row.payment_method, row.installment_count, row.category, row.specific_tag, serializeTags(row.general_tags), row.created_at, row.updated_at] as Array<string | number | null>),
        ...recurrences.map((occurrence) => [occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate), occurrence.name, occurrence.description, occurrence.amountCents, amountBrl(occurrence.amountCents), occurrence.occurrenceDate, occurrence.paymentMethod, 1, occurrence.category, occurrence.specificTag, serializeTags(occurrence.generalTags), occurrence.occurrenceDate, occurrence.occurrenceDate] as Array<string | number | null>),
    ].sort((a, b) => String(a[5]).localeCompare(String(b[5])) || String(a[1]).localeCompare(String(b[1])));

    return csvResponse("bonsai-transacoes.csv", toCsv(headers, rows));
}
