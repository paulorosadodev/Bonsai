import { createBillingEntries, type BillingEntry, type CivilDate } from "@/lib/domain/billing-cycle";
import type { PaymentMethod } from "@/lib/domain/catalog";
import type { CycleSettings } from "./types";

export const defaultSettings: CycleSettings = {
    closingDay: 14,
    dueDay: 20,
};

type BillingSource = {
    purchaseDate: string;
    paymentMethod: PaymentMethod;
    amountCents: number;
    installmentCount: number;
};

export function buildBillingEntries(source: BillingSource, settings: CycleSettings): BillingEntry[] {
    return createBillingEntries({
        purchaseDate: source.purchaseDate as CivilDate,
        paymentMethod: source.paymentMethod,
        amountCents: source.amountCents,
        installmentCount: source.installmentCount,
        closingDay: settings.closingDay,
        dueDay: settings.dueDay,
    });
}

export function toEntryInserts(transactionId: string, userId: string, entries: BillingEntry[]) {
    return entries.map((entry) => ({
        transaction_id: transactionId,
        user_id: userId,
        installment_number: entry.installmentNumber,
        installment_count: entry.installmentCount,
        amount_cents: entry.amountCents,
        competence_date: entry.competenceDate,
        invoice_due_date: entry.invoiceDueDate,
    }));
}

export function hasReimbursement(tags: Array<string | { name?: string }> | null | undefined, reimbursementTagId?: string): boolean {
    if (!tags || tags.length === 0) return false;
    return tags.some((t) => {
        if (typeof t === "string") {
            return t === "reimbursement" || (reimbursementTagId !== undefined && t === reimbursementTagId);
        }
        return t?.name?.toLowerCase() === "reembolso" || t?.name?.toLowerCase() === "reimbursement";
    });
}
