import { notFound } from "next/navigation";
import { getRecurringOccurrence } from "@/lib/data/recurrences";
import { DeleteTransactionButton } from "@/components/features/delete-transaction-button";
import { TransactionForm } from "@/components/features/transaction-form";
import { currentCivilDate } from "@/components/features/params";
import { BackLink } from "@/components/ui/back-link";

export default async function EditRecurringOccurrencePage({ params }: { params: Promise<{ seriesId: string; occurrenceDate: string }> }) {
    const { seriesId, occurrenceDate } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) {
        notFound();
    }

    const occurrence = await getRecurringOccurrence(seriesId, occurrenceDate);

    if (!occurrence) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <BackLink />
                <DeleteTransactionButton name={occurrence.name} kind="recurrence" id={occurrence.seriesId} occurrenceDate={occurrence.occurrenceDate} />
            </div>
            <h1 className="text-2xl font-bold">Editar recorrência</h1>
            <TransactionForm mode="edit" recurrence={occurrence} today={currentCivilDate()} />
        </div>
    );
}
