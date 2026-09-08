"use server";

import { revalidatePath } from "next/cache";
import { settingsSchema, type SettingsInput } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import { buildBillingEntries } from "@/lib/data/entries";
import { currentCompetenceStart } from "@/lib/data/month";
import type { PaymentMethod } from "@/lib/domain/catalog";
import { fromZodError, genericSaveError, type ActionResult } from "./result";

type CreditTransaction = {
    id: string;
    purchase_date: string;
    payment_method: PaymentMethod;
    amount_cents: number;
    installment_count: number;
};

type ExistingEntry = {
    id: string;
    transaction_id: string;
    installment_number: number;
    competence_date: string;
};

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
    const parsed = settingsSchema.safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const { supabase, user } = await requireUser();
    const { data: current, error: currentError } = await supabase.from("user_settings").select("closing_day, due_day").eq("user_id", user.id).maybeSingle();

    if (currentError) {
        return { ok: false, error: genericSaveError };
    }

    const cycleChanged = !current || current.closing_day !== parsed.data.closingDay || current.due_day !== parsed.data.dueDay;

    if (!cycleChanged) {
        revalidatePath("/", "layout");
        return { ok: true };
    }

    const { data: transactions, error: transactionsError } = await supabase.from("transactions").select("id, purchase_date, payment_method, amount_cents, installment_count").eq("payment_method", "credit");

    if (transactionsError) {
        return { ok: false, error: genericSaveError };
    }

    const creditTransactions = (transactions ?? []) as CreditTransaction[];
    const { data: entries, error: entriesError } =
        creditTransactions.length > 0
            ? await supabase
                  .from("transaction_entries")
                  .select("id, transaction_id, installment_number, competence_date")
                  .in(
                      "transaction_id",
                      creditTransactions.map((transaction) => transaction.id),
                  )
            : { data: [], error: null };

    if (entriesError) {
        return { ok: false, error: genericSaveError };
    }

    const settings = { closingDay: parsed.data.closingDay, dueDay: parsed.data.dueDay };
    const currentMonthStart = currentCompetenceStart();
    const replacements: Array<{ id: string; competence_date: string; invoice_due_date: string }> = [];
    const existingByTransaction = new Map<string, ExistingEntry[]>();

    for (const entry of (entries ?? []) as ExistingEntry[]) {
        const list = existingByTransaction.get(entry.transaction_id) ?? [];
        list.push(entry);
        existingByTransaction.set(entry.transaction_id, list);
    }

    for (const transaction of creditTransactions) {
        const generated = buildBillingEntries(
            {
                purchaseDate: transaction.purchase_date,
                paymentMethod: transaction.payment_method,
                amountCents: transaction.amount_cents,
                installmentCount: transaction.installment_count,
            },
            settings,
        );
        const generatedByInstallment = new Map(generated.map((entry) => [entry.installmentNumber, entry]));
        const existing = existingByTransaction.get(transaction.id) ?? [];

        for (const entry of existing) {
            if (entry.competence_date >= currentMonthStart) {
                const replacement = generatedByInstallment.get(entry.installment_number);

                if (!replacement?.invoiceDueDate) {
                    return { ok: false, error: genericSaveError };
                }

                replacements.push({
                    id: entry.id,
                    competence_date: replacement.competenceDate,
                    invoice_due_date: replacement.invoiceDueDate,
                });
            }
        }
    }

    const { error: persistError } = await supabase.rpc("persist_transaction", {
        p_transaction_id: undefined as unknown as string,
        p_transaction: {
            kind: "settings",
            closing_day: parsed.data.closingDay,
            due_day: parsed.data.dueDay,
        },
        p_entries: replacements,
    });

    if (persistError) {
        return { ok: false, error: genericSaveError };
    }

    revalidatePath("/", "layout");
    return { ok: true };
}
