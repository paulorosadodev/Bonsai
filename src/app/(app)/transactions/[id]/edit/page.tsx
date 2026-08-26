import { notFound } from "next/navigation";
import { getTransaction } from "@/lib/data/transactions";
import { DeleteTransactionButton } from "@/components/features/delete-transaction-button";
import { TransactionForm } from "@/components/features/transaction-form";
import { currentCivilDate } from "@/components/features/params";
import { BackLink } from "@/components/ui/back-link";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const transaction = await getTransaction(id);

    if (!transaction) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <BackLink />
                <DeleteTransactionButton name={transaction.name} id={transaction.id} />
            </div>
            <h1 className="text-2xl font-bold">Editar transação</h1>
            <TransactionForm mode="edit" transaction={transaction} today={currentCivilDate()} />
        </div>
    );
}
