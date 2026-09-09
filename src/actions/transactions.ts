"use server";

import { revalidatePath } from "next/cache";
import { createTransactionSchema, transactionSchema, type TransactionFormInput, type TransactionInput } from "@/lib/domain/schemas";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import { requireUser } from "@/lib/supabase/server";
import { buildBillingEntries } from "@/lib/data/entries";
import { ensureSettings } from "@/lib/data/settings";
import { convertTransactionToRecurring, createRecurringSeries } from "./recurrences";
import { fromZodError, genericDeleteError, genericSaveError, type ActionResult } from "./result";
import { z } from "zod";

const transactionIdSchema = z.string().uuid();

function descriptionValue(description: string | undefined): string | null {
    if (!description) {
        return null;
    }

    return description;
}

function revalidateFinance() {
    revalidatePath("/", "layout");
}

async function persistTransaction(id: string | null, transaction: TransactionInput): Promise<ActionResult<{ id: string }>> {
    const { supabase, user } = await requireUser();
    const settings = await ensureSettings(supabase, user.id);
    const entries = buildBillingEntries(
        {
            purchaseDate: transaction.purchaseDate,
            paymentMethod: transaction.paymentMethod,
            amountCents: transaction.amount,
            installmentCount: transaction.installmentCount,
        },
        settings,
    ).map((entry) => ({
        installment_number: entry.installmentNumber,
        installment_count: entry.installmentCount,
        amount_cents: entry.amountCents,
        competence_date: entry.competenceDate,
        invoice_due_date: entry.invoiceDueDate,
    }));
    const { data, error } = await supabase.rpc("persist_transaction", {
        p_transaction_id: id ?? undefined,
        p_transaction: {
            kind: "transaction",
            name: transaction.name,
            description: descriptionValue(transaction.description),
            amount_cents: transaction.amount,
            purchase_date: transaction.purchaseDate,
            payment_method: transaction.paymentMethod,
            installment_count: transaction.installmentCount,
            category_id: transaction.category,
            general_tag_ids: transaction.generalTags,
            specific_tag_id: transaction.specificTag ?? null,
            location_id: transaction.locationId ?? null,
        },
        p_entries: entries,
    });

    if (error || !data) {
        console.error("persistTransaction error:", error);
        return { ok: false, error: error?.code === "P0002" ? "Transação não encontrada" : genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data };
}

export async function createTransaction(input: TransactionFormInput): Promise<ActionResult<{ id: string }>> {
    const today = toSaoPauloCivilDate(new Date());
    const parsed = createTransactionSchema(today).safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    if (parsed.data.isRecurring) {
        return createRecurringSeries(input);
    }

    return persistTransaction(null, parsed.data);
}

export async function updateTransaction(id: string, input: TransactionFormInput): Promise<ActionResult<{ id: string }>> {
    const idParsed = transactionIdSchema.safeParse(id);
    const parsed = transactionSchema.safeParse(input);

    if (!idParsed.success) {
        return { ok: false, error: genericSaveError };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    if (parsed.data.isRecurring) {
        return convertTransactionToRecurring(idParsed.data, input);
    }

    return persistTransaction(idParsed.data, parsed.data);
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
    const idParsed = transactionIdSchema.safeParse(id);

    if (!idParsed.success) {
        return { ok: false, error: genericDeleteError };
    }

    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("transactions").delete().eq("id", idParsed.data).select("id").maybeSingle();

    if (error) {
        return { ok: false, error: genericDeleteError };
    }

    if (!data) {
        return { ok: false, error: "Transação não encontrada" };
    }

    revalidateFinance();
    return { ok: true };
}
