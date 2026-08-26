import { TransactionForm } from "@/components/features/transaction-form";
import { currentCivilDate } from "@/components/features/params";
import { BackLink } from "@/components/ui/back-link";

export default function NewTransactionPage() {
    return (
        <div className="flex flex-col gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold">Nova transação</h1>
            <TransactionForm mode="create" today={currentCivilDate()} />
        </div>
    );
}
