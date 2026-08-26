import type { Category, GeneralTag, PaymentMethod, SpecificTag } from "@/lib/domain/catalog";
import { exportParametersSchema } from "@/lib/domain/schemas";
import { occurrenceKey } from "@/lib/domain/recurrence";
import { amountBrl, csvResponse, serializeTags, toCsv } from "@/lib/data/csv";
import { getRealizedRecurrences } from "@/lib/data/recurrences";
import { getUserClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const headers = ["entry_id", "transaction_id", "name", "installment_number", "installment_count", "amount_cents", "amount_brl", "competence_date", "invoice_due_date", "purchase_date", "payment_method", "category", "specific_tag", "general_tags"];

type EntryRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    competence_date: string;
    invoice_due_date: string | null;
    transactions: {
        name: string;
        purchase_date: string;
        payment_method: PaymentMethod;
        category: Category;
        specific_tag: SpecificTag | null;
        general_tags: GeneralTag[];
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

    let query = supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date, transactions!inner(name, purchase_date, payment_method, category, specific_tag, general_tags)").order("competence_date", { ascending: true }).order("installment_number", { ascending: true });

    if (filters.from) {
        query = query.gte("competence_date", filters.from);
    }

    if (filters.to) {
        query = query.lte("competence_date", filters.to);
    }

    const [{ data, error }, recurring] = await Promise.all([query, getRealizedRecurrences()]);

    if (error) {
        return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    function matchesFilters(category: Category, paymentMethod: PaymentMethod, tags: GeneralTag[]) {
        if (filters.category && category !== filters.category) {
            return false;
        }

        if (filters.paymentMethod && paymentMethod !== filters.paymentMethod) {
            return false;
        }

        return filters.includeReimbursements || !tags.includes("reimbursement");
    }

    const standalones = ((data ?? []) as EntryRow[]).flatMap((row) => {
        const transaction = row.transactions;

        if (!transaction || !matchesFilters(transaction.category, transaction.payment_method, transaction.general_tags)) {
            return [];
        }

        return [[row.id, row.transaction_id, transaction.name, row.installment_number, row.installment_count, row.amount_cents, amountBrl(row.amount_cents), row.competence_date, row.invoice_due_date, transaction.purchase_date, transaction.payment_method, transaction.category, transaction.specific_tag, serializeTags(transaction.general_tags)] as Array<string | number | null>];
    });

    const recurrences = recurring.flatMap((occurrence) => {
        if (filters.from && occurrence.entry.competenceDate < filters.from) {
            return [];
        }

        if (filters.to && occurrence.entry.competenceDate > filters.to) {
            return [];
        }

        if (!matchesFilters(occurrence.category, occurrence.paymentMethod, occurrence.generalTags)) {
            return [];
        }

        const key = occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate);
        return [[key, occurrence.seriesId, occurrence.name, 1, 1, occurrence.entry.amountCents, amountBrl(occurrence.entry.amountCents), occurrence.entry.competenceDate, occurrence.entry.invoiceDueDate, occurrence.occurrenceDate, occurrence.paymentMethod, occurrence.category, occurrence.specificTag, serializeTags(occurrence.generalTags)] as Array<string | number | null>];
    });

    const rows = [...standalones, ...recurrences].sort((a, b) => String(a[7]).localeCompare(String(b[7])) || Number(a[3]) - Number(b[3]));

    return csvResponse("bonsai-lancamentos.csv", toCsv(headers, rows));
}
