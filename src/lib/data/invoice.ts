import type { Category, GeneralTag, SpecificTag } from "@/lib/domain/catalog";
import { toSaoPauloCivilDate } from "@/lib/domain/billing-cycle";
import { occurrenceKey } from "@/lib/domain/recurrence";
import { transactionFiltersSchema } from "@/lib/domain/schemas";
import { requireUser } from "@/lib/supabase/server";
import { currentMonth, dueDateForMonth, monthEnd, monthStart, shiftCalendarMonth } from "./month";
import { getSettings } from "./settings";
import { hasReimbursement } from "./entries";
import { loadRecurrenceState, projectLoadedRecurrences } from "./recurrences";
import type { InvoiceData } from "./types";

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
        category: Category;
        specific_tag: SpecificTag | null;
        general_tags: GeneralTag[];
        purchase_date: string;
        payment_method: string;
    } | null;
};

export async function getInvoice(params: { month?: string; includeReimbursements?: boolean } = {}): Promise<InvoiceData> {
    const parsed = transactionFiltersSchema.pick({ month: true, includeReimbursements: true }).parse({
        ...(params.month ? { month: params.month } : {}),
        ...(params.includeReimbursements !== undefined ? { includeReimbursements: params.includeReimbursements } : {}),
    });
    const month = parsed.month ?? currentMonth();
    const competence = monthStart(month);
    const today = toSaoPauloCivilDate(new Date());
    const { supabase } = await requireUser();

    const [settings, entriesResult, recurrence] = await Promise.all([getSettings(), supabase.from("transaction_entries").select("id, transaction_id, installment_number, installment_count, amount_cents, competence_date, invoice_due_date, transactions!inner(name, category, specific_tag, general_tags, purchase_date, payment_method)").eq("competence_date", competence).not("invoice_due_date", "is", null).order("invoice_due_date", { ascending: true }), loadRecurrenceState()]);

    if (entriesResult.error) {
        throw new Error("Não foi possível carregar a fatura");
    }

    const projected = projectLoadedRecurrences(recurrence, monthStart(shiftCalendarMonth(month, -2)), monthEnd(month), today, settings)
        .filter((occurrence) => occurrence.paymentMethod === "credit" && occurrence.entry.competenceDate === competence && occurrence.entry.invoiceDueDate)
        .map((occurrence) => ({
            id: occurrenceKey(occurrence.seriesId, occurrence.occurrenceDate),
            transactionId: occurrence.seriesId,
            name: occurrence.name,
            category: occurrence.category,
            specificTag: occurrence.specificTag,
            generalTags: occurrence.generalTags,
            installmentNumber: 1,
            installmentCount: 1,
            amountCents: occurrence.entry.amountCents,
            competenceDate: occurrence.entry.competenceDate,
            invoiceDueDate: occurrence.entry.invoiceDueDate!,
            purchaseDate: occurrence.occurrenceDate,
            isRecurring: true,
            isForecast: occurrence.isForecast,
        }));

    const entries = [
        ...(entriesResult.data as InvoiceRow[])
            .filter((row) => row.transactions && (parsed.includeReimbursements || !hasReimbursement(row.transactions.general_tags)))
            .map((row) => ({
                id: row.id,
                transactionId: row.transaction_id,
                name: row.transactions!.name,
                category: row.transactions!.category,
                specificTag: row.transactions!.specific_tag,
                generalTags: row.transactions!.general_tags,
                installmentNumber: row.installment_number,
                installmentCount: row.installment_count,
                amountCents: row.amount_cents,
                competenceDate: row.competence_date,
                invoiceDueDate: row.invoice_due_date!,
                purchaseDate: row.transactions!.purchase_date,
                isRecurring: false,
                isForecast: false,
            })),
        ...projected.filter((entry) => parsed.includeReimbursements || !hasReimbursement(entry.generalTags)),
    ].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    return {
        month,
        invoiceDueDate: entries[0]?.invoiceDueDate ?? dueDateForMonth(month, settings.dueDay),
        totalCents: entries.reduce((sum, entry) => sum + entry.amountCents, 0),
        entries,
        settings,
    };
}
