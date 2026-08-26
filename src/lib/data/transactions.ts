import type { Category, GeneralTag, PaymentMethod, SpecificTag } from "@/lib/domain/catalog";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import type { z } from "zod";
import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import { hasReimbursement } from "./entries";
import { monthEnd, monthStart, nextMonthStart } from "./month";
import { projectRecurrences, recurrenceListItem } from "./recurrences";
import type { TransactionDetail, TransactionEntryRecord, TransactionListData, TransactionListItem, TransactionRecord } from "./types";

type TransactionRow = {
    id: string;
    name: string;
    description: string | null;
    amount_cents: number;
    purchase_date: string;
    payment_method: PaymentMethod;
    installment_count: number;
    category: Category;
    general_tags: GeneralTag[];
    specific_tag: SpecificTag | null;
    created_at: string;
    updated_at: string;
};

type EntryRow = {
    id: string;
    transaction_id: string;
    installment_number: number;
    installment_count: number;
    amount_cents: number;
    competence_date: string;
    invoice_due_date: string | null;
};

function mapTransaction(row: TransactionRow): TransactionRecord {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        amountCents: row.amount_cents,
        purchaseDate: row.purchase_date,
        paymentMethod: row.payment_method,
        installmentCount: row.installment_count,
        category: row.category,
        generalTags: row.general_tags,
        specificTag: row.specific_tag,
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
        competenceDate: row.competence_date,
        invoiceDueDate: row.invoice_due_date,
    };
}

export async function getTransactions(filters: z.input<typeof transactionFiltersSchema> = {}): Promise<TransactionListData> {
    const parsed = transactionFiltersSchema.parse(filters);
    const { supabase } = await requireUser();
    const today = toSaoPauloCivilDate(new Date());
    let query = supabase.from("transactions").select("id, name, description, amount_cents, purchase_date, payment_method, installment_count, category, general_tags, specific_tag, created_at, updated_at").order("purchase_date", { ascending: false }).order("created_at", { ascending: false });

    if (parsed.month) {
        query = query.gte("purchase_date", monthStart(parsed.month)).lt("purchase_date", nextMonthStart(parsed.month));
    }

    if (parsed.category) {
        query = query.eq("category", parsed.category);
    }

    if (parsed.paymentMethod) {
        query = query.eq("payment_method", parsed.paymentMethod);
    }

    if (parsed.generalTag) {
        query = query.contains("general_tags", [parsed.generalTag]);
    }

    const month = parsed.month;
    const [result, projected] = await Promise.all([query, month ? projectRecurrences(monthStart(month), monthEnd(month), today) : projectRecurrences("1970-01-01", today, today)]);

    if (result.error) {
        throw new Error("Não foi possível carregar as transações");
    }

    const standalones: TransactionListItem[] = (result.data as TransactionRow[])
        .map(mapTransaction)
        .filter((transaction) => parsed.includeReimbursements || !hasReimbursement(transaction.generalTags))
        .map((transaction) => ({
            key: transaction.id,
            name: transaction.name,
            description: transaction.description,
            amountCents: transaction.amountCents,
            purchaseDate: transaction.purchaseDate,
            paymentMethod: transaction.paymentMethod,
            installmentCount: transaction.installmentCount,
            category: transaction.category,
            generalTags: transaction.generalTags,
            specificTag: transaction.specificTag,
            isRecurring: false,
            isForecast: false,
            editHref: `/transactions/${transaction.id}/edit`,
            deleteKind: "transaction" as const,
            deleteId: transaction.id,
        }));

    const recurrences = projected
        .filter((occurrence) => {
            if (parsed.category && occurrence.category !== parsed.category) {
                return false;
            }

            if (parsed.paymentMethod && occurrence.paymentMethod !== parsed.paymentMethod) {
                return false;
            }

            if (parsed.generalTag && !occurrence.generalTags.includes(parsed.generalTag)) {
                return false;
            }

            return parsed.includeReimbursements || !hasReimbursement(occurrence.generalTags);
        })
        .map(recurrenceListItem);

    const items = [...standalones, ...recurrences].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || a.name.localeCompare(b.name));

    return {
        items,
    };
}

export async function getTransaction(id: string): Promise<TransactionDetail | null> {
    const { supabase } = await requireUser();
    const [{ data: transaction, error: transactionError }, { data: entries, error: entriesError }] = await Promise.all([
        supabase.from("transactions").select("id, name, description, amount_cents, purchase_date, payment_method, installment_count, category, general_tags, specific_tag, created_at, updated_at").eq("id", id).maybeSingle(),
        supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date").eq("transaction_id", id).order("installment_number", { ascending: true }),
    ]);

    if (transactionError || entriesError) {
        throw new Error("Não foi possível carregar a transação");
    }

    if (!transaction) {
        return null;
    }

    return {
        ...mapTransaction(transaction as TransactionRow),
        entries: (entries as EntryRow[]).map(mapEntry),
    };
}

export { getTransactions as listTransactions };
