"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCivilDate, toSaoPauloCivilDate, type CivilDate } from "@/lib/domain/billing-cycle";
import { isEligibleForRecurrence, nextCivilDate, nextEditableEffectiveFrom } from "@/lib/domain/recurrence";
import { createTransactionSchema, recurrenceTargetSchema, transactionSchema, type TransactionFormInput, type TransactionInput } from "@/lib/domain/schemas";
import { buildBillingEntries } from "@/lib/data/entries";
import { getRecurringOccurrence } from "@/lib/data/recurrences";
import { ensureSettings } from "@/lib/data/settings";
import { requireUser } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { fromZodError, genericDeleteError, genericSaveError, type ActionResult } from "./result";

function descriptionValue(description: string | undefined): string | null {
    if (!description) {
        return null;
    }

    return description;
}

function revalidateFinance() {
    revalidatePath("/", "layout");
}

function financialPayload(transaction: TransactionInput, extra: Record<string, string | number | null | undefined>) {
    return {
        today: toSaoPauloCivilDate(new Date()),
        name: transaction.name,
        description: descriptionValue(transaction.description),
        amount_cents: transaction.amount,
        payment_method: transaction.paymentMethod,
        category_id: transaction.category,
        general_tag_ids: transaction.generalTags,
        specific_tag_id: transaction.specificTag ?? null,
        monthly_day: parseCivilDate(transaction.purchaseDate as CivilDate).day,
        ...extra,
    };
}

async function persistRecurrence(payload: Record<string, unknown>, entries: ReturnType<typeof buildBillingEntries> = []): Promise<ActionResult<{ id: string }>> {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("persist_recurrence", {
        p_payload: payload as Json,
        p_entries: entries.map((entry) => ({
            installment_number: entry.installmentNumber,
            installment_count: entry.installmentCount,
            amount_cents: entry.amountCents,
            competence_date: entry.competenceDate,
            invoice_due_date: entry.invoiceDueDate,
        })),
    });

    if (error || !data) {
        return { ok: false, error: error?.code === "P0002" ? "Recorrência não encontrada" : genericSaveError };
    }

    revalidateFinance();
    return { ok: true, id: data };
}

export async function createRecurringSeries(input: TransactionFormInput): Promise<ActionResult<{ id: string }>> {
    const today = toSaoPauloCivilDate(new Date());
    const parsed = createTransactionSchema(today).safeParse(input);

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    if (!parsed.data.isRecurring || !isEligibleForRecurrence(parsed.data.paymentMethod, parsed.data.installmentCount)) {
        return { ok: false, error: genericSaveError };
    }

    const endsBefore = parsed.data.recurringEndDate ? nextCivilDate(parsed.data.recurringEndDate as CivilDate) : null;

    return persistRecurrence(
        financialPayload(parsed.data, {
            kind: "create",
            starts_on: parsed.data.purchaseDate,
            effective_from: parsed.data.purchaseDate,
            ends_before: endsBefore,
        }),
    );
}

export async function convertTransactionToRecurring(transactionId: string, input: TransactionFormInput): Promise<ActionResult<{ id: string }>> {
    const idParsed = z.string().uuid().safeParse(transactionId);
    const parsed = transactionSchema.safeParse(input);

    if (!idParsed.success) {
        return { ok: false, error: genericSaveError };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    if (!parsed.data.isRecurring || !isEligibleForRecurrence(parsed.data.paymentMethod, parsed.data.installmentCount)) {
        return { ok: false, error: genericSaveError };
    }

    const endsBefore = parsed.data.recurringEndDate ? nextCivilDate(parsed.data.recurringEndDate as CivilDate) : null;

    return persistRecurrence(
        financialPayload(parsed.data, {
            kind: "convert_future",
            transaction_id: idParsed.data,
            starts_on: parsed.data.purchaseDate,
            effective_from: parsed.data.purchaseDate,
            ends_before: endsBefore,
        }),
    );
}

export async function updateRecurringOccurrence(seriesId: string, occurrenceDate: string, input: TransactionFormInput): Promise<ActionResult<{ id: string }>> {
    const target = recurrenceTargetSchema.safeParse({ seriesId, occurrenceDate });
    const parsed = transactionSchema.safeParse(input);

    if (!target.success) {
        return { ok: false, error: genericSaveError };
    }

    if (!parsed.success) {
        return fromZodError(parsed.error);
    }

    const occurrence = await getRecurringOccurrence(target.data.seriesId, target.data.occurrenceDate);

    if (!occurrence) {
        return { ok: false, error: "Recorrência não encontrada" };
    }

    if (!parsed.data.isRecurring || !isEligibleForRecurrence(parsed.data.paymentMethod, parsed.data.installmentCount)) {
        return detachRecurringOccurrence(target.data.seriesId, target.data.occurrenceDate, parsed.data);
    }

    const today = toSaoPauloCivilDate(new Date());
    const newMonthlyDay = parseCivilDate(parsed.data.purchaseDate as CivilDate).day;
    const effectiveFrom = nextEditableEffectiveFrom(today, occurrence.monthlyDay, newMonthlyDay);
    const endsBefore = parsed.data.recurringEndDate ? nextCivilDate(parsed.data.recurringEndDate as CivilDate) : null;

    return persistRecurrence(
        financialPayload(parsed.data, {
            kind: "version",
            series_id: target.data.seriesId,
            effective_from: effectiveFrom,
            monthly_day: newMonthlyDay,
            ends_before: endsBefore,
        }),
    );
}

export async function detachRecurringOccurrence(seriesId: string, occurrenceDate: string, input: TransactionInput): Promise<ActionResult<{ id: string }>> {
    const { supabase, user } = await requireUser();
    const settings = await ensureSettings(supabase, user.id);
    const entries = buildBillingEntries(
        {
            purchaseDate: occurrenceDate,
            paymentMethod: input.paymentMethod,
            amountCents: input.amount,
            installmentCount: input.installmentCount,
        },
        settings,
    );

    return persistRecurrence(
        financialPayload(input, {
            kind: "detach",
            series_id: seriesId,
            ends_before: occurrenceDate,
            purchase_date: occurrenceDate,
            installment_count: input.installmentCount,
        }),
        entries,
    );
}

export async function deleteRecurringOccurrence(seriesId: string, occurrenceDate: string): Promise<ActionResult> {
    const parsed = recurrenceTargetSchema.safeParse({ seriesId, occurrenceDate });

    if (!parsed.success) {
        return { ok: false, error: genericDeleteError };
    }

    const result = await persistRecurrence({
        kind: "end",
        today: toSaoPauloCivilDate(new Date()),
        series_id: parsed.data.seriesId,
        ends_before: parsed.data.occurrenceDate,
    });

    if (!result.ok) {
        return { ok: false, error: result.error === genericSaveError ? genericDeleteError : result.error };
    }

    return { ok: true };
}
